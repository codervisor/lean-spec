//! `get_spec` — fetch a single spec by id.

use std::sync::Arc;

use serde_json::{json, Value};

use crate::error::McpToolError;
use crate::protocol::ToolDefinition;
use crate::state::ServerState;

use super::doc_to_json;

pub fn definition() -> ToolDefinition {
    ToolDefinition {
        name: "get_spec".into(),
        description: "Get a single spec by its adapter-native identifier. Returns the full \
                      SpecDoc (id, title, schema_id, fields, links)."
            .into(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "Adapter-native identifier. For markdown projects this is \
                                    typically the directory name (e.g. '042-my-feature'); for \
                                    GitHub this is the issue number as a string."
                }
            },
            "required": ["id"],
            "additionalProperties": false
        }),
    }
}

pub fn call(state: Arc<ServerState>, args: Value) -> Result<Value, McpToolError> {
    let id = args
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| McpToolError::InvalidRequest("missing required field 'id'".into()))?;
    let doc = state.adapter().get(id)?;
    doc_to_json(&doc)
}
