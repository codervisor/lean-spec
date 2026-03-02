//! MCP Protocol implementation

use crate::tools;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// JSON-RPC request from MCP client
#[derive(Debug, Deserialize)]
pub struct McpRequest {
    #[allow(dead_code)]
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    #[serde(default)]
    pub params: Value,
}

/// JSON-RPC response to MCP client
#[derive(Debug, Serialize)]
pub struct McpResponse {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<McpError>,
}

/// JSON-RPC error
#[derive(Debug, Serialize)]
pub struct McpError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

impl McpResponse {
    pub fn success(id: Option<Value>, result: Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(code: i32, message: &str) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id: None,
            result: None,
            error: Some(McpError {
                code,
                message: message.to_string(),
                data: None,
            }),
        }
    }

    pub fn error_with_id(id: Option<Value>, code: i32, message: &str) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(McpError {
                code,
                message: message.to_string(),
                data: None,
            }),
        }
    }

    /// Create an error response that includes a structured error code in `data`.
    pub fn error_with_code(
        id: Option<Value>,
        jsonrpc_code: i32,
        message: &str,
        error_code: &str,
    ) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(McpError {
                code: jsonrpc_code,
                message: message.to_string(),
                data: Some(serde_json::json!({ "errorCode": error_code })),
            }),
        }
    }
}

/// Tool definition for MCP
#[derive(Debug, Serialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    #[serde(rename = "inputSchema")]
    pub input_schema: Value,
}

/// Handle incoming MCP request
pub async fn handle_request(request: McpRequest) -> McpResponse {
    match request.method.as_str() {
        // MCP initialization
        "initialize" => handle_initialize(request.id),

        // List available tools
        "tools/list" => handle_tools_list(request.id),

        // Call a tool
        "tools/call" => handle_tool_call(request.id, request.params).await,

        // Notifications (no response needed for some)
        "notifications/initialized" => McpResponse::success(request.id, Value::Null),

        // Unknown method
        _ => McpResponse::error_with_id(
            request.id,
            -32601,
            &format!("Method not found: {}", request.method),
        ),
    }
}

fn handle_initialize(id: Option<Value>) -> McpResponse {
    let result = serde_json::json!({
        "protocolVersion": "2024-11-05",
        "capabilities": {
            "tools": {}
        },
        "serverInfo": {
            "name": "leanspec-mcp",
            "version": env!("CARGO_PKG_VERSION")
        }
    });

    McpResponse::success(id, result)
}

fn handle_tools_list(id: Option<Value>) -> McpResponse {
    let tools = tools::get_tool_definitions();

    let result = serde_json::json!({
        "tools": tools
    });

    McpResponse::success(id, result)
}

async fn handle_tool_call(id: Option<Value>, params: Value) -> McpResponse {
    let name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");

    let arguments = params
        .get("arguments")
        .cloned()
        .unwrap_or(Value::Object(serde_json::Map::new()));

    match tools::call_tool(name, arguments).await {
        Ok(result) => {
            let response = serde_json::json!({
                "content": [{
                    "type": "text",
                    "text": result
                }]
            });
            McpResponse::success(id, response)
        }
        Err(e) => {
            // Classify the error to include a structured error code
            let error_code = classify_tool_error(&e);
            McpResponse::error_with_code(id, -32000, &e, error_code)
        }
    }
}

/// Classify a tool error string into a structured error code.
fn classify_tool_error(message: &str) -> &'static str {
    let lower = message.to_lowercase();
    if lower.contains("not found") {
        "SPEC_NOT_FOUND"
    } else if lower.contains("validation") {
        "VALIDATION_FAILED"
    } else if lower.contains("already exists") {
        "INVALID_REQUEST"
    } else if lower.contains("circular") {
        "CIRCULAR_DEPENDENCY"
    } else {
        "INTERNAL_ERROR"
    }
}
