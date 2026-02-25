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
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use tokio::sync::broadcast;

use crate::error::{internal_error, ApiError, ApiResult};
use crate::sessions::{
    ArchiveOptions, Session, SessionEvent, SessionLog, SessionMode, SessionStatus,
};
use crate::state::AppState;
use leanspec_core::sessions::runner::{
    default_runners_file, global_runners_path, project_runners_path, read_runners_file,
    write_runners_file, RunnerConfig, RunnerDefinition, RunnerRegistry,
};
use serde_json::json;

/// Request to create a new session
#[derive(Debug, Deserialize)]
pub struct CreateRunnerSessionRequest {
    pub project_path: String,
    /// Specs to attach as context (replaces spec_id)
    #[serde(default)]
    pub spec_ids: Vec<String>,
    /// Deprecated: use spec_ids instead. Kept for backward compatibility.
    pub spec_id: Option<String>,
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
    /// Deprecated: use spec_ids instead. Returns first spec_id for backward compatibility.
    pub spec_id: Option<String>,
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

impl From<Session> for SessionResponse {
    fn from(session: Session) -> Self {
        let spec_id = session.spec_ids.first().cloned();
        let protocol = detect_session_protocol(&session);
        Self {
            id: session.id,
            project_path: session.project_path,
            spec_ids: session.spec_ids,
            spec_id,
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

fn extract_log_payload(log: &SessionLog) -> Option<Value> {
    serde_json::from_str::<Value>(&log.message)
        .ok()
        .and_then(|value| if value.is_object() { Some(value) } else { None })
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

        let Some(event_type) = payload.get("type").and_then(|value| value.as_str()) else {
            continue;
        };

        if event_type == "acp_tool_call" {
            let id = payload
                .get("id")
                .and_then(|value| value.as_str())
                .map(|value| value.to_string());
            let tool = payload
                .get("tool")
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_string();
            let status = payload
                .get("status")
                .and_then(|value| value.as_str())
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

        if event_type == "acp_plan" {
            let Some(entries) = payload.get("entries").and_then(|value| value.as_array()) else {
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
                        .map(|status| status == "done")
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

    // Merge spec_ids from both fields (spec_ids takes priority; spec_id is deprecated alias)
    let mut spec_ids = req.spec_ids;
    if spec_ids.is_empty() {
        if let Some(spec_id) = req.spec_id {
            spec_ids = vec![spec_id];
        }
    }

    let session = manager
        .create_session(req.project_path, spec_ids, req.prompt, req.runner, req.mode)
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

/// List sessions with optional filters
#[derive(Debug, Deserialize)]
pub struct ListSessionsRequest {
    pub spec_id: Option<String>,
    pub status: Option<SessionStatus>,
    pub runner: Option<String>,
}

pub async fn list_sessions(
    State(state): State<AppState>,
    axum::extract::Query(req): axum::extract::Query<ListSessionsRequest>,
) -> ApiResult<Json<Vec<SessionResponse>>> {
    let manager = state.session_manager.clone();

    let sessions = manager
        .list_sessions(req.spec_id.as_deref(), req.status, req.runner.as_deref())
        .await
        .map_err(internal_error)?;

    let mut responses = Vec::with_capacity(sessions.len());
    for session in sessions {
        responses.push(enrich_session_response(&manager, session).await);
    }

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
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found("Session")),
            )
        })?;

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

/// List available runners
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListRunnersRequest {
    pub project_path: Option<String>,
    /// When true, skip command validation and version detection for faster response
    #[serde(default)]
    pub skip_validation: bool,
}

#[derive(Debug, Default, Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum RunnerScope {
    Project,
    #[default]
    Global,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerCreateRequest {
    pub project_path: String,
    pub runner: RunnerConfigPayload,
    pub scope: Option<RunnerScope>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerUpdateRequest {
    pub project_path: String,
    pub runner: RunnerUpdatePayload,
    pub scope: Option<RunnerScope>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerDeleteRequest {
    pub project_path: String,
    pub scope: Option<RunnerScope>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerDefaultRequest {
    pub project_path: String,
    pub runner_id: String,
    pub scope: Option<RunnerScope>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerConfigPayload {
    pub id: String,
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerUpdatePayload {
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
pub struct RunnerPatchQuery {
    #[serde(default)]
    pub minimal: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerInfoResponse {
    pub id: String,
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    /// None means validation hasn't been performed yet (pending state)
    pub available: Option<bool>,
    pub version: Option<String>,
    pub source: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerListResponse {
    pub default: Option<String>,
    pub runners: Vec<RunnerInfoResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerValidateResponse {
    pub valid: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerVersionResponse {
    pub version: Option<String>,
}

pub async fn list_available_runners(
    State(state): State<AppState>,
    axum::extract::Query(req): axum::extract::Query<ListRunnersRequest>,
) -> ApiResult<Json<Vec<String>>> {
    let runners = state
        .session_manager
        .list_available_runners(req.project_path.as_deref())
        .await
        .map_err(internal_error)?;

    Ok(Json(runners))
}

pub async fn list_runners(
    State(_state): State<AppState>,
    axum::extract::Query(req): axum::extract::Query<ListRunnersRequest>,
) -> ApiResult<Json<RunnerListResponse>> {
    let project_path = req.project_path.unwrap_or_else(|| ".".to_string());

    let response = build_runner_list_response(&project_path).map_err(internal_error)?;

    Ok(Json(response))
}

pub async fn get_runner(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    axum::extract::Query(req): axum::extract::Query<ListRunnersRequest>,
) -> ApiResult<Json<RunnerInfoResponse>> {
    let project_path = req.project_path.unwrap_or_else(|| ".".to_string());
    let registry = RunnerRegistry::load(PathBuf::from(&project_path).as_path()).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let runner = registry.get(&runner_id).ok_or_else(|| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found("Runner")),
        )
    })?;

    let sources = load_runner_sources(&project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(Json(build_runner_info(runner, &sources)))
}

pub async fn create_runner(
    State(_state): State<AppState>,
    Json(req): Json<RunnerCreateRequest>,
) -> ApiResult<Json<RunnerListResponse>> {
    if let Some(command) = &req.runner.command {
        if command.trim().is_empty() {
            return Err((
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request("Runner command is required")),
            ));
        }
    }

    let scope = req.scope.unwrap_or_default();
    let path = resolve_scope_path(&req.project_path, scope);
    let mut file = load_or_default_runners_file(&path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    file.runners.insert(
        req.runner.id.clone(),
        RunnerConfig {
            name: req.runner.name,
            command: req.runner.command,
            args: req.runner.args,
            env: req.runner.env,
            detection: None,
            symlink_file: None,
            prompt_flag: None,
        },
    );

    write_runners_file(&path, &file).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let response = build_runner_list_response(&req.project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(Json(response))
}

pub async fn update_runner(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    Json(req): Json<RunnerUpdateRequest>,
) -> ApiResult<Json<RunnerListResponse>> {
    if let Some(command) = &req.runner.command {
        if command.trim().is_empty() {
            return Err((
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request("Runner command is required")),
            ));
        }
    }

    let scope = req.scope.unwrap_or_default();
    let path = resolve_scope_path(&req.project_path, scope);
    let mut file = load_or_default_runners_file(&path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    file.runners.insert(
        runner_id,
        RunnerConfig {
            name: req.runner.name,
            command: req.runner.command,
            args: req.runner.args,
            env: req.runner.env,
            detection: None,
            symlink_file: None,
            prompt_flag: None,
        },
    );

    write_runners_file(&path, &file).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let response = build_runner_list_response(&req.project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(Json(response))
}

pub async fn patch_runner(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    axum::extract::Query(query): axum::extract::Query<RunnerPatchQuery>,
    Json(req): Json<RunnerUpdateRequest>,
) -> ApiResult<Json<RunnerInfoResponse>> {
    if let Some(command) = &req.runner.command {
        if command.trim().is_empty() {
            return Err((
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request("Runner command is required")),
            ));
        }
    }

    let scope = req.scope.unwrap_or_default();
    let path = resolve_scope_path(&req.project_path, scope);
    let mut file = load_or_default_runners_file(&path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let existing = file.runners.get(&runner_id).cloned().unwrap_or_default();

    file.runners.insert(
        runner_id.clone(),
        RunnerConfig {
            name: req.runner.name.or(existing.name),
            command: req.runner.command.or(existing.command),
            args: req.runner.args.or(existing.args),
            env: req.runner.env.or(existing.env),
            detection: existing.detection,
            symlink_file: existing.symlink_file,
            prompt_flag: existing.prompt_flag,
        },
    );

    write_runners_file(&path, &file).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let registry =
        RunnerRegistry::load(PathBuf::from(&req.project_path).as_path()).map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

    let runner = registry.get(&runner_id).ok_or_else(|| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found("Runner")),
        )
    })?;

    let sources = load_runner_sources(&req.project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let mut response = build_runner_info(runner, &sources);
    if query.minimal {
        response.available = None;
    }

    Ok(Json(response))
}

pub async fn delete_runner(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    Json(req): Json<RunnerDeleteRequest>,
) -> ApiResult<Json<RunnerListResponse>> {
    let scope = req.scope.unwrap_or_default();
    let path = resolve_scope_path(&req.project_path, scope);
    let mut file = load_or_default_runners_file(&path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    if file.runners.remove(&runner_id).is_none() {
        return Err((
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found("Runner")),
        ));
    }

    write_runners_file(&path, &file).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let response = build_runner_list_response(&req.project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(Json(response))
}

pub async fn get_runner_version(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    axum::extract::Query(req): axum::extract::Query<ListRunnersRequest>,
) -> ApiResult<Json<RunnerVersionResponse>> {
    let project_path = req.project_path.unwrap_or_else(|| ".".to_string());
    let registry = RunnerRegistry::load(PathBuf::from(&project_path).as_path()).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let runner = registry.get(&runner_id).ok_or_else(|| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found("Runner")),
        )
    })?;

    let runner = runner.clone();
    let version = tokio::task::spawn_blocking(move || runner.detect_version())
        .await
        .unwrap_or(None);

    Ok(Json(RunnerVersionResponse { version }))
}

pub async fn validate_runner(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    axum::extract::Query(req): axum::extract::Query<ListRunnersRequest>,
) -> ApiResult<Json<RunnerValidateResponse>> {
    let project_path = req.project_path.unwrap_or_else(|| ".".to_string());
    let registry = RunnerRegistry::load(PathBuf::from(&project_path).as_path()).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    match registry.validate(&runner_id) {
        Ok(()) => Ok(Json(RunnerValidateResponse {
            valid: true,
            error: None,
        })),
        Err(err) => Ok(Json(RunnerValidateResponse {
            valid: false,
            error: Some(err.to_string()),
        })),
    }
}

pub async fn set_default_runner(
    State(_state): State<AppState>,
    Json(req): Json<RunnerDefaultRequest>,
) -> ApiResult<Json<RunnerListResponse>> {
    if req.runner_id.trim().is_empty() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Runner id is required")),
        ));
    }

    let registry =
        RunnerRegistry::load(PathBuf::from(&req.project_path).as_path()).map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

    if registry.get(&req.runner_id).is_none() {
        return Err((
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found("Runner")),
        ));
    }

    let scope = req.scope.unwrap_or_default();
    let path = resolve_scope_path(&req.project_path, scope);
    let mut file = load_or_default_runners_file(&path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    file.default = Some(req.runner_id);

    write_runners_file(&path, &file).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let response = build_runner_list_response(&req.project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(Json(response))
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
        let allowed = [
            "acp_message",
            "acp_thought",
            "acp_tool_call",
            "acp_plan",
            "acp_permission_request",
            "acp_mode_update",
            "complete",
        ];

        let event_type = parsed
            .get("type")
            .and_then(|value| value.as_str())
            .unwrap_or_default();

        if allowed.contains(&event_type) {
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

fn resolve_scope_path(project_path: &str, scope: RunnerScope) -> PathBuf {
    match scope {
        RunnerScope::Project => project_runners_path(PathBuf::from(project_path).as_path()),
        RunnerScope::Global => global_runners_path(),
    }
}

fn load_or_default_runners_file(
    path: &std::path::Path,
) -> leanspec_core::CoreResult<leanspec_core::sessions::runner::RunnersFile> {
    match read_runners_file(path)? {
        Some(file) => Ok(file),
        None => Ok(default_runners_file()),
    }
}

fn load_runner_sources(
    project_path: &str,
) -> leanspec_core::CoreResult<(HashSet<String>, HashSet<String>)> {
    let global = read_runners_file(&global_runners_path())?
        .map(|file| file.runners.keys().cloned().collect::<HashSet<_>>())
        .unwrap_or_default();
    let project = read_runners_file(&project_runners_path(PathBuf::from(project_path).as_path()))?
        .map(|file| file.runners.keys().cloned().collect::<HashSet<_>>())
        .unwrap_or_default();

    Ok((global, project))
}

fn build_runner_info(
    runner: &RunnerDefinition,
    sources: &(HashSet<String>, HashSet<String>),
) -> RunnerInfoResponse {
    let (global_sources, project_sources) = sources;
    let source = if project_sources.contains(&runner.id) {
        "project"
    } else if global_sources.contains(&runner.id) {
        "global"
    } else {
        "builtin"
    };

    // Check availability (fast PATH lookup), but never detect version here.
    // Version detection spawns child processes and is done via a separate API.
    let available = runner
        .command
        .as_ref()
        .map(|_| runner.validate_command().is_ok());

    RunnerInfoResponse {
        id: runner.id.clone(),
        name: runner.name.clone(),
        command: runner.command.clone(),
        args: runner.args.clone(),
        env: runner.env.clone(),
        available,
        version: None,
        source: source.to_string(),
    }
}

fn build_runner_list_response(project_path: &str) -> leanspec_core::CoreResult<RunnerListResponse> {
    let registry = RunnerRegistry::load(PathBuf::from(project_path).as_path())?;
    let sources = load_runner_sources(project_path)?;
    let runners = registry
        .list()
        .into_iter()
        .map(|runner| build_runner_info(runner, &sources))
        .collect::<Vec<_>>();

    Ok(RunnerListResponse {
        default: registry.default().map(|value| value.to_string()),
        runners,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
