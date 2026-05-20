//! `get_schema` — return the active adapter's [`SpecSchema`].
//!
//! Agents call this at the start of a session to discover available fields,
//! enum options, and AI hints for the active backend.

use std::sync::Arc;

use serde_json::Value;

use crate::error::McpToolError;
use crate::protocol::ToolDefinition;
use crate::state::ServerState;

pub fn definition() -> ToolDefinition {
    ToolDefinition {
        name: "get_schema".into(),
        description: "Return the active adapter's spec schema — field definitions, enum \
                      options, AI hints, and link types. Call this once per session to \
                      discover the vocabulary the project uses."
            .into(),
        input_schema: serde_json::json!({
            "type": "object",
            "properties": {},
            "additionalProperties": false
        }),
    }
}

pub fn call(state: Arc<ServerState>) -> Result<Value, McpToolError> {
    serde_json::to_value(state.adapter().schema())
        .map_err(|e| McpToolError::Internal(e.to_string()))
}
