//! `get_capabilities` — adapter name, supported operations, schema id.

use std::sync::Arc;

use serde_json::Value;

use crate::error::McpToolError;
use crate::protocol::ToolDefinition;
use crate::state::ServerState;

pub fn definition() -> ToolDefinition {
    ToolDefinition {
        name: "get_capabilities".into(),
        description: "Return the active adapter's capabilities — name, supported operations \
                      (create/update/delete/search), and default schema id."
            .into(),
        input_schema: serde_json::json!({
            "type": "object",
            "properties": {},
            "additionalProperties": false
        }),
    }
}

pub fn call(state: Arc<ServerState>) -> Result<Value, McpToolError> {
    serde_json::to_value(state.adapter().capabilities())
        .map_err(|e| McpToolError::Internal(e.to_string()))
}
