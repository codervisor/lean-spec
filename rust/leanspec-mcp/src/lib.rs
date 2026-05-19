//! # LeanSpec MCP Server
//!
//! Model Context Protocol server for LeanSpec. Adapter-aware — the same set
//! of tools works against markdown projects, GitHub Issues, ADO Work Items,
//! and Jira tickets, with tool input schemas and descriptions generated
//! dynamically from the active adapter's [`SpecSchema`].
//!
//! ## Architecture
//!
//! ```text
//!     main.rs ──► ServerState::from_project()
//!                       │
//!                       └─► AdapterRegistry::from_project()
//!                                   │
//!                                   └─► markdown / github / ado / jira
//!                       (resolved once; cached in Arc<ServerState>)
//!
//! stdio  ─┐
//!         │  JSON-RPC framing (protocol.rs)
//!         ↓
//!     dispatch (lib.rs::handle_request, takes Arc<ServerState>)
//!         ↓
//!     tools::* ──► state.adapter (the already-resolved Box<dyn Adapter>)
//! ```
//!
//! Adapter init is performed once at startup in
//! [`state::ServerState::from_project`] and shared across every tool call
//! via `Arc<ServerState>`. For network-backed schemas, the adapter's
//! `resolve_inline` baking happens during construction so per-call latency
//! stays predictable.

pub mod error;
pub mod protocol;
pub mod schema_to_input;
pub mod state;
pub mod tools;

use std::sync::Arc;

use serde_json::Value;

use crate::error::McpToolError;
use crate::protocol::{McpRequest, McpResponse};
use crate::state::ServerState;

/// Dispatch one MCP request against the shared server state.
pub async fn handle_request(state: Arc<ServerState>, request: McpRequest) -> McpResponse {
    match request.method.as_str() {
        "initialize" => handle_initialize(request.id),
        "tools/list" => handle_tools_list(&state, request.id),
        "tools/call" => handle_tool_call(state, request.id, request.params).await,
        "notifications/initialized" => McpResponse::success(request.id, Value::Null),
        other => McpResponse::error(request.id, -32601, format!("method not found: {other}")),
    }
}

fn handle_initialize(id: Option<Value>) -> McpResponse {
    let result = serde_json::json!({
        "protocolVersion": "2024-11-05",
        "capabilities": { "tools": {} },
        "serverInfo": {
            "name": "leanspec-mcp",
            "version": env!("CARGO_PKG_VERSION"),
        }
    });
    McpResponse::success(id, result)
}

fn handle_tools_list(state: &ServerState, id: Option<Value>) -> McpResponse {
    let definitions = tools::definitions(state);
    McpResponse::success(id, serde_json::json!({ "tools": definitions }))
}

async fn handle_tool_call(
    state: Arc<ServerState>,
    id: Option<Value>,
    params: Value,
) -> McpResponse {
    let name = match params.get("name").and_then(|v| v.as_str()) {
        Some(n) => n.to_string(),
        None => {
            return McpResponse::error_with_code(
                id,
                -32602,
                "missing 'name' in tools/call params",
                McpToolError::InvalidRequest(String::new()).code(),
            );
        }
    };
    let arguments = params
        .get("arguments")
        .cloned()
        .unwrap_or_else(|| Value::Object(serde_json::Map::new()));

    match tools::call(state, &name, arguments).await {
        Ok(result) => {
            // MCP `tools/call` wraps results in a content array — JSON tools
            // return a single text block whose body is the JSON payload.
            let text = serde_json::to_string(&result).unwrap_or_else(|_| "{}".into());
            McpResponse::success(
                id,
                serde_json::json!({
                    "content": [{ "type": "text", "text": text }],
                    "structuredContent": result,
                }),
            )
        }
        Err(err) => {
            let code = err.code();
            let jsonrpc_code = err.jsonrpc_code();
            McpResponse::error_with_code(id, jsonrpc_code, err.to_string(), code)
        }
    }
}
