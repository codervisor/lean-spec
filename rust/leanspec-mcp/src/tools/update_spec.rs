//! `update_spec` — partial update against the active adapter.
//!
//! Field mutations follow merge semantics: keys present in the request
//! overwrite, keys absent are kept. JSON `null` clears the field
//! (translated to [`UpdateRequest::clear`]).

use std::collections::HashMap;
use std::sync::Arc;

use leanspec_core::model::{FieldValue, SpecSchema, UpdateRequest};
use serde_json::Value;

use crate::error::McpToolError;
use crate::protocol::ToolDefinition;
use crate::schema_to_input::update_input_schema;
use crate::state::ServerState;

use super::create_spec::json_to_field_value;
use super::doc_to_json;

pub fn definition(schema: &SpecSchema) -> ToolDefinition {
    ToolDefinition {
        name: "update_spec".into(),
        description: "Update an existing spec. Only the fields included in the request are \
                      changed; pass JSON null to clear a field. Returns the updated SpecDoc."
            .into(),
        input_schema: update_input_schema(schema),
    }
}

pub fn call(state: Arc<ServerState>, args: Value) -> Result<Value, McpToolError> {
    let adapter = state.adapter();
    let schema = adapter.schema().clone();

    let id = args
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| McpToolError::InvalidRequest("missing required field 'id'".into()))?
        .to_string();
    let title = args
        .get("title")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let mut fields: HashMap<String, FieldValue> = HashMap::new();
    let mut clear: Vec<String> = Vec::new();

    if let Value::Object(map) = &args {
        for (key, value) in map {
            if matches!(key.as_str(), "id" | "title") {
                continue;
            }
            let field_def = schema.field(key).ok_or_else(|| {
                McpToolError::Validation(format!("unknown field '{key}' on schema '{}'", schema.id))
            })?;
            if value.is_null() {
                clear.push(key.clone());
                continue;
            }
            let parsed = json_to_field_value(&field_def.kind, value)
                .map_err(|reason| McpToolError::Validation(format!("field '{key}': {reason}")))?;
            if let Some(v) = parsed {
                fields.insert(key.clone(), v);
            }
        }
    }

    let req = UpdateRequest {
        title,
        fields,
        clear,
        replace_links: None,
    };

    let doc = adapter.update(&id, &req)?;
    doc_to_json(&doc)
}
