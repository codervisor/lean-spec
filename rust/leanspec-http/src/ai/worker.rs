use crate::ai::protocol::WorkerChatPayload;
use crate::ai::protocol::{WorkerRequest, WorkerResponse};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command as StdCommand;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command as TokioCommand};
use tokio::sync::{mpsc, Mutex};

#[derive(Debug, Error)]
pub enum AiWorkerError {
    #[error("AI worker disabled: {0}")]
    Disabled(String),
    #[error("Node.js not found. Please install Node.js v20+ from https://nodejs.org")]
    NodeNotFound,
    #[error("Node.js version {0} is too old. Minimum required: v20.0.0 (recommended v22+)")]
    NodeTooOld(String),
    #[error("Failed to spawn AI worker: {0}")]
    SpawnFailed(String),
    #[error("AI worker script not found")]
    WorkerNotFound,
    #[error("AI worker IO error: {0}")]
    Io(String),
    #[error("AI worker protocol error: {0}")]
    Protocol(String),
}

pub struct AiWorker {
    process: Child,
    stdin: ChildStdin,
    pending_requests: Arc<Mutex<HashMap<String, mpsc::Sender<WorkerResponse>>>>,
}

impl AiWorker {
    pub async fn spawn() -> Result<Self, AiWorkerError> {
        let node_path = resolve_node_path();
        verify_nodejs(&node_path)?;

        let worker_path = find_worker_path()?;

        let mut process = TokioCommand::new(&node_path)
            .arg(&worker_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .env("LEANSPEC_IPC_MODE", "true")
            .spawn()
            .map_err(|e| AiWorkerError::SpawnFailed(e.to_string()))?;

        let stdin = process
            .stdin
            .take()
            .ok_or_else(|| AiWorkerError::SpawnFailed("Failed to capture stdin".to_string()))?;
        let stdout = process
            .stdout
            .take()
            .ok_or_else(|| AiWorkerError::SpawnFailed("Failed to capture stdout".to_string()))?;
        let stderr = process
            .stderr
            .take()
            .ok_or_else(|| AiWorkerError::SpawnFailed("Failed to capture stderr".to_string()))?;

        let pending_requests = Arc::new(Mutex::new(HashMap::new()));

        spawn_stderr_logger(stderr);
        spawn_stdout_handler(stdout, pending_requests.clone());

        let mut worker = Self {
            process,
            stdin,
            pending_requests,
        };

        worker.health_check().await?;

        Ok(worker)
    }

    pub async fn send_chat_request(
        &mut self,
        payload: WorkerChatPayload,
    ) -> Result<mpsc::Receiver<WorkerResponse>, AiWorkerError> {
        let id = uuid::Uuid::new_v4().to_string();
        let request = WorkerRequest::Chat {
            id: id.clone(),
            payload,
        };
        self.send_request(request, id).await
    }

    pub async fn reload_config(&mut self, config: serde_json::Value) -> Result<(), AiWorkerError> {
        let id = uuid::Uuid::new_v4().to_string();
        let request = WorkerRequest::ReloadConfig {
            id,
            payload: config,
        };
        self.write_request(&request).await?;
        Ok(())
    }

    pub async fn health_check(&mut self) -> Result<(), AiWorkerError> {
        let id = uuid::Uuid::new_v4().to_string();
        let request = WorkerRequest::Health { id: id.clone() };
        let mut receiver = self.send_request(request, id).await?;

        let response = tokio::time::timeout(Duration::from_secs(5), receiver.recv())
            .await
            .map_err(|_| AiWorkerError::Protocol("Health check timeout".to_string()))?
            .ok_or_else(|| AiWorkerError::Protocol("Health check failed".to_string()))?;

        match response {
            WorkerResponse::HealthOk { .. } => Ok(()),
            WorkerResponse::Error { error, .. } => Err(AiWorkerError::Protocol(error)),
            other => Err(AiWorkerError::Protocol(format!(
                "Unexpected health response: {:?}",
                other
            ))),
        }
    }

    pub async fn shutdown(&mut self) -> Result<(), AiWorkerError> {
        self.process
            .kill()
            .await
            .map_err(|e| AiWorkerError::Io(e.to_string()))?;
        Ok(())
    }

    async fn send_request(
        &mut self,
        request: WorkerRequest,
        id: String,
    ) -> Result<mpsc::Receiver<WorkerResponse>, AiWorkerError> {
        let (tx, rx) = mpsc::channel(100);
        self.pending_requests.lock().await.insert(id, tx);
        self.write_request(&request).await?;
        Ok(rx)
    }

    async fn write_request(&mut self, request: &WorkerRequest) -> Result<(), AiWorkerError> {
        let json =
            serde_json::to_string(request).map_err(|e| AiWorkerError::Protocol(e.to_string()))?;
        self.stdin
            .write_all(json.as_bytes())
            .await
            .map_err(|e| AiWorkerError::Io(e.to_string()))?;
        self.stdin
            .write_all(b"\n")
            .await
            .map_err(|e| AiWorkerError::Io(e.to_string()))?;
        self.stdin
            .flush()
            .await
            .map_err(|e| AiWorkerError::Io(e.to_string()))?;
        Ok(())
    }
}

fn resolve_node_path() -> String {
    std::env::var("LEANSPEC_NODE_PATH").unwrap_or_else(|_| "node".to_string())
}

fn verify_nodejs(node_path: &str) -> Result<(), AiWorkerError> {
    if std::env::var("LEANSPEC_SKIP_NODE_VERSION_CHECK").is_ok() {
        return Ok(());
    }

    let output = StdCommand::new(node_path)
        .arg("--version")
        .output()
        .map_err(|_| AiWorkerError::NodeNotFound)?;

    if !output.status.success() {
        return Err(AiWorkerError::NodeNotFound);
    }

    let version = String::from_utf8_lossy(&output.stdout);
    let version = version.trim();
    let major = version
        .strip_prefix('v')
        .and_then(|v| v.split('.').next())
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0);

