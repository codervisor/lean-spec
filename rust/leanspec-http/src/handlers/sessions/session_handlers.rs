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
use serde_json::Value;
use tokio::sync::broadcast;

use crate::error::{internal_error, ApiError, ApiResult};
use crate::sessions::{ArchiveOptions, Session, SessionLog, SessionStatus};
use crate::state::AppState;
use crate::types::{
    ActiveToolCallResponse, ArchiveSessionRequest, ArchiveSessionResponse,
    CreateRunnerSessionRequest, ListSessionsRequest, PlanProgressResponse, PromptSessionRequest,
    RespondPermissionRequest, RotateLogsRequest, RotateLogsResponse, SessionEventDto,
    SessionLogDto, SessionResponse,
};
use serde_json::json;

fn extract_log_payload(log: &SessionLog) -> Option<Value> {
    serde_json::from_str::<Value>(&log.message)
        .ok()
        .and_then(|value| if value.is_object() { Some(value) } else { None })
}

fn value_to_string(value: &Value) -> Option<String> {
    match value {
        Value::String(inner) => Some(inner.clone()),
        Value::Number(inner) => Some(inner.to_string()),
        _ => None,
    }
}

fn acp_update_from_payload(payload: &Value) -> Option<&Value> {
    if payload.get("__acp_method").and_then(|value| value.as_str()) != Some("session/update") {
        return None;
    }

    let params = payload.get("params")?;
    Some(params.get("update").unwrap_or(params))
}

fn acp_update_type(update: &Value) -> Option<&str> {
    update
        .get("sessionUpdate")
        .or_else(|| update.get("type"))
        .and_then(|value| value.as_str())
}

fn extract_active_tool_and_plan(
    logs: &[SessionLog],
) -> (Option<ActiveToolCallResponse>, Option<PlanProgressResponse>) {
    let mut active_tool: Option<ActiveToolCallResponse> = None;
    let mut latest_plan: Option<PlanProgressResponse> = None;

    for log in logs {
        let Some(payload) = extract_log_payload(log) else {
            continue;
        };

        let Some(update) = acp_update_from_payload(&payload) else {
            continue;
        };

        let Some(update_type) = acp_update_type(update) else {
            continue;
        };

        if update_type == "tool_call" || update_type == "tool_call_update" {
            let id = update.get("toolCallId").and_then(value_to_string);
            let tool = update
                .get("title")
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_string();
            let status = update
                .get("status")
                .and_then(|value| value.as_str())
                .map(|value| match value {
                    "completed" | "failed" => value,
                    "done" => "completed",
                    _ => "running",
                })
                .unwrap_or("running")
                .to_string();

            if tool.is_empty() {
                continue;
            }

            if status == "running" {
                active_tool = Some(ActiveToolCallResponse { id, tool, status });
            } else if let Some(current) = &active_tool {
                if current.id == id {
                    active_tool = None;
                }
            }
            continue;
        }

        if update_type == "plan" {
            let Some(entries) = update.get("entries").and_then(|value| value.as_array()) else {
                continue;
            };
            let total = entries.len();
            if total == 0 {
                continue;
            }
            let completed = entries
                .iter()
                .filter(|entry| {
                    entry
                        .get("status")
                        .and_then(|value| value.as_str())
                        .map(|status| matches!(status, "done" | "completed"))
                        .unwrap_or(false)
                })
                .count();
            latest_plan = Some(PlanProgressResponse { completed, total });
        }
    }

    (active_tool, latest_plan)
}

async fn enrich_session_response(
    manager: &crate::sessions::SessionManager,
    session: Session,
) -> SessionResponse {
    let session_id = session.id.clone();
    let mut response = SessionResponse::from(session);
    if response.protocol == "acp" {
        let logs = manager
            .get_logs(&session_id, Some(500))
            .await
            .unwrap_or_default();
        let (active_tool_call, plan_progress) = extract_active_tool_and_plan(&logs);
        response.active_tool_call = active_tool_call;
        response.plan_progress = plan_progress;
    }
    response
}

