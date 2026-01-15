//! Cloud sync handlers

use axum::extract::{
    ws::{Message, WebSocket, WebSocketUpgrade},
    Path, State,
};
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::Json;
use chrono::{DateTime, Utc};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::config::ServerConfig;
use crate::error::{ApiError, ApiResult};
use crate::state::AppState;
use crate::sync_state::{
    AccessToken, AuditLogEntry, DeviceCodeRecord, PendingCommand, SpecRecord, SyncCommand,
    SyncState,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MachinesResponse {
    pub machines: Vec<MachineSummary>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MachineSummary {
    pub id: String,
    pub label: String,
    pub status: String,
    pub last_seen: Option<DateTime<Utc>>,
    pub project_count: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameMachineRequest {
    pub label: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceCodeRequest {
    pub machine_label: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceActivateRequest {
    pub user_code: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceTokenRequest {
    pub device_code: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncEventsRequest {
    pub machine_id: String,
    pub machine_label: Option<String>,
    pub project_id: String,
    pub project_name: Option<String>,
    pub events: Vec<SyncEvent>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
pub enum SyncEvent {
    Snapshot {
        specs: Vec<SpecRecord>,
    },
    SpecChanged {
        spec: SpecRecord,
    },
    SpecDeleted {
        spec_name: String,
    },
    Heartbeat {
        version: Option<String>,
        queue_depth: usize,
    },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncAckResponse {
    pub success: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionRequest {
    pub payload: serde_json::Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
pub enum BridgeMessage {
    Hello {
        machine_id: String,
        machine_label: String,
        version: Option<String>,
    },
    CommandResult {
        command_id: String,
        status: String,
        message: Option<String>,
        current_content_hash: Option<String>,
    },
    Heartbeat {
        queue_depth: usize,
    },
}

fn api_key_from_config(config: &ServerConfig) -> Option<String> {
    std::env::var("LEANSPEC_SYNC_API_KEY")
        .ok()
        .or_else(|| config.sync.api_key.clone())
}

fn is_valid_token(headers: &HeaderMap, config: &ServerConfig, sync_state: &SyncState) -> bool {
    if let Some(value) = headers.get("x-api-key").and_then(|h| h.to_str().ok()) {
        if let Some(api_key) = api_key_from_config(config) {
            if api_key == value {
                return true;
            }
        }
    }

    if let Some(value) = headers.get("authorization").and_then(|h| h.to_str().ok()) {
        if let Some(token) = value.strip_prefix("Bearer ") {
            if let Some(entry) = sync_state.persistent.tokens.get(token) {
                if let Some(expires_at) = entry.expires_at {
                    return expires_at > Utc::now();
                }
                return true;
            }
        }
    }

    false
}

fn require_sync_auth(
    headers: &HeaderMap,
    config: &ServerConfig,
    sync_state: &SyncState,
) -> Result<(), (StatusCode, Json<ApiError>)> {
    if is_valid_token(headers, config, sync_state) {
        return Ok(());
    }

    Err((
        StatusCode::UNAUTHORIZED,
        Json(ApiError::unauthorized("Missing or invalid sync token")),
    ))
}

/// GET /api/sync/machines
pub async fn list_machines(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<MachinesResponse>> {
    let sync_state = state.sync_state.read().await;
    require_sync_auth(&headers, &state.config, &sync_state)?;

    let machines = sync_state
        .persistent
        .machines
        .values()
        .map(|machine| MachineSummary {
            id: machine.id.clone(),
            label: machine.label.clone(),
            status: if sync_state.is_machine_online(&machine.id) {
                "online".to_string()
            } else {
                "offline".to_string()
            },
            last_seen: machine.last_seen,
            project_count: machine.projects.len(),
        })
        .collect::<Vec<_>>();

    Ok(Json(MachinesResponse { machines }))
}

/// PATCH /api/sync/machines/:id
pub async fn rename_machine(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(machine_id): Path<String>,
    Json(req): Json<RenameMachineRequest>,
) -> ApiResult<Json<MachineSummary>> {
    let mut sync_state = state.sync_state.write().await;
    require_sync_auth(&headers, &state.config, &sync_state)?;

    let sender = sync_state.connections.get(&machine_id).cloned();
    let is_online = sync_state.is_machine_online(&machine_id);

    let (summary, command) = {
        let machine = sync_state
            .persistent
            .machines
            .get_mut(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        machine.label = req.label.clone();

        let command = PendingCommand {
            id: Uuid::new_v4().to_string(),
            command: SyncCommand::RenameMachine { label: req.label },
            created_at: Utc::now(),
        };

        machine.pending_commands.push(command.clone());

        let summary = MachineSummary {
            id: machine.id.clone(),
            label: machine.label.clone(),
            status: if is_online {
                "online".to_string()
            } else {
                "offline".to_string()
            },
            last_seen: machine.last_seen,
            project_count: machine.projects.len(),
        };

        (summary, command)
    };

    if let Some(sender) = sender {
        let _ = sender.send(Message::Text(
            serde_json::to_string(&command).unwrap_or_default().into(),
        ));
    }

    sync_state.save();

    Ok(Json(summary))
}

/// DELETE /api/sync/machines/:id
pub async fn revoke_machine(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(machine_id): Path<String>,
) -> ApiResult<StatusCode> {
    let mut sync_state = state.sync_state.write().await;
    require_sync_auth(&headers, &state.config, &sync_state)?;

    let sender = sync_state.connections.get(&machine_id).cloned();

    let command = {
        let machine = sync_state
            .persistent
            .machines
            .get_mut(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        machine.revoked = true;

        let command = PendingCommand {
            id: Uuid::new_v4().to_string(),
            command: SyncCommand::RevokeMachine,
            created_at: Utc::now(),
        };

        machine.pending_commands.push(command.clone());
        command
    };

    if let Some(sender) = sender {
        let _ = sender.send(Message::Text(
            serde_json::to_string(&command).unwrap_or_default().into(),
        ));
    }

    sync_state.save();

    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/sync/machines/:id/execution
pub async fn trigger_execution_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(machine_id): Path<String>,
    Json(req): Json<ExecutionRequest>,
) -> ApiResult<Json<SyncAckResponse>> {
    let mut sync_state = state.sync_state.write().await;
    require_sync_auth(&headers, &state.config, &sync_state)?;

    let sender = sync_state.connections.get(&machine_id).cloned();

    let command = {
        let machine = sync_state
            .persistent
            .machines
            .get_mut(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        let command = PendingCommand {
            id: Uuid::new_v4().to_string(),
            command: SyncCommand::ExecutionRequest {
                request_id: Uuid::new_v4().to_string(),
                payload: req.payload,
            },
            created_at: Utc::now(),
        };

        machine.pending_commands.push(command.clone());
        command
    };

    if let Some(sender) = sender {
        let _ = sender.send(Message::Text(
            serde_json::to_string(&command).unwrap_or_default().into(),
        ));
    }

    sync_state.save();

    Ok(Json(SyncAckResponse { success: true }))
}

/// POST /api/sync/device/code
pub async fn create_device_code(
    State(state): State<AppState>,
    Json(_req): Json<DeviceCodeRequest>,
) -> ApiResult<Json<DeviceCodeResponse>> {
    let mut sync_state = state.sync_state.write().await;

    let device_code = Uuid::new_v4().to_string();
    let user_code = Uuid::new_v4().to_string()[..8].to_uppercase();
    let expires_at =
        Utc::now() + chrono::Duration::seconds(state.config.sync.device_code_ttl_seconds as i64);

    sync_state.device_codes.insert(
        device_code.clone(),
        DeviceCodeRecord {
            device_code: device_code.clone(),
            user_code: user_code.clone(),
            expires_at,
            interval_seconds: 5,
            approved: false,
            access_token: None,
        },
    );

    Ok(Json(DeviceCodeResponse {
        device_code,
        user_code,
        verification_uri: state.config.sync.verification_url.clone(),
        expires_in: state.config.sync.device_code_ttl_seconds,
        interval: 5,
    }))
}

/// POST /api/sync/device/activate
pub async fn activate_device_code(
    State(state): State<AppState>,
    Json(req): Json<DeviceActivateRequest>,
) -> ApiResult<Json<SyncAckResponse>> {
    let mut sync_state = state.sync_state.write().await;

    let record = sync_state
        .device_codes
        .values_mut()
        .find(|r| r.user_code.eq_ignore_ascii_case(req.user_code.trim()))
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::invalid_request("Invalid user code")),
            )
        })?;

    if record.expires_at < Utc::now() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Device code expired")),
        ));
    }

    let expires_at = if state.config.sync.token_ttl_seconds == 0 {
        None
    } else {
        Some(Utc::now() + chrono::Duration::seconds(state.config.sync.token_ttl_seconds as i64))
    };

    let token = AccessToken {
        token: Uuid::new_v4().to_string(),
        issued_at: Utc::now(),
        expires_at,
    };

    record.approved = true;
    record.access_token = Some(token.clone());
    sync_state
        .persistent
        .tokens
        .insert(token.token.clone(), token.clone());
    sync_state.save();

    Ok(Json(SyncAckResponse { success: true }))
}

/// POST /api/sync/oauth/token
pub async fn exchange_device_code(
    State(state): State<AppState>,
    Json(req): Json<DeviceTokenRequest>,
) -> ApiResult<Json<DeviceTokenResponse>> {
    let mut sync_state = state.sync_state.write().await;

    let record = sync_state
        .device_codes
        .get_mut(&req.device_code)
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::invalid_request("Device code not found")),
            )
        })?;

    if record.expires_at < Utc::now() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Device code expired")),
        ));
    }

    if !record.approved {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("authorization_pending")),
        ));
    }

    let token = record.access_token.clone().ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("authorization_pending")),
        )
    })?;

    let expires_in = token
        .expires_at
        .map(|expires| (expires - Utc::now()).num_seconds().max(0) as u64);

    Ok(Json(DeviceTokenResponse {
        access_token: token.token,
        token_type: "bearer".to_string(),
        expires_in,
    }))
}

