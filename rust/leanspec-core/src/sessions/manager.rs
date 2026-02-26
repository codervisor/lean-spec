//! Session Manager
//!
//! Provides high-level session lifecycle management including
//! creation, execution, monitoring, and control of AI coding sessions.

#![cfg(feature = "sessions")]

use crate::error::{CoreError, CoreResult};
use crate::sessions::database::SessionDatabase;
use crate::sessions::runner::RunnerRegistry;
use crate::sessions::types::*;
use crate::types::LeanSpecConfig;
use crate::utils::SpecLoader;
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::AsyncWriteExt;
use tokio::process::{Child, ChildStdin};
use tokio::sync::{broadcast, Mutex, Notify, RwLock};
use uuid::Uuid;

use flate2::write::GzEncoder;
use flate2::Compression;
use serde_json::{json, Value};

#[cfg(unix)]
use nix::sys::signal::{kill, Signal};
#[cfg(unix)]
use nix::unistd::Pid;

/// Manages the lifecycle of AI coding sessions
pub struct SessionManager {
    /// Database for session persistence
    db: Arc<SessionDatabase>,
    /// Active running sessions (session_id -> process handle)
    active_sessions: Arc<RwLock<HashMap<String, ActiveSessionHandle>>>,
    /// Log broadcast channels (session_id -> sender)
    log_broadcasts: Arc<RwLock<HashMap<String, broadcast::Sender<SessionLog>>>>,
}

/// Handle for an active session process
struct ActiveSessionHandle {
    /// The child process
    process: Arc<Mutex<Child>>,
    /// Stdout task handle
    #[allow(dead_code)]
    stdout_task: tokio::task::JoinHandle<()>,
    /// Stderr task handle
    #[allow(dead_code)]
    stderr_task: tokio::task::JoinHandle<()>,
    /// ACP runtime resources when protocol is ACP
    acp_runtime: Option<AcpSessionRuntime>,
}

#[derive(Clone)]
struct AcpSessionRuntime {
    stdin: Arc<Mutex<ChildStdin>>,
    acp_session_id: Arc<RwLock<Option<String>>>,
    acp_session_id_notify: Arc<Notify>,
    supports_load_session: Arc<RwLock<bool>>,
    init_response_notify: Arc<Notify>,
    pending_permission_requests: Arc<Mutex<HashMap<String, PendingPermissionRequest>>>,
    request_counter: Arc<Mutex<u64>>,
}

#[derive(Clone)]
struct PendingPermissionRequest {
    request_id: Value,
    options: Vec<String>,
}

#[derive(Debug, Clone, Default)]
pub struct ArchiveOptions {
    pub output_dir: Option<PathBuf>,
    pub compress: bool,
}

/// Build a context prompt for the AI runner by loading spec content and combining
/// it with the user's explicit prompt. Returns `None` if there is neither spec
/// content nor an explicit prompt.
fn build_context_prompt(
    project_path: &str,
    spec_ids: &[String],
    user_prompt: Option<&str>,
) -> Option<String> {
    if spec_ids.is_empty() {
        return user_prompt
            .filter(|p| !p.trim().is_empty())
            .map(str::to_string);
    }

    // Resolve the specs directory from the project's config (fall back to "specs").
    let specs_dir = {
        let config_path = PathBuf::from(project_path)
            .join(".lean-spec")
            .join("config.yaml");
        let specs_subdir = if config_path.exists() {
            LeanSpecConfig::load(&config_path)
                .ok()
                .map(|c| c.specs_dir)
                .unwrap_or_else(|| PathBuf::from("specs"))
        } else {
            PathBuf::from("specs")
        };
        PathBuf::from(project_path).join(specs_subdir)
    };

    let mut spec_contents: Vec<String> = Vec::new();

    if specs_dir.exists() {
        let loader = SpecLoader::new(&specs_dir);
        for spec_id in spec_ids {
            if let Ok(Some(spec)) = loader.load(spec_id) {
                // Read the full file (frontmatter + content) so the runner has
                // complete context about status, priority, and plan.
                let full_content = std::fs::read_to_string(&spec.file_path)
                    .unwrap_or_else(|_| spec.content.clone());
                spec_contents.push(full_content);
            }
        }
    }

    if spec_contents.is_empty() && user_prompt.map(|p| p.trim().is_empty()).unwrap_or(true) {
        return None;
    }

    let mut parts: Vec<String> = Vec::new();

    if !spec_contents.is_empty() {
        let header = "Implement the following specs:";
        parts.push(format!(
            "{}\n\n{}",
            header,
            spec_contents.join("\n\n---\n\n")
        ));
    }

    if let Some(prompt) = user_prompt {
        let trimmed = prompt.trim();
        if !trimmed.is_empty() {
            parts.push(trimmed.to_string());
        }
    }

    if parts.is_empty() {
        None
    } else {
        Some(parts.join("\n\n"))
    }
}

