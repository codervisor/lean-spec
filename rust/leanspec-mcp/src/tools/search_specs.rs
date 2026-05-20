//! `search_specs` — full-text search delegated to the adapter.

use std::sync::Arc;

use leanspec_core::adapters::SearchOptions;
use serde_json::{json, Value};

use crate::error::McpToolError;
use crate::protocol::ToolDefinition;
use crate::state::ServerState;

pub fn definition() -> ToolDefinition {
    ToolDefinition {
        name: "search_specs".into(),
        description: "Full-text search across all specs. Returns ranked hits with optional \
                      content snippets."
            .into(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query string."
                },
                "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "description": "Maximum number of hits to return."
                },
                "include_body": {
                    "type": "boolean",
                    "description": "Include snippets from body content (default false)."
                }
            },
            "required": ["query"],
            "additionalProperties": false
        }),
    }
}

pub fn call(state: Arc<ServerState>, args: Value) -> Result<Value, McpToolError> {
    let query = args
        .get("query")
        .and_then(|v| v.as_str())
        .ok_or_else(|| McpToolError::InvalidRequest("missing required field 'query'".into()))?;
    let limit = args
        .get("limit")
        .and_then(|v| v.as_u64())
        .map(|n| n as usize);
    let include_body = args
        .get("include_body")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let opts = SearchOptions {
        limit,
        include_body,
    };

    let hits = state.adapter().search(query, &opts)?;
    Ok(json!({
        "hits": hits,
        "count": hits.len()
    }))
}