/// POST /api/sync/events
pub async fn ingest_sync_events(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<SyncEventsRequest>,
) -> ApiResult<Json<SyncAckResponse>> {
    let mut sync_state = state.sync_state.write().await;
    require_sync_auth(&headers, &state.config, &sync_state)?;

    let machine = sync_state.ensure_machine(
        &req.machine_id,
        req.machine_label.as_deref().unwrap_or("Unknown"),
    );
    if machine.revoked {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ApiError::unauthorized("Machine revoked")),
        ));
    }

    machine.last_seen = Some(Utc::now());

    let project = machine
        .projects
        .entry(req.project_id.clone())
        .or_insert_with(|| crate::sync_state::ProjectRecord {
            id: req.project_id.clone(),
            name: req
                .project_name
                .clone()
                .unwrap_or_else(|| req.project_id.clone()),
            path: None,
            favorite: false,
            color: None,
            specs: HashMap::new(),
            last_updated: Some(Utc::now()),
        });

    if let Some(name) = req.project_name.clone() {
        project.name = name;
    }

    for event in req.events {
        match event {
            SyncEvent::Snapshot { specs } => {
                project.specs = specs
                    .into_iter()
                    .map(|spec| (spec.spec_name.clone(), spec))
                    .collect();
                project.last_updated = Some(Utc::now());
            }
            SyncEvent::SpecChanged { spec } => {
                project.specs.insert(spec.spec_name.clone(), spec);
                project.last_updated = Some(Utc::now());
            }
            SyncEvent::SpecDeleted { spec_name } => {
                project.specs.remove(&spec_name);
                project.last_updated = Some(Utc::now());
            }
            SyncEvent::Heartbeat { .. } => {
                machine.last_seen = Some(Utc::now());
            }
        }
    }

    sync_state.save();

    Ok(Json(SyncAckResponse { success: true }))
}