impl SessionManager {
    /// Create a new session manager
    pub fn new(db: SessionDatabase) -> Self {
        Self {
            db: Arc::new(db),
            active_sessions: Arc::new(RwLock::new(HashMap::new())),
            log_broadcasts: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Create a new session (does not start it)
    pub async fn create_session(
        &self,
        project_path: String,
        spec_ids: Vec<String>,
        prompt: Option<String>,
        runner: Option<String>,
        mode: SessionMode,
    ) -> CoreResult<Session> {
        let registry = RunnerRegistry::load(PathBuf::from(&project_path).as_path())?;

        let runner_id = match runner {
            Some(value) if !value.trim().is_empty() => value,
            _ => registry
                .default()
                .map(|value| value.to_string())
                .ok_or_else(|| {
                    CoreError::ConfigError("No default runner configured".to_string())
                })?,
        };

        if registry.get(&runner_id).is_none() {
            let available = registry
                .list_ids()
                .into_iter()
                .collect::<Vec<_>>()
                .join(", ");
            return Err(CoreError::ConfigError(format!(
                "Unknown runner: {}. Available: {}",
                runner_id, available
            )));
        }

        let runner = registry
            .get(&runner_id)
            .ok_or_else(|| CoreError::ConfigError(format!("Unknown runner: {}", runner_id)))?;
        if !runner.is_runnable() {
            return Err(CoreError::ConfigError(format!(
                "Runner '{}' is not runnable",
                runner_id
            )));
        }

        let session_id = Uuid::new_v4().to_string();
        let mut session = Session::new(session_id, project_path, spec_ids, prompt, runner_id, mode);
        session.metadata.insert(
            "protocol".to_string(),
            infer_runner_protocol(&session.runner).to_string(),
        );

        self.db.insert_session(&session)?;

        Ok(session)
    }

    /// Start a session
    pub async fn start_session(&self, session_id: &str) -> CoreResult<()> {
        // Load session
        let mut session = self
            .db
            .get_session(session_id)?
            .ok_or_else(|| CoreError::NotFound(format!("Session not found: {}", session_id)))?;

        // Check if already running
        if session.is_running() {
            return Err(CoreError::ValidationError(
                "Session is already running".to_string(),
            ));
        }

        // Get adapter
        let registry = RunnerRegistry::load(PathBuf::from(&session.project_path).as_path())?;
        let runner = registry.get(&session.runner).ok_or_else(|| {
            CoreError::ConfigError(format!("Runner not available: {}", session.runner))
        })?;
        runner.validate_command()?;

        let is_acp = is_acp_runner(&session.runner);

        // Build config
        let mut env_vars = HashMap::new();
        env_vars.insert(
            "LEANSPEC_PROJECT_PATH".to_string(),
            session.project_path.clone(),
        );

        // Build the context prompt: load spec content for attached specs and combine
        // with any explicit user prompt. This resolved prompt is what gets passed as
        // the CLI argument to the runner (via the {PROMPT} placeholder in its args).
        let resolved_prompt = build_context_prompt(
            &session.project_path,
            &session.spec_ids,
            session.prompt.as_deref(),
        );

        if !is_acp {
            // Set LEANSPEC_SPEC_IDS as comma-separated list
            env_vars.insert("LEANSPEC_SPEC_IDS".to_string(), session.spec_ids.join(","));
            // Set LEANSPEC_SPEC_ID to first spec ID for backward compatibility
            if let Some(first_spec_id) = session.spec_ids.first() {
                env_vars.insert("LEANSPEC_SPEC_ID".to_string(), first_spec_id.clone());
            }

            // Keep LEANSPEC_PROMPT in the environment for runners that prefer env vars.
            if let Some(ref prompt) = resolved_prompt {
                env_vars.insert("LEANSPEC_PROMPT".to_string(), prompt.clone());
            }
        }

        let config = SessionConfig {
            project_path: session.project_path.clone(),
            spec_ids: session.spec_ids.clone(),
            prompt: if is_acp {
                None
            } else {
                resolved_prompt.clone()
            },
            runner: session.runner.clone(),
            mode: session.mode,
            max_iterations: None,
            working_dir: Some(session.project_path.clone()),
            env_vars,
            runner_args: if is_acp {
                vec!["--acp".to_string()]
            } else {
                Vec::new()
            },
        };

        // Build command
        let mut cmd = runner.build_command(&config)?;
        let session_timeout = std::env::var("LEANSPEC_SESSION_TIMEOUT_SECONDS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .filter(|value| *value > 0)
            .map(Duration::from_secs);

        // Set up log broadcast channel
        let log_sender = {
            let mut broadcasts = self.log_broadcasts.write().await;
            if let Some(sender) = broadcasts.get(session_id) {
                sender.clone()
            } else {
                let (sender, _) = broadcast::channel::<SessionLog>(1000);
                broadcasts.insert(session_id.to_string(), sender.clone());
                sender
            }
        };

        if is_acp {
            cmd.stdin(Stdio::piped());
        }

        // Spawn process
        let mut child = cmd
            .spawn()
            .map_err(|e| CoreError::ToolError(format!("Failed to spawn process: {}", e)))?;

        let acp_runtime = if is_acp {
            let stored_acp_session_id = session.metadata.get("acp_session_id").cloned();
            let stdin = child.stdin.take().ok_or_else(|| {
                CoreError::ToolError("Failed to capture stdin for ACP".to_string())
            })?;
            Some(AcpSessionRuntime {
                stdin: Arc::new(Mutex::new(stdin)),
                acp_session_id: Arc::new(RwLock::new(stored_acp_session_id)),
                acp_session_id_notify: Arc::new(Notify::new()),
                supports_load_session: Arc::new(RwLock::new(false)),
                init_response_notify: Arc::new(Notify::new()),
                pending_permission_requests: Arc::new(Mutex::new(HashMap::new())),
                request_counter: Arc::new(Mutex::new(1)),
            })
        } else {
            None
        };

        // Take stdout/stderr handles
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| CoreError::ToolError("Failed to capture stdout".to_string()))?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| CoreError::ToolError("Failed to capture stderr".to_string()))?;

        // Clone for tasks
        let session_id_stdout = session_id.to_string();
        let session_id_stderr = session_id.to_string();
        let db_stdout = self.db.clone();
        let db_stderr = self.db.clone();
        let stdout_sender = log_sender.clone();
        let stderr_sender = log_sender.clone();
        let acp_session_id_ref = acp_runtime
            .as_ref()
            .map(|runtime| runtime.acp_session_id.clone());
        let acp_session_id_notify_ref = acp_runtime
            .as_ref()
            .map(|runtime| runtime.acp_session_id_notify.clone());
        let acp_supports_load_ref = acp_runtime
            .as_ref()
            .map(|runtime| runtime.supports_load_session.clone());
        let acp_init_response_notify_ref = acp_runtime
            .as_ref()
            .map(|runtime| runtime.init_response_notify.clone());
        let acp_runtime_stdout = acp_runtime.clone();
        let is_acp_stdout = is_acp;

        // Start log reader tasks
        let stdout_task = tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                if is_acp_stdout {
                    if let Ok(payload) = serde_json::from_str::<Value>(&line) {
                        if let Some(supports_load) = extract_acp_load_session_capability(&payload) {
                            if let Some(acp_supports_load_ref) = &acp_supports_load_ref {
                                let mut guard = acp_supports_load_ref.write().await;
                                *guard = supports_load;
                            }
                            if let Some(notify) = &acp_init_response_notify_ref {
                                notify.notify_one();
                            }
                        }

                        if let Some((permission_id, pending_request)) =
                            extract_acp_pending_permission_request(&payload)
                        {
                            if let Some(runtime) = &acp_runtime_stdout {
                                let mut pending = runtime.pending_permission_requests.lock().await;
                                pending.insert(permission_id, pending_request);
                            }
                        }

                        if let Some(acp_id) = extract_acp_session_id_from_response(&payload) {
                            if let Some(acp_session_id_ref) = &acp_session_id_ref {
                                let mut guard = acp_session_id_ref.write().await;
                                *guard = Some(acp_id.clone());
                            }
                            if let Some(notify) = &acp_session_id_notify_ref {
                                notify.notify_one();
                            }

                            if let Ok(Some(mut session)) = db_stdout.get_session(&session_id_stdout)
                            {
                                session
                                    .metadata
                                    .insert("acp_session_id".to_string(), acp_id);
                                session.touch();
                                let _ = db_stdout.update_session(&session);
                            }
                        }

                        if let Some(mapped_logs) =
                            map_acp_payload_to_logs(&session_id_stdout, payload)
                        {
                            for log in mapped_logs {
                                let _ = db_stdout.insert_log(&log);
                                let _ = stdout_sender.send(log);
                            }
                            continue;
                        }
                    }
                }

                let log = SessionLog {
                    id: 0,
                    session_id: session_id_stdout.clone(),
                    timestamp: chrono::Utc::now(),
                    level: LogLevel::Stdout,
                    message: line,
                };

                // Save to database
                let _ = db_stdout.insert_log(&log);
                let _ = stdout_sender.send(log);
            }
        });

        let stderr_task = tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                let log = SessionLog {
                    id: 0,
                    session_id: session_id_stderr.clone(),
                    timestamp: chrono::Utc::now(),
                    level: LogLevel::Stderr,
                    message: line,
                };

                // Save to database
                let _ = db_stderr.insert_log(&log);
                let _ = stderr_sender.send(log);
            }
        });

        let process = Arc::new(Mutex::new(child));

        // Store active session
        {
            let mut active = self.active_sessions.write().await;
            active.insert(
                session_id.to_string(),
                ActiveSessionHandle {
                    process: process.clone(),
                    stdout_task,
                    stderr_task,
                    acp_runtime: acp_runtime.clone(),
                },
            );
        }

        if let Some(acp_runtime) = &acp_runtime {
            let _ = send_acp_request(
                acp_runtime,
                "initialize",
                json!({
                    "protocolVersion": 1,
                    "clientInfo": {
                        "name": "lean-spec",
                        "version": env!("CARGO_PKG_VERSION")
                    },
                    "clientCapabilities": {}
                }),
            )
            .await;

            let mut supports_load_session = false;
            if tokio::time::timeout(
                Duration::from_secs(10),
                acp_runtime.init_response_notify.notified(),
            )
            .await
            .is_ok()
            {
                let guard = acp_runtime.supports_load_session.read().await;
                supports_load_session = *guard;
            }

            let current_acp_session_id = {
                let guard = acp_runtime.acp_session_id.read().await;
                guard.clone()
            };

            if supports_load_session {
                if let Ok(Some(mut current)) = self.db.get_session(session_id) {
                    current
                        .metadata
                        .insert("acp_load_session_supported".to_string(), "true".to_string());
                    current.touch();
                    let _ = self.db.update_session(&current);
                }
            }

            if supports_load_session {
                if let Some(existing_session_id) = current_acp_session_id {
                    let _ = send_acp_request(
                        acp_runtime,
                        "session/load",
                        json!({
                            "sessionId": existing_session_id,
                            "cwd": session.project_path,
                        }),
                    )
                    .await;
                } else {
                    let _ = send_acp_request(
                        acp_runtime,
                        "session/new",
                        json!({
                            "cwd": session.project_path,
                            "mcpServers": [
                                {
                                    "name": "leanspec",
                                    "command": "leanspec-mcp",
                                    "args": ["--project", session.project_path],
                                    "env": []
                                }
                            ]
                        }),
                    )
                    .await;
                }
            } else {
                let _ = send_acp_request(
                    acp_runtime,
                    "session/new",
                    json!({
                        "cwd": session.project_path,
                        "mcpServers": [
                            {
                                "name": "leanspec",
                                "command": "leanspec-mcp",
                                "args": ["--project", session.project_path],
                                "env": []
                            }
                        ]
                    }),
                )
                .await;
            }

            if let Some(prompt_message) = resolved_prompt {
                let prompt_content = build_acp_prompt_content(
                    &session.project_path,
                    &session.spec_ids,
                    &prompt_message,
                );
                let current_acp_session_id = {
                    // Check if already available (e.g. restored from previous session)
                    let guard = acp_runtime.acp_session_id.read().await;
                    if guard.is_some() {
                        guard.clone()
                    } else {
                        drop(guard);
                        if tokio::time::timeout(
                            Duration::from_secs(30),
                            acp_runtime.acp_session_id_notify.notified(),
                        )
                        .await
                        .is_ok()
                        {
                            let guard = acp_runtime.acp_session_id.read().await;
                            guard.clone()
                        } else {
                            None
                        }
                    }
                };

                if let Some(current_acp_session_id) = current_acp_session_id {
                    let _ = send_acp_request(
                        acp_runtime,
                        "session/prompt",
                        json!({
                            "sessionId": current_acp_session_id,
                            "prompt": prompt_content
                        }),
                    )
                    .await;
                } else {
                    let _ = self.db.log_message(
                        session_id,
                        LogLevel::Warning,
                        "ACP session ID unavailable; skipped initial session/prompt",
                    );
                }

                let _ = self.db.insert_log(&SessionLog {
                    id: 0,
                    session_id: session_id.to_string(),
                    timestamp: chrono::Utc::now(),
                    level: LogLevel::Info,
                    message: json!({
                        "type": "acp_message",
                        "role": "user",
                        "content": prompt_message,
                        "done": true,
                    })
                    .to_string(),
                });
            }
        }

        // Update session status
        session.status = SessionStatus::Running;
        session.started_at = chrono::Utc::now();
        session.touch();
        self.db.update_session(&session)?;
        self.db.insert_event(session_id, EventType::Started, None)?;
        let started_message = match session_timeout {
            Some(timeout) => format!(
                "Session started (runner: {}, timeout: {}s)",
                session.runner,
                timeout.as_secs()
            ),
            None => format!("Session started (runner: {})", session.runner),
        };
        self.db
            .log_message(session_id, LogLevel::Info, &started_message)?;

        // Spawn background task to wait for completion
        let session_id_owned = session_id.to_string();
        let db_clone = self.db.clone();
        let active_sessions_clone = self.active_sessions.clone();
        let broadcasts_clone = self.log_broadcasts.clone();
        let process_monitor = process.clone();
        let timeout = session_timeout;

        tokio::spawn(async move {
            use tokio::time::{interval, Duration, Instant};
            let mut ticker = interval(Duration::from_millis(500));
            let started_at = Instant::now();
            let mut last_heartbeat_at = Instant::now();

            loop {
                ticker.tick().await;

                if let Some(timeout) = timeout {
                    if started_at.elapsed() >= timeout {
                        let timeout_message = format!(
                            "Session timed out after {}s and was terminated",
                            timeout.as_secs()
                        );

                        {
                            let mut child = process_monitor.lock().await;
                            let _ = child.kill().await;
                        }

                        if let Ok(Some(mut session)) = db_clone.get_session(&session_id_owned) {
                            session.status = SessionStatus::Failed;
                            session.ended_at = Some(chrono::Utc::now());
                            session.update_duration();
                            session.touch();
                            let _ = db_clone.update_session(&session);
                            let _ = db_clone.insert_event(
                                &session_id_owned,
                                EventType::Failed,
                                Some(timeout_message.clone()),
                            );
                        }
                        let _ = db_clone.log_message(
                            &session_id_owned,
                            LogLevel::Error,
                            &timeout_message,
                        );

                        cleanup_session(
                            &session_id_owned,
                            &active_sessions_clone,
                            &broadcasts_clone,
                        )
                        .await;
                        break;
                    }
                }

                if last_heartbeat_at.elapsed() >= Duration::from_secs(30) {
                    let _ = db_clone.log_message(
                        &session_id_owned,
                        LogLevel::Info,
                        &format!(
                            "Session still running (elapsed: {}s)",
                            started_at.elapsed().as_secs()
                        ),
                    );
                    last_heartbeat_at = Instant::now();
                }

                let status = {
                    let mut child = process_monitor.lock().await;
                    match child.try_wait() {
                        Ok(Some(status)) => Some(Ok(status)),
                        Ok(None) => None,
                        Err(err) => Some(Err(err)),
                    }
                };

                let Some(status_result) = status else {
                    continue;
                };

                let status = match status_result {
                    Ok(status) => status,
                    Err(err) => {
                        if let Ok(Some(mut session)) = db_clone.get_session(&session_id_owned) {
                            session.status = SessionStatus::Failed;
                            session.ended_at = Some(chrono::Utc::now());
                            session.update_duration();
                            session.touch();
                            let _ = db_clone.update_session(&session);
                            let _ = db_clone.insert_event(
                                &session_id_owned,
                                EventType::Failed,
                                Some(format!("Process wait error: {}", err)),
                            );
                            let _ = db_clone.log_message(
                                &session_id_owned,
                                LogLevel::Error,
                                &format!("Process wait error: {}", err),
                            );
                        }
                        cleanup_session(
                            &session_id_owned,
                            &active_sessions_clone,
                            &broadcasts_clone,
                        )
                        .await;
                        break;
                    }
                };

                if let Ok(Some(mut session)) = db_clone.get_session(&session_id_owned) {
                    session.exit_code = status.code();
                    session.status = if status.success() {
                        SessionStatus::Completed
                    } else {
                        SessionStatus::Failed
                    };
                    session.ended_at = Some(chrono::Utc::now());
                    session.update_duration();
                    session.touch();
                    let _ = db_clone.update_session(&session);
                    let event_type = if status.success() {
                        EventType::Completed
                    } else {
                        EventType::Failed
                    };
                    let _ = db_clone.insert_event(&session_id_owned, event_type, None);
                    if status.success() {
                        let _ = db_clone.log_message(
                            &session_id_owned,
                            LogLevel::Info,
                            &format!(
                                "Session completed successfully{}",
                                status
                                    .code()
                                    .map(|code| format!(" (exit code: {})", code))
                                    .unwrap_or_default()
                            ),
                        );
                    } else {
                        let _ = db_clone.log_message(
                            &session_id_owned,
                            LogLevel::Error,
                            &format!(
                                "Session failed{}",
                                status
                                    .code()
                                    .map(|code| format!(" (exit code: {})", code))
                                    .unwrap_or_default()
                            ),
                        );
                    }
                }

                cleanup_session(&session_id_owned, &active_sessions_clone, &broadcasts_clone).await;
                break;
            }
        });

        Ok(())
    }

    /// Stop a running session
    pub async fn stop_session(&self, session_id: &str) -> CoreResult<()> {
        // Load session
        let mut session = self
            .db
            .get_session(session_id)?
            .ok_or_else(|| CoreError::NotFound(format!("Session not found: {}", session_id)))?;

        if !session.status.can_stop() {
            return Err(CoreError::ValidationError(format!(
                "Cannot stop session with status: {:?}",
                session.status
            )));
        }

        // Remove from active sessions (this will signal the tasks to stop)
        {
            let mut active = self.active_sessions.write().await;
            if let Some(handle) = active.remove(session_id) {
                if let Some(acp_runtime) = &handle.acp_runtime {
                    let current_acp_session_id = {
                        let guard = acp_runtime.acp_session_id.read().await;
                        guard.clone().unwrap_or_else(|| session_id.to_string())
                    };
                    let _ = send_acp_request(
                        acp_runtime,
                        "session/cancel",
                        json!({
                            "sessionId": current_acp_session_id,
                        }),
                    )
                    .await;
                }

                // Abort the reader tasks
                handle.stdout_task.abort();
                handle.stderr_task.abort();

                // Kill the process
                let mut child = handle.process.lock().await;
                let _ = child.kill().await;
            }
        }

        // Update session status
        session.status = SessionStatus::Cancelled;
        session.ended_at = Some(chrono::Utc::now());
        session.update_duration();
        session.touch();
        self.db.update_session(&session)?;
        self.db
            .insert_event(session_id, EventType::Cancelled, None)?;
        self.db
            .log_message(session_id, LogLevel::Info, "Session stopped by user")?;

        // Clean up broadcast channel
        {
            let mut broadcasts = self.log_broadcasts.write().await;
            broadcasts.remove(session_id);
        }

        Ok(())
    }

    /// Send a prompt to a running ACP session.
    pub async fn prompt_session(&self, session_id: &str, message: String) -> CoreResult<()> {
        if message.trim().is_empty() {
            return Err(CoreError::ValidationError(
                "Prompt message cannot be empty".to_string(),
            ));
        }

        let runtime = {
            let active = self.active_sessions.read().await;
            active
                .get(session_id)
                .and_then(|handle| handle.acp_runtime.clone())
        }
        .ok_or_else(|| {
            CoreError::ValidationError(
                "Session is not active or does not support ACP prompting".to_string(),
            )
        })?;

        let current_acp_session_id = {
            let guard = runtime.acp_session_id.read().await;
            guard.clone().unwrap_or_else(|| session_id.to_string())
        };

        send_acp_request(
            &runtime,
            "session/prompt",
            json!({
                "sessionId": current_acp_session_id,
                "prompt": [
                    {
                        "type": "text",
                        "text": message,
                    }
                ]
            }),
        )
        .await?;

        Ok(())
    }

    /// Cancel the current turn for a running ACP session.
    pub async fn cancel_session_turn(&self, session_id: &str) -> CoreResult<()> {
        let runtime = {
            let active = self.active_sessions.read().await;
            active
                .get(session_id)
                .and_then(|handle| handle.acp_runtime.clone())
        }
        .ok_or_else(|| {
            CoreError::ValidationError(
                "Session is not active or does not support ACP cancellation".to_string(),
            )
        })?;

        let current_acp_session_id = {
            let guard = runtime.acp_session_id.read().await;
            guard.clone().unwrap_or_else(|| session_id.to_string())
        };

        send_acp_request(
            &runtime,
            "session/cancel",
            json!({
                "sessionId": current_acp_session_id,
            }),
        )
        .await?;

        Ok(())
    }

    /// Respond to an ACP permission request for a running session.
    pub async fn respond_to_permission_request(
        &self,
        session_id: &str,
        permission_id: &str,
        option: &str,
    ) -> CoreResult<()> {
        if permission_id.trim().is_empty() {
            return Err(CoreError::ValidationError(
                "Permission request ID cannot be empty".to_string(),
            ));
        }
        if option.trim().is_empty() {
            return Err(CoreError::ValidationError(
                "Permission response option cannot be empty".to_string(),
            ));
        }

        let runtime = {
            let active = self.active_sessions.read().await;
            active
                .get(session_id)
                .and_then(|handle| handle.acp_runtime.clone())
        }
        .ok_or_else(|| {
            CoreError::ValidationError(
                "Session is not active or does not support ACP permissions".to_string(),
            )
        })?;

        let pending_request = {
            let mut pending = runtime.pending_permission_requests.lock().await;
            pending.remove(permission_id)
        }
        .ok_or_else(|| {
            CoreError::ValidationError(format!(
                "Unknown ACP permission request ID: {}",
                permission_id
            ))
        })?;

        if !pending_request.options.is_empty()
            && !pending_request.options.iter().any(|v| v == option)
        {
            return Err(CoreError::ValidationError(format!(
                "Invalid permission response option '{}'. Allowed: {}",
                option,
                pending_request.options.join(", ")
            )));
        }

        send_acp_response(
            &runtime,
            pending_request.request_id,
            json!({
                "option": option,
            }),
        )
        .await?;

        Ok(())
    }

    /// Archive session logs to a file
    pub async fn archive_session(
        &self,
        session_id: &str,
        options: ArchiveOptions,
    ) -> CoreResult<PathBuf> {
        let session = self
            .db
            .get_session(session_id)?
            .ok_or_else(|| CoreError::NotFound(format!("Session not found: {}", session_id)))?;

        let base_dir = options.output_dir.unwrap_or_else(|| {
            PathBuf::from(&session.project_path)
                .join(".leanspec")
                .join("sessions")
        });

        std::fs::create_dir_all(&base_dir).map_err(|e| {
            CoreError::ToolError(format!("Failed to create archive directory: {}", e))
        })?;

        let file_name = if options.compress {
            format!("{}.log.gz", session_id)
        } else {
            format!("{}.log", session_id)
        };
        let archive_path = base_dir.join(file_name);

        let logs = self.db.get_logs(session_id, None)?;

        if options.compress {
            let file = File::create(&archive_path).map_err(|e| {
                CoreError::ToolError(format!("Failed to create archive file: {}", e))
            })?;
            let mut encoder = GzEncoder::new(file, Compression::default());
            for log in logs {
                writeln!(
                    encoder,
                    "[{}] {} {}",
                    log.timestamp.to_rfc3339(),
                    format!("{:?}", log.level).to_lowercase(),
                    log.message
                )
                .map_err(|e| CoreError::ToolError(format!("Failed to write archive: {}", e)))?;
            }
            encoder
                .finish()
                .map_err(|e| CoreError::ToolError(format!("Failed to finalize archive: {}", e)))?;
        } else {
            let mut file = File::create(&archive_path).map_err(|e| {
                CoreError::ToolError(format!("Failed to create archive file: {}", e))
            })?;
            for log in logs {
                writeln!(
                    file,
                    "[{}] {} {}",
                    log.timestamp.to_rfc3339(),
                    format!("{:?}", log.level).to_lowercase(),
                    log.message
                )
                .map_err(|e| CoreError::ToolError(format!("Failed to write archive: {}", e)))?;
            }
        }

        self.db.insert_event(
            session_id,
            EventType::Archived,
            Some(archive_path.to_string_lossy().to_string()),
        )?;

        Ok(archive_path)
    }

    /// Pause a running session
    pub async fn pause_session(&self, session_id: &str) -> CoreResult<()> {
        let mut session = self
            .db
            .get_session(session_id)?
            .ok_or_else(|| CoreError::NotFound(format!("Session not found: {}", session_id)))?;

        if !session.status.can_pause() {
            return Err(CoreError::ValidationError(format!(
                "Cannot pause session with status: {:?}",
                session.status
            )));
        }

        let process = {
            let active = self.active_sessions.read().await;
            active.get(session_id).map(|handle| handle.process.clone())
        }
        .ok_or_else(|| CoreError::ValidationError("Session is not running".to_string()))?;

        let mut child = process.lock().await;
        pause_child(&mut child)?;

        session.status = SessionStatus::Paused;
        session.touch();
        self.db.update_session(&session)?;
        self.db.insert_event(session_id, EventType::Paused, None)?;
        self.db
            .log_message(session_id, LogLevel::Info, "Session paused")?;

        Ok(())
    }

    /// Resume a paused session
    pub async fn resume_session(&self, session_id: &str) -> CoreResult<()> {
        let mut session = self
            .db
            .get_session(session_id)?
            .ok_or_else(|| CoreError::NotFound(format!("Session not found: {}", session_id)))?;

        if !session.status.can_resume() {
            return Err(CoreError::ValidationError(format!(
                "Cannot resume session with status: {:?}",
                session.status
            )));
        }

        let process = {
            let active = self.active_sessions.read().await;
            active.get(session_id).map(|handle| handle.process.clone())
        }
        .ok_or_else(|| CoreError::ValidationError("Session is not running".to_string()))?;

        let mut child = process.lock().await;
        resume_child(&mut child)?;

        session.status = SessionStatus::Running;
        session.touch();
        self.db.update_session(&session)?;
        self.db.insert_event(session_id, EventType::Resumed, None)?;
        self.db
            .log_message(session_id, LogLevel::Info, "Session resumed")?;

        Ok(())
    }

    /// Get session details
    pub async fn get_session(&self, session_id: &str) -> CoreResult<Option<Session>> {
        self.db.get_session(session_id)
    }

    /// List sessions with optional filters
    pub async fn list_sessions(
        &self,
        spec_id: Option<&str>,
        status: Option<SessionStatus>,
        runner: Option<&str>,
    ) -> CoreResult<Vec<Session>> {
        self.db.list_sessions(spec_id, status, runner)
    }

    /// Get session logs
    pub async fn get_logs(
        &self,
        session_id: &str,
        limit: Option<usize>,
    ) -> CoreResult<Vec<SessionLog>> {
        self.db.get_logs(session_id, limit)
    }

    /// Rotate logs to keep only the most recent entries
    pub async fn rotate_logs(&self, session_id: &str, keep: usize) -> CoreResult<usize> {
        if self.db.get_session(session_id)?.is_none() {
            return Err(CoreError::NotFound(format!(
                "Session not found: {}",
                session_id
            )));
        }

        let deleted = self.db.prune_logs(session_id, keep)?;
        if deleted > 0 {
            self.db.insert_event(
                session_id,
                EventType::Archived,
                Some(format!("pruned_logs:{}", deleted)),
            )?;
        }

        Ok(deleted)
    }

    /// Get session events
    pub async fn get_events(&self, session_id: &str) -> CoreResult<Vec<SessionEvent>> {
        self.db.get_events(session_id)
    }

    /// Delete a session
    pub async fn delete_session(&self, session_id: &str) -> CoreResult<()> {
        // Stop if running
        if let Some(session) = self.db.get_session(session_id)? {
            if session.is_running() {
                self.stop_session(session_id).await?;
            }
        }

        self.db.delete_session(session_id)
    }

    /// Get logs in real-time (returns receiver)
    pub async fn subscribe_to_logs(
        &self,
        session_id: &str,
    ) -> CoreResult<broadcast::Receiver<SessionLog>> {
        // Check session exists
        if self.db.get_session(session_id)?.is_none() {
            return Err(CoreError::NotFound(format!(
                "Session not found: {}",
                session_id
            )));
        }

        let mut broadcasts = self.log_broadcasts.write().await;
        let sender = broadcasts
            .entry(session_id.to_string())
            .or_insert_with(|| {
                let (sender, _) = broadcast::channel::<SessionLog>(1000);
                sender
            })
            .clone();

        Ok(sender.subscribe())
    }

    /// List available runners
    pub async fn list_available_runners(
        &self,
        project_path: Option<&str>,
    ) -> CoreResult<Vec<String>> {
        let registry = match project_path {
            Some(path) => RunnerRegistry::load(PathBuf::from(path).as_path())?,
            None => RunnerRegistry::load(PathBuf::from(".").as_path())?,
        };

        Ok(registry
            .list_available()
            .into_iter()
            .map(|runner| runner.id.clone())
            .collect())
    }

    /// Clean up stale sessions (sessions that were running when server restarted)
    pub async fn cleanup_stale_sessions(&self) -> CoreResult<usize> {
        // Find sessions marked as running but not in active_sessions
        let all_sessions = self.db.list_sessions(None, None, None)?;
        let active_ids = {
            let active = self.active_sessions.read().await;
            active
                .keys()
                .cloned()
                .collect::<std::collections::HashSet<_>>()
        };

        let mut cleaned = 0;
        for mut session in all_sessions {
            if session.status == SessionStatus::Running && !active_ids.contains(&session.id) {
                // This session was running but its process is gone
                session.status = SessionStatus::Failed;
                session.ended_at = Some(chrono::Utc::now());
                session.update_duration();
                session.touch();
                self.db.update_session(&session)?;
                self.db.insert_event(
                    &session.id,
                    EventType::Failed,
                    Some("Process disappeared".to_string()),
                )?;
                cleaned += 1;
            }
        }

        Ok(cleaned)
    }
}

