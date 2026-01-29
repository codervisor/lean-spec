//! Session API Handlers
//!
//! Provides RESTful endpoints for session management:
//! - Create, start, stop sessions
//! - List and retrieve sessions
//! - Stream session logs via WebSocket

use axum::extract::ws::{WebSocket, WebSocketUpgrade};
use axum::extract::Path;
use axum::extract::State;
use axum::response::IntoResponse;
use axum::Json;
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

use crate::error::{ApiError, ApiResult};
use crate::sessions::{
    ArchiveOptions, Session, SessionEvent, SessionLog, SessionMode, SessionStatus,
};
use crate::state::AppState;
use serde_json::json;

/// Request to create a new session
#[derive(Debug, Deserialize)]
pub struct CreateToolSessionRequest {
    pub project_path: String,
    pub spec_id: Option<String>,
    pub tool: String,
    #[serde(default)]
    pub mode: SessionMode,
}

/// Response for session creation
#[derive(Debug, Serialize)]
pub struct SessionResponse {
    pub id: String,
    pub project_path: String,
    pub spec_id: Option<String>,
    pub tool: String,
    pub mode: SessionMode,
    pub status: SessionStatus,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub duration_ms: Option<u64>,
    pub token_count: Option<u64>,
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

impl From<Session> for SessionResponse {
    fn from(session: Session) -> Self {
        Self {
            id: session.id,
            project_path: session.project_path,
            spec_id: session.spec_id,
            tool: session.tool,
            mode: session.mode,
            status: session.status,
            started_at: session.started_at.to_rfc3339(),
            ended_at: session.ended_at.map(|t| t.to_rfc3339()),
            duration_ms: session.duration_ms,
            token_count: session.token_count,
        }
    }
}

/// Create a new session (does not start it)
pub async fn create_session(
    State(state): State<AppState>,
    Json(req): Json<CreateToolSessionRequest>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    let session = manager
        .create_session(req.project_path, req.spec_id, req.tool, req.mode)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(&e.to_string())),
            )
        })?;

    Ok(Json(SessionResponse::from(session)))
}

/// Get a session by ID
pub async fn get_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    let session = manager
        .get_session(&session_id)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(SessionResponse::from(session)))
}

/// List sessions with optional filters
#[derive(Debug, Deserialize)]
pub struct ListSessionsRequest {
    pub spec_id: Option<String>,
    pub status: Option<SessionStatus>,
    pub tool: Option<String>,
}

pub async fn list_sessions(
    State(state): State<AppState>,
    axum::extract::Query(req): axum::extract::Query<ListSessionsRequest>,
) -> ApiResult<Json<Vec<SessionResponse>>> {
    let manager = state.session_manager.clone();

    let sessions = manager
        .list_sessions(req.spec_id.as_deref(), req.status, req.tool.as_deref())
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

    let responses: Vec<SessionResponse> = sessions.into_iter().map(SessionResponse::from).collect();

    Ok(Json(responses))
}

/// Start a session
pub async fn start_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    manager.start_session(&session_id).await.map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    let session = manager
        .get_session(&session_id)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(SessionResponse::from(session)))
}

/// Stop a running session
pub async fn stop_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    manager.stop_session(&session_id).await.map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    let session = manager
        .get_session(&session_id)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(SessionResponse::from(session)))
}

/// Archive session logs to disk
pub async fn archive_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(req): Json<ArchiveSessionRequest>,
) -> ApiResult<Json<ArchiveSessionResponse>> {
    let manager = state.session_manager.clone();

    let archive_path = manager
        .archive_session(
            &session_id,
            ArchiveOptions {
                output_dir: None,
                compress: req.compress,
            },
        )
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(&e.to_string())),
            )
        })?;

    Ok(Json(ArchiveSessionResponse {
        path: archive_path.to_string_lossy().to_string(),
    }))
}

/// Rotate session logs to keep recent entries
pub async fn rotate_session_logs(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(req): Json<RotateLogsRequest>,
) -> ApiResult<Json<RotateLogsResponse>> {
    let manager = state.session_manager.clone();

    let deleted = manager
        .rotate_logs(&session_id, req.keep)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(&e.to_string())),
            )
        })?;

    Ok(Json(RotateLogsResponse { deleted }))
}

