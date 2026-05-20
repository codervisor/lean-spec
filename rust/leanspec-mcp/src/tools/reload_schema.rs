//! `reload_schema` — drop the cached adapter and re-resolve from project config.
//!
//! Long-running MCP sessions bake the adapter's enriched schema once on
//! startup. When the backing vocabulary changes mid-session — a new GitHub
//! label, a renamed Jira status — agents would otherwise have to restart the
//! server to see it. `reload_schema` forces an immediate re-resolution and
//! returns the freshly-baked schema so the caller can decide whether to
//! re-prompt the user / update any cached field lists.

use std::sync::Arc;

use serde_json::{json, Value};

use crate::error::McpToolError;
use crate::protocol::ToolDefinition;
use crate::state::ServerState;

pub fn definition() -> ToolDefinition {
    ToolDefinition {
        name: "reload_schema".into(),
        description: "Re-resolve the active adapter's schema from project config, replacing \
                      the cached instance. Use after the backing vocabulary changes (new \
                      GitHub label, renamed Jira status) without restarting the server. \
                      Returns the fresh schema and adapter name."
            .into(),
        input_schema: json!({
            "type": "object",
            "properties": {},
            "additionalProperties": false
        }),
    }
}

pub fn call(state: Arc<ServerState>) -> Result<Value, McpToolError> {
    let adapter = state.reload_adapter()?;
    let schema = serde_json::to_value(adapter.schema())
        .map_err(|e| McpToolError::Internal(e.to_string()))?;
    Ok(json!({
        "adapter": adapter.capabilities().name,
        "schema": schema,
    }))
}