fn infer_runner_protocol(runner_id: &str) -> &'static str {
    if is_acp_runner(runner_id) {
        "acp"
    } else {
        "subprocess"
    }
}

fn is_acp_runner(runner_id: &str) -> bool {
    matches!(runner_id, "copilot" | "codex")
}

fn build_acp_prompt_content(
    project_path: &str,
    spec_ids: &[String],
    user_message: &str,
) -> Vec<Value> {
    let mut content = vec![json!({
        "type": "text",
        "text": user_message,
    })];

    let config_path = PathBuf::from(project_path)
        .join(".lean-spec")
        .join("config.yaml");
    let specs_subdir = if config_path.exists() {
        LeanSpecConfig::load(&config_path)
            .ok()
            .map(|value| value.specs_dir)
            .unwrap_or_else(|| PathBuf::from("specs"))
    } else {
        PathBuf::from("specs")
    };

    let specs_dir = PathBuf::from(project_path).join(specs_subdir);
    if !specs_dir.exists() {
        return content;
    }

    let loader = SpecLoader::new(&specs_dir);
    for spec_id in spec_ids {
        if let Ok(Some(spec)) = loader.load(spec_id) {
            let absolute_path =
                std::fs::canonicalize(&spec.file_path).unwrap_or_else(|_| spec.file_path.clone());
            let uri = format!("file://{}", absolute_path.to_string_lossy());

            content.push(json!({
                "type": "resource_link",
                "uri": uri,
                "name": spec_id,
                "mimeType": "text/markdown"
            }));
        }
    }

    content
}