/// Create a new session (does not start it)
pub async fn create_session(
    State(state): State<AppState>,
    Json(req): Json<CreateRunnerSessionRequest>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    let session = manager
        .create_session(
            req.project_path,
            req.spec_ids,
            req.prompt,
            req.runner,
            req.mode,
        )
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(&e.to_string())),
            )
        })?;

    Ok(Json(enrich_session_response(&manager, session).await))
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
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(enrich_session_response(&manager, session).await))
}

pub async fn list_sessions(
    State(state): State<AppState>,
    axum::extract::Query(req): axum::extract::Query<ListSessionsRequest>,
) -> ApiResult<Json<Vec<SessionResponse>>> {
    let manager = state.session_manager.clone();

    // Resolve project_id to project_path if provided
    let project_path = if let Some(ref pid) = req.project_id {
        let registry = state.registry.read().await;
        let project = registry.get(pid).ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Project")),
            )
        })?;
        Some(project.path.to_string_lossy().to_string())
    } else {
        None
    };

    let sessions = manager
        .list_sessions(
            project_path.as_deref(),
            req.spec_id.as_deref(),
            req.status,
            req.runner.as_deref(),
        )
        .await
        .map_err(internal_error)?;

    let mut responses = Vec::with_capacity(sessions.len());
    for session in sessions {
        responses.push(enrich_session_response(&manager, session).await);
    }

    Ok(Json(responses))
}

/// Start a session
///
/// Spawns the runtime in the background and returns immediately with the
/// current (Pending) session. The session status will transition to Running
/// once the runtime is fully initialised, or to Failed if startup errors
/// occur. Callers should poll or subscribe to session updates to track
/// progress.
pub async fn start_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    // Verify the session exists before spawning
    let session = manager
        .get_session(&session_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    // Reject if already running or in a terminal state
    if session.is_running() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Session is already running")),
        ));
    }
    if session.status.is_terminal() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&format!(
                "Cannot start session with status: {:?}",
                session.status
            ))),
        ));
    }

    // Spawn the heavy runtime startup in the background
    let bg_manager = manager.clone();
    let bg_session_id = session_id.clone();
    tokio::spawn(async move {
        if let Err(e) = bg_manager.start_session(&bg_session_id).await {
            // Mark the session as failed so the UI can reflect the error
            if let Ok(Some(mut s)) = bg_manager.get_session(&bg_session_id).await {
                s.status = SessionStatus::Failed;
                s.ended_at = Some(chrono::Utc::now());
                s.touch();
                let _ = bg_manager.update_session(&s).await;
            }
            tracing::error!(session_id = %bg_session_id, error = %e, "Background session start failed");
        }
    });

    // Return immediately with the session in its current state
    Ok(Json(enrich_session_response(&manager, session).await))
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
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(enrich_session_response(&manager, session).await))
}

/// Send a prompt to an active ACP session
pub async fn prompt_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(req): Json<PromptSessionRequest>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    manager
        .prompt_session(&session_id, req.message)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(&e.to_string())),
            )
        })?;

    let session = manager
        .get_session(&session_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(enrich_session_response(&manager, session).await))
}

/// Cancel the active turn for an ACP session
pub async fn cancel_session_turn(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    manager
        .cancel_session_turn(&session_id)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(&e.to_string())),
            )
        })?;

    let session = manager
        .get_session(&session_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(enrich_session_response(&manager, session).await))
}

/// Respond to an ACP permission request
pub async fn respond_session_permission(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(req): Json<RespondPermissionRequest>,
) -> ApiResult<Json<SessionResponse>> {
    let manager = state.session_manager.clone();

    manager
        .respond_to_permission_request(&session_id, &req.permission_id, &req.option)
        .await
        .map_err(|e| {
            (
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request(&e.to_string())),
            )
        })?;

    let session = manager
        .get_session(&session_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(enrich_session_response(&manager, session).await))
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
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(enrich_session_response(&manager, session).await))
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
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

    Ok(Json(enrich_session_response(&manager, session).await))
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
        .map_err(internal_error)?;

    let log_dto: Vec<SessionLogDto> = logs.into_iter().map(SessionLogDto::from).collect();

    Ok(Json(log_dto))
}

