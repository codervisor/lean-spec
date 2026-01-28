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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_worker_chat_payload_serialization() {
        let payload = WorkerChatPayload {
            messages: vec![serde_json::json!({"role": "user", "content": "hello"})],
            project_id: Some("proj-123".to_string()),
            provider_id: Some("openai".to_string()),
            model_id: Some("gpt-4o".to_string()),
            session_id: Some("session-456".to_string()),
            config: None,
            base_url: Some("http://localhost:3000".to_string()),
        };

        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("projectId")); // camelCase
        assert!(json.contains("providerId")); // camelCase
        assert!(json.contains("proj-123"));
        assert!(json.contains("openai"));
        assert!(json.contains("gpt-4o"));
    }

    #[test]
    fn test_worker_chat_payload_deserialization() {
        let json = r#"{"messages":[{"role":"user","content":"hello"}],"projectId":"proj-123","providerId":"openai","modelId":"gpt-4o","sessionId":"session-456","baseUrl":"http://localhost:3000"}"#;

        let payload: WorkerChatPayload = serde_json::from_str(json).unwrap();

        assert_eq!(payload.project_id, Some("proj-123".to_string()));
        assert_eq!(payload.provider_id, Some("openai".to_string()));
        assert_eq!(payload.model_id, Some("gpt-4o".to_string()));
        assert_eq!(payload.session_id, Some("session-456".to_string()));
        assert_eq!(payload.base_url, Some("http://localhost:3000".to_string()));
    }

    #[test]
    fn test_worker_request_serialization() {
        let request = WorkerRequest::Chat {
            id: "req-123".to_string(),
            payload: WorkerChatPayload {
                messages: vec![serde_json::json!({"role": "user", "content": "hello"})],
                project_id: None,
                provider_id: None,
                model_id: None,
                session_id: None,
                config: None,
                base_url: None,
            },
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("\"id\":\"req-123\""));
        assert!(json.contains("\"type\":\"chat\""));
    }

    #[test]
    fn test_worker_request_health() {
        let request = WorkerRequest::Health {
            id: "health-123".to_string(),
        };
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("\"type\":\"health\""));
        assert!(json.contains("\"id\":\"health-123\""));
    }

    #[test]
    fn test_worker_request_reload_config() {
        let config = serde_json::json!({"key": "value"});
        let request = WorkerRequest::ReloadConfig {
            id: "cfg-123".to_string(),
            payload: config.clone(),
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("\"type\":\"reload_config\""));
        assert!(json.contains("\"id\":\"cfg-123\""));
    }

    #[test]
    fn test_worker_response_chunk() {
        let response = WorkerResponse::Chunk {
            id: "req-123".to_string(),
            data: serde_json::json!({"text": "Hello"}),
        };

        assert_eq!(response.id(), "req-123");
    }

    #[test]
    fn test_worker_response_deserialization() {
        let json = r#"{"type":"chunk","id":"req-123","data":{"text":"Hello"}}"#;
        let response: WorkerResponse = serde_json::from_str(json).unwrap();

        match response {
            WorkerResponse::Chunk { id, data } => {
                assert_eq!(id, "req-123");
                assert_eq!(data["text"], "Hello");
            }
            _ => panic!("Expected Chunk variant"),
        }
    }

    #[test]
    fn test_worker_response_tool_call() {
        let json = r#"{"type":"tool_call","id":"req-123","data":{"toolCallId":"call-1","toolName":"search","args":{"query":"test"}}}"#;
        let response: WorkerResponse = serde_json::from_str(json).unwrap();

        match response {
            WorkerResponse::ToolCall { id, data } => {
                assert_eq!(id, "req-123");
                assert_eq!(data["toolName"], "search");
            }
            _ => panic!("Expected ToolCall variant"),
        }
    }

    #[test]
    fn test_worker_response_tool_result() {
        let json = r#"{"type":"tool_result","id":"req-123","data":{"toolCallId":"call-1","result":{"success":true}}}"#;
        let response: WorkerResponse = serde_json::from_str(json).unwrap();

        match response {
            WorkerResponse::ToolResult { id, data } => {
                assert_eq!(id, "req-123");
                assert_eq!(data["result"]["success"], true);
            }
            _ => panic!("Expected ToolResult variant"),
        }
    }

    #[test]
    fn test_worker_response_done() {
        let json = r#"{"type":"done","id":"req-123"}"#;
        let response: WorkerResponse = serde_json::from_str(json).unwrap();

        match response {
            WorkerResponse::Done { id } => {
                assert_eq!(id, "req-123");
            }
            _ => panic!("Expected Done variant"),
        }
    }

    #[test]
    fn test_worker_response_error() {
        let json = r#"{"type":"error","id":"req-123","error":"Something went wrong"}"#;
        let response: WorkerResponse = serde_json::from_str(json).unwrap();

        match response {
            WorkerResponse::Error { id, error } => {
                assert_eq!(id, "req-123");
                assert_eq!(error, "Something went wrong");
            }
            _ => panic!("Expected Error variant"),
        }
    }

    #[test]
    fn test_worker_response_health_ok() {
        let json = r#"{"type":"health_ok","id":"health-123","data":{"ready":true,"providers":["openai","anthropic"]}}"#;
        let response: WorkerResponse = serde_json::from_str(json).unwrap();

        match response {
            WorkerResponse::HealthOk { id, data } => {
                assert_eq!(id, "health-123");
                assert_eq!(data["ready"], true);
            }
            _ => panic!("Expected HealthOk variant"),
        }
    }

    #[test]
    fn test_worker_response_config_reloaded() {
        let json = r#"{"type":"config_reloaded","id":"cfg-123"}"#;
        let response: WorkerResponse = serde_json::from_str(json).unwrap();

        match response {
            WorkerResponse::ConfigReloaded { id } => {
                assert_eq!(id, "cfg-123");
            }
            _ => panic!("Expected ConfigReloaded variant"),
        }
    }
}