/// GET /api/sync/bridge/ws
pub async fn bridge_ws(
    State(state): State<AppState>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    {
        let sync_state = state.sync_state.read().await;
        if let Err(err) = require_sync_auth(&headers, &state.config, &sync_state) {
            return err.into_response();
        }
    }

    ws.on_upgrade(move |socket| handle_bridge_socket(state, socket))
}

async fn handle_bridge_socket(state: AppState, socket: WebSocket) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    let mut machine_id: Option<String> = None;

    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let _ = sender.send(msg).await;
        }
    });

    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            if let Ok(message) = serde_json::from_str::<BridgeMessage>(&text) {
                match message {
                    BridgeMessage::Hello {
                        machine_id: id,
                        machine_label,
                        ..
                    } => {
                        let mut sync_state = state.sync_state.write().await;
                        let pending_commands = {
                            let machine = sync_state.ensure_machine(&id, &machine_label);
                            machine.last_seen = Some(Utc::now());
                            machine_id = Some(id.clone());
                            machine.pending_commands.clone()
                        };

                        sync_state.connections.insert(id.clone(), tx.clone());

                        for command in &pending_commands {
                            let _ = tx.send(Message::Text(
                                serde_json::to_string(command).unwrap_or_default().into(),
                            ));
                        }
                        sync_state.save();
                    }
                    BridgeMessage::Heartbeat { .. } => {
                        if let Some(id) = machine_id.clone() {
                            let mut sync_state = state.sync_state.write().await;
                            if let Some(machine) = sync_state.persistent.machines.get_mut(&id) {
                                machine.last_seen = Some(Utc::now());
                                sync_state.save();
                            }
                        }
                    }
                    BridgeMessage::CommandResult {
                        command_id,
                        status,
                        message,
                        ..
                    } => {
                        if let Some(id) = machine_id.clone() {
                            let mut sync_state = state.sync_state.write().await;
                            if let Some(machine) = sync_state.persistent.machines.get_mut(&id) {
                                machine.pending_commands.retain(|cmd| cmd.id != command_id);
                            }

                            sync_state.persistent.audit_log.push(AuditLogEntry {
                                id: Uuid::new_v4().to_string(),
                                machine_id: id,
                                project_id: None,
                                spec_name: None,
                                action: "command_result".to_string(),
                                status,
                                message,
                                created_at: Utc::now(),
                            });
                            sync_state.save();
                        }
                    }
                }
            }
        }
    }

    if let Some(id) = machine_id {
        let mut sync_state = state.sync_state.write().await;
        sync_state.connections.remove(&id);
        sync_state.save();
    }

    send_task.abort();
}