/// Pause a running session
pub async fn pause_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    manager.pause_session(&session_id).await.map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    let session = manager
        .get_session(&session_id)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(SessionResponse::from(session)))
}

/// Resume a paused session
pub async fn resume_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    manager.resume_session(&session_id).await.map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    let session = manager
        .get_session(&session_id)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(SessionResponse::from(session)))
}

/// Get logs for a session
pub async fn get_session_logs(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<Vec<SessionLogDto>>> {
    let manager = state.session_manager.clone();

    let logs = manager
        .get_logs(&session_id, Some(1000))
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

    let log_dto: Vec<SessionLogDto> = logs.into_iter().map(SessionLogDto::from).collect();

    Ok(Json(log_dto))
}

/// Get events for a session
pub async fn get_session_events(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<Vec<SessionEventDto>>> {
    let manager = state.session_manager.clone();

    let events = manager.get_events(&session_id).await.map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let event_dto: Vec<SessionEventDto> = events.into_iter().map(SessionEventDto::from).collect();

    Ok(Json(event_dto))
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

/// Delete a session
pub async fn delete_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<()> {
    let manager = state.session_manager.clone();

    manager.delete_session(&session_id).await.map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    Ok(())
}

/// List available tools
pub async fn list_available_tools(State(state): State<AppState>) -> ApiResult<Json<Vec<String>>> {
    let tools = state.session_manager.list_available_tools().await;

    Ok(Json(tools))
}

/// WebSocket endpoint for real-time log streaming
pub async fn ws_session_logs(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws_session(socket, state, session_id))
}

/// Handle WebSocket connection for session logs
async fn handle_ws_session(mut socket: WebSocket, state: AppState, session_id: String) {
    use axum::extract::ws::Message;
    use tokio::time::{interval, Duration};

    let manager = state.session_manager.clone();

    // Subscribe to logs
    let mut log_rx = match manager.subscribe_to_logs(&session_id).await {
        Ok(rx) => rx,
        Err(_) => {
            let _ = socket
                .send(Message::Text(
                    json!({"error": "Session not found"}).to_string().into(),
                ))
                .await;
            return;
        }
    };

    // Send initial logs
    let initial_logs = manager
        .get_logs(&session_id, Some(100))
        .await
        .unwrap_or_default();

    for log in initial_logs {
        let payload = json!({
            "type": "log",
            "timestamp": log.timestamp.to_rfc3339(),
            "level": format!("{:?}", log.level).to_lowercase(),
            "message": log.message,
        });

        if socket
            .send(Message::Text(payload.to_string().into()))
            .await
            .is_err()
        {
            break;
        }
    }

    // Poll for new logs
    let mut interval = interval(Duration::from_millis(500));

    loop {
        tokio::select! {
            _ = interval.tick() => {
                // Check session status
                if let Ok(Some(session)) = manager.get_session(&session_id).await {
                    if session.is_completed() {
                        // Send completion message
                        let status_msg = json!({
                            "type": "complete",
                            "status": format!("{:?}", session.status).to_lowercase(),
                            "duration_ms": session.duration_ms.unwrap_or(0),
                        });
                        let _ = socket
                            .send(Message::Text(status_msg.to_string().into()))
                            .await;
                        break;
                    }
                }
            }
            result = log_rx.recv() => {
                match result {
                    Ok(log) => {
                        let payload = json!({
                            "type": "log",
                            "timestamp": log.timestamp.to_rfc3339(),
                            "level": format!("{:?}", log.level).to_lowercase(),
                            "message": log.message,
                        });
                        if socket
                            .send(Message::Text(payload.to_string().into()))
                            .await
                            .is_err()
                        {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_response_from_session() {
        let session = Session::new(
            "test-id".to_string(),
            "/test/project".to_string(),
            Some("spec-001".to_string()),
            "claude".to_string(),
            SessionMode::Autonomous,
        );

        let response = SessionResponse::from(session);
        assert_eq!(response.id, "test-id");
        assert_eq!(response.project_path, "/test/project");
        assert_eq!(response.tool, "claude");
    }
}
