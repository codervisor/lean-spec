//! `list_specs` — adapter-aware spec listing with semantic filter mapping.
//!
//! The tool input is a flat `{field_key: [values...]}` map that mirrors the
//! adapter's schema. Callers that don't know specific field keys can use the
//! convenience aliases `status`, `priority`, `tags`, `assignee` — we map
//! those through the schema's semantic hints, so the same input works
//! across markdown, GitHub, ADO, and Jira projects.

use std::collections::HashMap;
use std::sync::Arc;

use leanspec_core::adapters::ListFilter;
use leanspec_core::model::semantic;
use serde_json::{json, Value};

use crate::error::McpToolError;
use crate::protocol::ToolDefinition;
use crate::schema_to_input::list_input_schema;
use crate::state::ServerState;

use super::doc_to_json;

/// Aliases callers may use without knowing the active adapter's field keys.
/// Each maps to a semantic that resolves to a real key via the schema.
const SEMANTIC_ALIASES: &[(&str, &str)] = &[
    ("status", semantic::STATUS),
    ("priority", semantic::PRIORITY),
    ("tags", semantic::TAGS),
    ("assignee", semantic::ASSIGNEE),
    ("reviewer", semantic::REVIEWER),
];

pub fn definition(schema: &leanspec_core::SpecSchema) -> ToolDefinition {
    ToolDefinition {
        name: "list_specs".into(),
        description: "List specs with optional filters. Filter keys can be either the \
                      adapter's field keys or the aliases status / priority / tags / \
                      assignee. Returns an array of SpecDoc objects."
            .into(),
        input_schema: list_input_schema(schema),
    }
}

pub fn call(state: Arc<ServerState>, args: Value) -> Result<Value, McpToolError> {
    let adapter = state.adapter();
    let schema = adapter.schema().clone();

    let mut fields: HashMap<String, Vec<String>> = HashMap::new();

    if let Value::Object(map) = &args {
        for (key, value) in map {
            // Reserved keys handled below.
            if matches!(key.as_str(), "text" | "include_archived" | "limit") {
                continue;
            }

            // Translate aliases through the schema's semantic hints.
            let resolved_key = SEMANTIC_ALIASES
                .iter()
                .find(|(alias, _)| *alias == key)
                .and_then(|(_, sem)| schema.key_for_semantic(sem))
                .map(|s| s.to_string())
                .unwrap_or_else(|| key.to_string());

            let values = match value {
                Value::String(s) => vec![s.clone()],
                Value::Array(arr) => arr
                    .iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect(),
                _ => continue,
            };

            if values.is_empty() {
                continue;
            }
            fields.insert(resolved_key, values);
        }
    }

    let text = args
        .get("text")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let include_archived = args
        .get("include_archived")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let limit = args
        .get("limit")
        .and_then(|v| v.as_u64())
        .map(|n| n as usize);

    let filter = ListFilter {
        fields,
        text,
        include_archived,
        raw: None,
    };

    let mut docs = adapter.list(&filter)?;
    if let Some(n) = limit {
        docs.truncate(n);
    }

    let serialised: Vec<Value> = docs
        .iter()
        .map(doc_to_json)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(json!({
        "specs": serialised,
        "count": serialised.len()
    }))
}
