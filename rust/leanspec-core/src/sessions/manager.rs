//! Session Manager
//!
//! Provides high-level session lifecycle management including
//! creation, execution, monitoring, and control of AI coding sessions.

#![cfg(feature = "sessions")]

use crate::error::{CoreError, CoreResult};
use crate::sessions::adapter::ToolManager;
use crate::sessions::database::SessionDatabase;
use crate::sessions::types::*;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::process::Child;
use tokio::sync::{broadcast, Mutex, RwLock};
use uuid::Uuid;

/// Manages the lifecycle of AI coding sessions
pub struct SessionManager {
    /// Database for session persistence
    db: Arc<SessionDatabase>,
    /// Tool manager for spawning processes
    tool_manager: ToolManager,
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
}

impl SessionManager {
    /// Create a new session manager
    pub fn new(db: SessionDatabase) -> Self {
        Self {
            db: Arc::new(db),
            tool_manager: ToolManager::new(),
            active_sessions: Arc::new(RwLock::new(HashMap::new())),
            log_broadcasts: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Create a new session (does not start it)
    pub async fn create_session(
        &self,
        project_path: String,
        spec_id: Option<String>,
        tool: String,
        mode: SessionMode,
    ) -> CoreResult<Session> {
        // Validate tool exists
        if self.tool_manager.get(&tool).is_none() {
            return Err(CoreError::ConfigError(format!(
                "Unknown tool: {}. Available: claude, copilot, codex, opencode",
                tool
            )));
        }

        let session_id = Uuid::new_v4().to_string();
        let session = Session::new(session_id, project_path, spec_id, tool, mode);

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
        let adapter = self.tool_manager.get(&session.tool).ok_or_else(|| {
            CoreError::ConfigError(format!("Tool not available: {}", session.tool))
        })?;

        // Validate environment
        adapter.validate_environment().await?;

        // Build config
        let config = SessionConfig {
            project_path: session.project_path.clone(),
            spec_id: session.spec_id.clone(),
            tool: session.tool.clone(),
            mode: session.mode,
            max_iterations: None,
            working_dir: Some(session.project_path.clone()),
            env_vars: HashMap::new(),
            tool_args: Vec::new(),
        };

        // Build command
        let mut cmd = adapter.build_command(&config)?;

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

        // Spawn process
        let mut child = cmd
            .spawn()
            .map_err(|e| CoreError::ToolError(format!("Failed to spawn process: {}", e)))?;

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

        // Start log reader tasks
        let stdout_task = tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
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
                },
            );
        }

        // Update session status
        session.status = SessionStatus::Running;
        session.started_at = chrono::Utc::now();
        session.touch();
        self.db.update_session(&session)?;
        self.db.insert_event(session_id, EventType::Started, None)?;

        // Spawn background task to wait for completion
        let session_id_owned = session_id.to_string();
        let db_clone = self.db.clone();
        let active_sessions_clone = self.active_sessions.clone();
        let broadcasts_clone = self.log_broadcasts.clone();
        let process_monitor = process.clone();

        tokio::spawn(async move {
            use tokio::time::{interval, Duration};
            let mut ticker = interval(Duration::from_millis(500));

            loop {
                ticker.tick().await;

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

        // Clean up broadcast channel
        {
            let mut broadcasts = self.log_broadcasts.write().await;
            broadcasts.remove(session_id);
        }

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
        tool: Option<&str>,
    ) -> CoreResult<Vec<Session>> {
        self.db.list_sessions(spec_id, status, tool)
    }

    /// Get session logs
    pub async fn get_logs(
        &self,
        session_id: &str,
        limit: Option<usize>,
    ) -> CoreResult<Vec<SessionLog>> {
        self.db.get_logs(session_id, limit)
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

    /// List available tools
    pub async fn list_available_tools(&self) -> Vec<String> {
        self.tool_manager
            .list_available()
            .await
            .into_iter()
            .map(|t| t.name().to_string())
            .collect()
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
                Some("spec-001".to_string()),
                "claude".to_string(),
                SessionMode::Autonomous,
            )
            .await
            .unwrap();

        assert_eq!(session.project_path, "/test/project");
        assert_eq!(session.spec_id, Some("spec-001".to_string()));
        assert_eq!(session.tool, "claude");
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
                Some("spec-001".to_string()),
                "claude".to_string(),
                SessionMode::Autonomous,
            )
            .await
            .unwrap();

        manager
            .create_session(
                "/test/project2".to_string(),
                Some("spec-002".to_string()),
                "copilot".to_string(),
                SessionMode::Guided,
            )
            .await
            .unwrap();

        // List all
        let sessions = manager.list_sessions(None, None, None).await.unwrap();
        assert_eq!(sessions.len(), 2);

        // Filter by tool
        let claude_sessions = manager
            .list_sessions(None, None, Some("claude"))
            .await
            .unwrap();
        assert_eq!(claude_sessions.len(), 1);
        assert_eq!(claude_sessions[0].tool, "claude");
    }

    #[tokio::test]
    async fn test_session_lifecycle() {
        let db = SessionDatabase::new_in_memory().unwrap();
        let manager = SessionManager::new(db);

        // Create session
        let session = manager
            .create_session(
                "/test/project".to_string(),
                Some("spec-001".to_string()),
                "claude".to_string(),
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
}