    if major >= 22 {
        tracing::info!("Node.js {} detected", version);
        return Ok(());
    }

    if major >= 20 {
        tracing::warn!(
            "Node.js {} detected. This version reaches EOL April 2026. Please upgrade to v22+ soon: https://nodejs.org",
            version
        );
        return Ok(());
    }

    Err(AiWorkerError::NodeTooOld(version.to_string()))
}

fn find_worker_path() -> Result<PathBuf, AiWorkerError> {
    if let Ok(path) = std::env::var("LEANSPEC_AI_WORKER") {
        let path = PathBuf::from(path);
        if path.exists() {
            return Ok(path);
        }
    }

    let dev_path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/ai-worker/dist/worker.js");
    if dev_path.exists() {
        return Ok(dev_path);
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            if let Some(node_modules) = find_node_modules_dir(exe_dir) {
                let worker_path = node_modules
                    .join("@leanspec")
                    .join("ai-worker")
                    .join("dist")
                    .join("worker.js");
                if worker_path.exists() {
                    return Ok(worker_path);
                }
            }
        }
    }

    Err(AiWorkerError::WorkerNotFound)
}

fn find_node_modules_dir(start: &Path) -> Option<PathBuf> {
    let mut current = Some(start);
    for _ in 0..6 {
        let dir = current?;
        let candidate = dir.join("node_modules");
        if candidate.exists() {
            return Some(candidate);
        }
        current = dir.parent();
    }
    None
}

fn spawn_stderr_logger(stderr: tokio::process::ChildStderr) {
    tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            tracing::warn!("[ai-worker stderr] {}", line);
        }
    });
}

fn spawn_stdout_handler(
    stdout: tokio::process::ChildStdout,
    pending: Arc<Mutex<HashMap<String, mpsc::Sender<WorkerResponse>>>>,
) {
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();

        while let Ok(Some(line)) = lines.next_line().await {
            match serde_json::from_str::<WorkerResponse>(&line) {
                Ok(response) => {
                    let request_id = response.id().to_string();
                    let mut pending = pending.lock().await;
                    if let Some(sender) = pending.get_mut(&request_id) {
                        let is_terminal = matches!(
                            response,
                            WorkerResponse::Done { .. } | WorkerResponse::Error { .. }
                        );
                        if sender.send(response).await.is_err() {
                            pending.remove(&request_id);
                            continue;
                        }
                        if is_terminal {
                            pending.remove(&request_id);
                        }
                    }
                }
                Err(error) => {
                    tracing::error!(
                        "Failed to parse worker response: {} - Line: {}",
                        error,
                        line
                    );
                }
            }
        }
    });
}
