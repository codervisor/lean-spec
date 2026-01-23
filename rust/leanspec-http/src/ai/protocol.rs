use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerChatPayload {
    pub messages: Vec<serde_json::Value>,
    pub project_id: Option<String>,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    pub session_id: Option<String>,
    pub config: Option<serde_json::Value>,
    pub base_url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WorkerRequest {
    Chat {
        id: String,
        payload: WorkerChatPayload,
    },
    Health {
        id: String,
    },
    ReloadConfig {
        id: String,
        payload: serde_json::Value,
    },
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WorkerResponse {
    Chunk { id: String, data: serde_json::Value },
    ToolCall { id: String, data: serde_json::Value },
    ToolResult { id: String, data: serde_json::Value },
    Done { id: String },
    Error { id: String, error: String },
    HealthOk { id: String, data: serde_json::Value },
    ConfigReloaded { id: String },
}

impl WorkerResponse {
    pub fn id(&self) -> &str {
        match self {
            WorkerResponse::Chunk { id, .. }
            | WorkerResponse::ToolCall { id, .. }
            | WorkerResponse::ToolResult { id, .. }
            | WorkerResponse::Done { id }
            | WorkerResponse::Error { id, .. }
            | WorkerResponse::HealthOk { id, .. }
            | WorkerResponse::ConfigReloaded { id } => id,
        }
    }
}
