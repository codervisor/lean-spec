//! Cloud sync state management for machine-scoped data

use axum::extract::ws::Message;
use axum::http::HeaderMap;
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tokio::sync::mpsc::UnboundedSender;

use crate::config::config_dir;

pub const MACHINE_HEADER: &str = "x-leanspec-machine";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MachineRecord {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_seen: Option<DateTime<Utc>>,
    #[serde(default)]
    pub projects: HashMap<String, ProjectRecord>,
    #[serde(default)]
    pub revoked: bool,
    #[serde(default)]
    pub pending_commands: Vec<PendingCommand>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRecord {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(default)]
    pub favorite: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(default)]
    pub specs: HashMap<String, SpecRecord>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_updated: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecRecord {
    pub spec_name: String,
    pub title: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub assignee: Option<String>,
    pub content_md: String,
    pub content_hash: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub depends_on: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<String>,
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogEntry {
    pub id: String,
    pub machine_id: String,
    pub project_id: Option<String>,
    pub spec_name: Option<String>,
    pub action: String,
    pub status: String,
    pub message: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessToken {
    pub token: String,
    pub issued_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceCodeRecord {
    pub device_code: String,
    pub user_code: String,
    pub expires_at: DateTime<Utc>,
    pub interval_seconds: u64,
    pub approved: bool,
    pub access_token: Option<AccessToken>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncCommand {
    ApplyMetadata {
        project_id: String,
        spec_name: String,
        status: Option<String>,
        priority: Option<String>,
        tags: Option<Vec<String>>,
        expected_content_hash: Option<String>,
    },
    RenameMachine {
        label: String,
    },
    RevokeMachine,
    ExecutionRequest {
        request_id: String,
        payload: serde_json::Value,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingCommand {
    pub id: String,
    pub command: SyncCommand,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SyncPersistentState {
    #[serde(default)]
    pub machines: HashMap<String, MachineRecord>,
    #[serde(default)]
    pub audit_log: Vec<AuditLogEntry>,
    #[serde(default)]
    pub tokens: HashMap<String, AccessToken>,
}

#[derive(Debug, Default)]
pub struct SyncState {
    pub persistent: SyncPersistentState,
    pub connections: HashMap<String, UnboundedSender<Message>>,
    pub device_codes: HashMap<String, DeviceCodeRecord>,
}

impl SyncState {
    pub fn load() -> Self {
        let path = sync_state_path();
        let persisted = if path.exists() {
            fs::read_to_string(&path)
                .ok()
                .and_then(|content| serde_json::from_str::<SyncPersistentState>(&content).ok())
                .unwrap_or_default()
        } else {
            SyncPersistentState::default()
        };

        SyncState {
            persistent: persisted,
            connections: HashMap::new(),
            device_codes: HashMap::new(),
        }
    }

    pub fn save(&self) {
        let path = sync_state_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        if let Ok(serialized) = serde_json::to_string_pretty(&self.persistent) {
            let _ = fs::write(path, serialized);
        }
    }

    pub fn is_machine_online(&self, machine_id: &str) -> bool {
        if self.connections.contains_key(machine_id) {
            return true;
        }

        let Some(machine) = self.persistent.machines.get(machine_id) else {
            return false;
        };

        let Some(last_seen) = machine.last_seen else {
            return false;
        };

        Utc::now() - last_seen <= Duration::seconds(30)
    }

    pub fn ensure_machine(&mut self, machine_id: &str, label: &str) -> &mut MachineRecord {
        self.persistent
            .machines
            .entry(machine_id.to_string())
            .or_insert_with(|| MachineRecord {
                id: machine_id.to_string(),
                label: label.to_string(),
                last_seen: Some(Utc::now()),
                projects: HashMap::new(),
                revoked: false,
                pending_commands: Vec::new(),
            })
    }
}

pub fn machine_id_from_headers(headers: &HeaderMap) -> Option<String> {
    headers
        .get(MACHINE_HEADER)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn sync_state_path() -> PathBuf {
    config_dir().join("sync_state.json")
}