fn extract_acp_session_id_from_response(payload: &Value) -> Option<String> {
    payload
        .get("result")
        .and_then(|value| value.get("sessionId"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
}

fn extract_acp_load_session_capability(payload: &Value) -> Option<bool> {
    payload
        .get("result")
        .and_then(|value| value.get("agentCapabilities"))
        .and_then(|value| value.get("loadSession"))
        .and_then(|value| value.as_bool())
}

fn extract_acp_pending_permission_request(
    payload: &Value,
) -> Option<(String, PendingPermissionRequest)> {
    let method = payload.get("method").and_then(|value| value.as_str())?;
    if method != "session/request_permission" {
        return None;
    }

    let request_id = payload.get("id")?.clone();
    let permission_id = payload
        .get("params")
        .and_then(|params| params.get("id"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
        .or_else(|| match &request_id {
            Value::String(value) => Some(value.clone()),
            Value::Number(value) => Some(value.to_string()),
            _ => None,
        })?;

    let options = payload
        .get("params")
        .and_then(|params| params.get("options"))
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|value| value.as_str().map(|value| value.to_string()))
        .collect::<Vec<_>>();

    Some((
        permission_id,
        PendingPermissionRequest {
            request_id,
            options,
        },
    ))
}

fn map_acp_payload_to_logs(session_id: &str, payload: Value) -> Option<Vec<SessionLog>> {
    let method = payload.get("method").and_then(|value| value.as_str())?;
    let timestamp = chrono::Utc::now();
    let mut logs = Vec::new();

    if method == "session/request_permission" {
        if let Some(params) = payload.get("params") {
            let log_message = json!({
                "type": "acp_permission_request",
                "timestamp": timestamp.to_rfc3339(),
                "id": params.get("id").cloned().unwrap_or_else(|| json!("")),
                "tool": params.get("tool").and_then(|value| value.as_str()).unwrap_or(""),
                "args": params.get("args").cloned().unwrap_or_else(|| json!({})),
                "options": params
                    .get("options")
                    .and_then(|value| value.as_array())
                    .cloned()
                    .unwrap_or_default(),
            })
            .to_string();

            logs.push(SessionLog {
                id: 0,
                session_id: session_id.to_string(),
                timestamp,
                level: LogLevel::Info,
                message: log_message,
            });
        }
        return Some(logs);
    }

    if method != "session/update" {
        return None;
    }

    let update = payload
        .get("params")
        .and_then(|params| params.get("update"))
        .or_else(|| payload.get("params"))?;

    let update_type = update
        .get("type")
        .and_then(|value| value.as_str())
        .unwrap_or_default();

    let mapped = match update_type {
        "agent_message_chunk" => Some(json!({
            "type": "acp_message",
            "timestamp": timestamp.to_rfc3339(),
            "role": "agent",
            "content": update.get("content").and_then(|v| v.as_str()).or_else(|| update.get("text").and_then(|v| v.as_str())).unwrap_or(""),
            "done": update.get("done").and_then(|v| v.as_bool()).unwrap_or(false),
        })),
        "user_message_chunk" => Some(json!({
            "type": "acp_message",
            "timestamp": timestamp.to_rfc3339(),
            "role": "user",
            "content": update.get("content").and_then(|v| v.as_str()).or_else(|| update.get("text").and_then(|v| v.as_str())).unwrap_or(""),
            "done": update.get("done").and_then(|v| v.as_bool()).unwrap_or(false),
        })),
        "agent_thought_chunk" => Some(json!({
            "type": "acp_thought",
            "timestamp": timestamp.to_rfc3339(),
            "content": update.get("content").and_then(|v| v.as_str()).or_else(|| update.get("text").and_then(|v| v.as_str())).unwrap_or(""),
            "done": update.get("done").and_then(|v| v.as_bool()).unwrap_or(false),
        })),
        "tool_call" | "tool_call_update" => Some(json!({
            "type": "acp_tool_call",
            "timestamp": timestamp.to_rfc3339(),
            "id": update.get("id").and_then(|v| v.as_str()).unwrap_or_default(),
            "tool": update.get("tool").and_then(|v| v.as_str()).unwrap_or_default(),
            "args": update.get("args").cloned().unwrap_or_else(|| json!({})),
            "status": update.get("status").and_then(|v| v.as_str()).unwrap_or("running"),
            "result": update.get("result").cloned().unwrap_or(Value::Null),
        })),
        "plan" => {
            let entries = update
                .get("entries")
                .and_then(|value| value.as_array())
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .enumerate()
                .map(|(index, entry)| {
                    let status = entry
                        .get("status")
                        .and_then(|value| value.as_str())
                        .map(|value| match value {
                            "completed" => "done",
                            "in_progress" => "running",
                            "done" | "running" | "pending" => value,
                            _ => "pending",
                        })
                        .unwrap_or("pending");

                    json!({
                        "id": entry
                            .get("id")
                            .and_then(|value| value.as_str())
                            .map(|value| value.to_string())
                            .unwrap_or_else(|| index.to_string()),
                        "title": entry
                            .get("title")
                            .and_then(|value| value.as_str())
                            .unwrap_or_default(),
                        "status": status,
                    })
                })
                .collect::<Vec<_>>();

            Some(json!({
                "type": "acp_plan",
                "timestamp": timestamp.to_rfc3339(),
                "entries": entries,
                "done": update.get("done").and_then(|v| v.as_bool()),
            }))
        }
        "current_mode_update" => Some(json!({
            "type": "acp_mode_update",
            "timestamp": timestamp.to_rfc3339(),
            "mode": update.get("mode").and_then(|v| v.as_str()).unwrap_or_default(),
        })),
        _ => None,
    };

    if let Some(message) = mapped {
        logs.push(SessionLog {
            id: 0,
            session_id: session_id.to_string(),
            timestamp,
            level: LogLevel::Info,
            message: message.to_string(),
        });
        return Some(logs);
    }

    None
}

async fn send_acp_request(
    runtime: &AcpSessionRuntime,
    method: &str,
    params: Value,
) -> CoreResult<u64> {
    let request_id = {
        let mut counter = runtime.request_counter.lock().await;
        let current = *counter;
        *counter += 1;
        current
    };

    let payload = json!({
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": params,
    });

    let serialized = serde_json::to_string(&payload)
        .map_err(|err| CoreError::ToolError(format!("Failed to serialize ACP request: {}", err)))?;

    let mut stdin = runtime.stdin.lock().await;
    stdin
        .write_all(serialized.as_bytes())
        .await
        .map_err(|err| CoreError::ToolError(format!("Failed to write ACP request: {}", err)))?;
    stdin
        .write_all(b"\n")
        .await
        .map_err(|err| CoreError::ToolError(format!("Failed to write ACP newline: {}", err)))?;
    stdin
        .flush()
        .await
        .map_err(|err| CoreError::ToolError(format!("Failed to flush ACP request: {}", err)))?;

    Ok(request_id)
}

async fn send_acp_response(
    runtime: &AcpSessionRuntime,
    request_id: Value,
    result: Value,
) -> CoreResult<()> {
    let payload = json!({
        "jsonrpc": "2.0",
        "id": request_id,
        "result": result,
    });

    let serialized = serde_json::to_string(&payload).map_err(|err| {
        CoreError::ToolError(format!("Failed to serialize ACP response: {}", err))
    })?;

    let mut stdin = runtime.stdin.lock().await;
    stdin
        .write_all(serialized.as_bytes())
        .await
        .map_err(|err| CoreError::ToolError(format!("Failed to write ACP response: {}", err)))?;
    stdin
        .write_all(b"\n")
        .await
        .map_err(|err| CoreError::ToolError(format!("Failed to write ACP newline: {}", err)))?;
    stdin
        .flush()
        .await
        .map_err(|err| CoreError::ToolError(format!("Failed to flush ACP response: {}", err)))?;

    Ok(())
}

#[cfg(unix)]
fn pause_child(child: &mut Child) -> CoreResult<()> {
    let pid = child
        .id()
        .ok_or_else(|| CoreError::ToolError("Process ID unavailable".to_string()))?;
    kill(Pid::from_raw(pid as i32), Signal::SIGSTOP)
        .map_err(|e| CoreError::ToolError(format!("Failed to pause process: {}", e)))?;
    Ok(())
}

#[cfg(not(unix))]
fn pause_child(_child: &mut Child) -> CoreResult<()> {
    Err(CoreError::ValidationError(
        "Pause/resume is not supported on this platform".to_string(),
    ))
}

#[cfg(unix)]
fn resume_child(child: &mut Child) -> CoreResult<()> {
    let pid = child
        .id()
        .ok_or_else(|| CoreError::ToolError("Process ID unavailable".to_string()))?;
    kill(Pid::from_raw(pid as i32), Signal::SIGCONT)
        .map_err(|e| CoreError::ToolError(format!("Failed to resume process: {}", e)))?;
    Ok(())
}

#[cfg(not(unix))]
fn resume_child(_child: &mut Child) -> CoreResult<()> {
    Err(CoreError::ValidationError(
        "Pause/resume is not supported on this platform".to_string(),
    ))
}

async fn cleanup_session(
    session_id: &str,
    active_sessions: &Arc<RwLock<HashMap<String, ActiveSessionHandle>>>,
    log_broadcasts: &Arc<RwLock<HashMap<String, broadcast::Sender<SessionLog>>>>,
) {
    {
        let mut active = active_sessions.write().await;
        active.remove(session_id);
    }

    {
        let mut broadcasts = log_broadcasts.write().await;
        broadcasts.remove(session_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_session() {
        let db = SessionDatabase::new_in_memory().unwrap();
        let manager = SessionManager::new(db);

        let session = manager
            .create_session(
                "/test/project".to_string(),
                vec!["spec-001".to_string()],
                None,
                Some("claude".to_string()),
                SessionMode::Autonomous,
            )
            .await
            .unwrap();

        assert_eq!(session.project_path, "/test/project");
        assert_eq!(session.spec_ids, vec!["spec-001".to_string()]);
        assert_eq!(session.runner, "claude");
        assert!(matches!(session.status, SessionStatus::Pending));
    }

    #[tokio::test]
    async fn test_list_sessions() {
        let db = SessionDatabase::new_in_memory().unwrap();
        let manager = SessionManager::new(db);

        // Create sessions
        manager
            .create_session(
                "/test/project1".to_string(),
                vec!["spec-001".to_string()],
                None,
                Some("claude".to_string()),
                SessionMode::Autonomous,
            )
            .await
            .unwrap();

        manager
            .create_session(
                "/test/project2".to_string(),
                vec!["spec-002".to_string()],
                None,
                Some("copilot".to_string()),
                SessionMode::Guided,
            )
            .await
            .unwrap();

        // List all
        let sessions = manager.list_sessions(None, None, None).await.unwrap();
        assert_eq!(sessions.len(), 2);

        // Filter by runner
        let claude_sessions = manager
            .list_sessions(None, None, Some("claude"))
            .await
            .unwrap();
        assert_eq!(claude_sessions.len(), 1);
        assert_eq!(claude_sessions[0].runner, "claude");
    }

    #[tokio::test]
    async fn test_session_lifecycle() {
        let db = SessionDatabase::new_in_memory().unwrap();
        let manager = SessionManager::new(db);

        // Create session
        let session = manager
            .create_session(
                "/test/project".to_string(),
                vec!["spec-001".to_string()],
                None,
                Some("claude".to_string()),
                SessionMode::Autonomous,
            )
            .await
            .unwrap();

        // Session should be pending
        let retrieved = manager.get_session(&session.id).await.unwrap().unwrap();
        assert!(matches!(retrieved.status, SessionStatus::Pending));

        // Delete session
        manager.delete_session(&session.id).await.unwrap();

        // Should be gone
        assert!(manager.get_session(&session.id).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_create_session_no_specs() {
        let db = SessionDatabase::new_in_memory().unwrap();
        let manager = SessionManager::new(db);

        let session = manager
            .create_session(
                "/test/project".to_string(),
                vec![],
                Some("fix all lint errors".to_string()),
                Some("claude".to_string()),
                SessionMode::Autonomous,
            )
            .await
            .unwrap();

        assert!(session.spec_ids.is_empty());
        assert_eq!(session.prompt, Some("fix all lint errors".to_string()));
    }

    #[tokio::test]
    async fn test_create_session_multiple_specs() {
        let db = SessionDatabase::new_in_memory().unwrap();
        let manager = SessionManager::new(db);

        let session = manager
            .create_session(
                "/test/project".to_string(),
                vec!["028-cli".to_string(), "320-redesign".to_string()],
                None,
                Some("claude".to_string()),
                SessionMode::Autonomous,
            )
            .await
            .unwrap();

        assert_eq!(session.spec_ids.len(), 2);
        assert_eq!(session.spec_id(), Some("028-cli"));
    }
}
