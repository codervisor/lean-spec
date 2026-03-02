//! Session-related API request/response types

use crate::sessions::{Session, SessionEvent, SessionLog, SessionMode, SessionStatus};
use serde::{Deserialize, Serialize};

/// Request to create a new session
#[derive(Debug, Deserialize)]
pub struct CreateRunnerSessionRequest {
    pub project_path: String,
    #[serde(default)]
    pub spec_ids: Vec<String>,
    /// Optional custom prompt/instructions
    pub prompt: Option<String>,
    pub runner: Option<String>,
    #[serde(default)]
    pub mode: SessionMode,
}

/// Response for session creation
#[derive(Debug, Serialize)]
pub struct SessionResponse {
    pub id: String,
    pub project_path: String,
    pub spec_ids: Vec<String>,
    pub prompt: Option<String>,
    pub runner: String,
    pub mode: SessionMode,
    pub status: SessionStatus,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub duration_ms: Option<u64>,
    pub token_count: Option<u64>,
    pub protocol: String,
    pub active_tool_call: Option<ActiveToolCallResponse>,
    pub plan_progress: Option<PlanProgressResponse>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ActiveToolCallResponse {
    pub id: Option<String>,
    pub tool: String,
    pub status: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanProgressResponse {
    pub completed: usize,
    pub total: usize,
}

/// Request to archive session logs
#[derive(Debug, Deserialize)]
pub struct ArchiveSessionRequest {
    #[serde(default)]
    pub compress: bool,
}

/// Response for session archive
#[derive(Debug, Serialize)]
pub struct ArchiveSessionResponse {
    pub path: String,
}

/// Request to rotate logs
#[derive(Debug, Deserialize)]
pub struct RotateLogsRequest {
    #[serde(default = "default_rotate_keep")]
    pub keep: usize,
}

fn default_rotate_keep() -> usize {
    10_000
}

/// Response for log rotation
#[derive(Debug, Serialize)]
pub struct RotateLogsResponse {
    pub deleted: usize,
}

#[derive(Debug, Deserialize)]
pub struct PromptSessionRequest {
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct RespondPermissionRequest {
    pub permission_id: String,
    pub option: String,
}

/// List sessions with optional filters
#[derive(Debug, Deserialize)]
pub struct ListSessionsRequest {
    pub project_id: Option<String>,
    pub spec_id: Option<String>,
    pub status: Option<SessionStatus>,
    pub runner: Option<String>,
}

/// DTO for session logs
#[derive(Debug, Serialize)]
pub struct SessionLogDto {
    pub id: i64,
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

impl From<SessionLog> for SessionLogDto {
    fn from(log: SessionLog) -> Self {
        Self {
            id: log.id,
            timestamp: log.timestamp.to_rfc3339(),
            level: format!("{:?}", log.level).to_lowercase(),
            message: log.message,
        }
    }
}

/// DTO for session events
#[derive(Debug, Serialize)]
pub struct SessionEventDto {
    pub id: i64,
    pub timestamp: String,
    pub event_type: String,
    pub data: Option<String>,
}

impl From<SessionEvent> for SessionEventDto {
    fn from(event: SessionEvent) -> Self {
        Self {
            id: event.id,
            timestamp: event.timestamp.to_rfc3339(),
            event_type: format!("{:?}", event.event_type).to_lowercase(),
            data: event.data,
        }
    }
}

impl From<Session> for SessionResponse {
    fn from(session: Session) -> Self {
        let protocol = detect_session_protocol(&session);
        Self {
            id: session.id,
            project_path: session.project_path,
            spec_ids: session.spec_ids,
            prompt: session.prompt,
            runner: session.runner,
            mode: session.mode,
            status: session.status,
            started_at: session.started_at.to_rfc3339(),
            ended_at: session.ended_at.map(|t| t.to_rfc3339()),
            duration_ms: session.duration_ms,
            token_count: session.token_count,
            protocol,
            active_tool_call: None,
            plan_progress: None,
        }
    }
}

fn detect_session_protocol(session: &Session) -> String {
    if let Some(protocol) = session.metadata.get("protocol") {
        return protocol.clone();
    }

    match session.runner.as_str() {
        "copilot" | "codex" => "acp".to_string(),
        _ => "subprocess".to_string(),
    }
}