/// Get events for a session
pub async fn get_session_events(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<Vec<SessionEventDto>>> {
    let manager = state.session_manager.clone();

    let events = manager
        .get_events(&session_id)
        .await
        .map_err(internal_error)?;

    let event_dto: Vec<SessionEventDto> = events.into_iter().map(SessionEventDto::from).collect();

    Ok(Json(event_dto))
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
        let payload = stream_payload_from_log(&log);

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
                        let payload = stream_payload_from_log(&log);
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

fn stream_payload_from_log(log: &SessionLog) -> Value {
    if let Ok(mut parsed) = serde_json::from_str::<Value>(&log.message) {
        let method = parsed
            .get("__acp_method")
            .and_then(|value| value.as_str())
            .unwrap_or_default();

        if matches!(method, "session/update" | "session/request_permission") {
            if let Some(map) = parsed.as_object_mut() {
                if !map.contains_key("timestamp") {
                    map.insert(
                        "timestamp".to_string(),
                        Value::String(log.timestamp.to_rfc3339()),
                    );
                }
            }
            return parsed;
        }
    }

    json!({
        "type": "log",
        "timestamp": log.timestamp.to_rfc3339(),
        "level": format!("{:?}", log.level).to_lowercase(),
        "message": log.message,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sessions::{LogLevel, SessionMode};
    use chrono::Utc;
    use serde_json::json;

    #[test]
    fn test_session_response_from_session() {
        let session = Session::new(
            "test-id".to_string(),
            "/test/project".to_string(),
            vec!["spec-001".to_string()],
            None,
            "claude".to_string(),
            SessionMode::Autonomous,
        );

        let response = SessionResponse::from(session);
        assert_eq!(response.id, "test-id");
        assert_eq!(response.project_path, "/test/project");
        assert_eq!(response.runner, "claude");
    }

    #[test]
    fn test_stream_payload_from_log_acp_passthrough() {
        let log = SessionLog {
            id: 1,
            session_id: "session-1".to_string(),
            timestamp: Utc::now(),
            level: LogLevel::Info,
            message: json!({
                "__acp_method": "session/update",
                "params": {
                    "update": {
                        "sessionUpdate": "agent_message_chunk",
                        "content": { "text": "Hello" },
                        "done": false
                    }
                }
            })
            .to_string(),
        };

        let payload = stream_payload_from_log(&log);
        assert_eq!(
            payload.get("__acp_method").and_then(|value| value.as_str()),
            Some("session/update")
        );
        assert!(payload
            .get("params")
            .and_then(|params| params.get("update"))
            .is_some());
        assert!(payload
            .get("timestamp")
            .and_then(|value| value.as_str())
            .is_some());
    }

    #[test]
    fn test_extract_active_tool_and_plan_from_raw_acp_logs() {
        let logs = vec![
            SessionLog {
                id: 1,
                session_id: "session-1".to_string(),
                timestamp: Utc::now(),
                level: LogLevel::Info,
                message: json!({
                    "__acp_method": "session/update",
                    "params": {
                        "update": {
                            "sessionUpdate": "tool_call",
                            "toolCallId": "tool-1",
                            "title": "read_file",
                            "status": "running"
                        }
                    }
                })
                .to_string(),
            },
            SessionLog {
                id: 2,
                session_id: "session-1".to_string(),
                timestamp: Utc::now(),
                level: LogLevel::Info,
                message: json!({
                    "__acp_method": "session/update",
                    "params": {
                        "update": {
                            "sessionUpdate": "plan",
                            "entries": [
                                {"id": "1", "title": "Step 1", "status": "completed"},
                                {"id": "2", "title": "Step 2", "status": "in_progress"}
                            ]
                        }
                    }
                })
                .to_string(),
            },
        ];

        let (active_tool, plan_progress) = extract_active_tool_and_plan(&logs);
        let active_tool = active_tool.expect("active tool should be present");
        assert_eq!(active_tool.id.as_deref(), Some("tool-1"));
        assert_eq!(active_tool.tool, "read_file");
        assert_eq!(active_tool.status, "running");

        let plan_progress = plan_progress.expect("plan progress should be present");
        assert_eq!(plan_progress.completed, 1);
        assert_eq!(plan_progress.total, 2);
    }
}
