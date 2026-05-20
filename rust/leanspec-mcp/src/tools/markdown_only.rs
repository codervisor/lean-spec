//! Tools that only operate against the markdown adapter.
//!
//! The issue thesis: markdown-style invariants (required frontmatter fields,
//! cross-file dependency graphs, token budgets) don't translate cleanly to
//! GitHub Issues or ADO Work Items. Rather than papering over the mismatch,
//! these tools refuse non-markdown projects with `ADAPTER_NOT_SUPPORTED` and
//! point callers at `get_spec` + `get_schema`.

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use leanspec_core::adapters::ListFilter;
use leanspec_core::model::{semantic, FieldValue, SpecDoc};
use serde_json::{json, Value};

use crate::error::McpToolError;
use crate::protocol::ToolDefinition;
use crate::state::ServerState;

const DEPENDS_ON: &str = "depends_on";
const PARENT: &str = "parent";

pub fn definitions() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "validate_spec".into(),
            description: "Validate a markdown spec against its schema — required fields, \
                          enum values, frontmatter shape. Markdown-only."
                .into(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Spec id to validate. Omit to validate every spec."
                    }
                },
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "get_dependencies".into(),
            description: "Get the dependency graph for a spec — direct dependencies, dependents, \
                          and parent. Markdown-only."
                .into(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Spec id to inspect."
                    }
                },
                "required": ["id"],
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "get_stats".into(),
            description: "Project-wide spec statistics — counts by status, priority, and tags. \
                          Markdown-only."
                .into(),
            input_schema: json!({
                "type": "object",
                "properties": {},
                "additionalProperties": false
            }),
        },
    ]
}

fn require_markdown(state: &ServerState, tool: &str) -> Result<(), McpToolError> {
    if state.is_markdown() {
        return Ok(());
    }
    Err(McpToolError::NotSupported {
        adapter: state.adapter_name().to_string(),
        reason: format!(
            "tool '{tool}' requires a markdown adapter. Use get_spec and get_schema to \
             explore this project's spec structure."
        ),
    })
}

pub fn validate_spec(state: Arc<ServerState>, args: Value) -> Result<Value, McpToolError> {
    require_markdown(&state, "validate_spec")?;
    let adapter = state.adapter();
    let schema = adapter.schema().clone();

    let target_id = args
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let docs: Vec<SpecDoc> = match target_id.as_ref() {
        Some(id) => vec![adapter.get(id)?],
        None => adapter.list(&ListFilter::default())?,
    };

    let mut results: Vec<Value> = Vec::with_capacity(docs.len());
    let mut total_errors = 0usize;

    for doc in &docs {
        let mut errors: Vec<String> = Vec::new();

        for field in &schema.fields {
            if field.required && !doc.fields.contains_key(&field.key) {
                errors.push(format!("missing required field '{}'", field.key));
                continue;
            }
            if let Some(value) = doc.fields.get(&field.key) {
                if let Err(e) = validate_value(&field.kind, value) {
                    errors.push(format!("field '{}': {}", field.key, e));
                }
            }
        }

        total_errors += errors.len();
        results.push(json!({
            "id": doc.id,
            "title": doc.title,
            "valid": errors.is_empty(),
            "errors": errors,
        }));
    }

    Ok(json!({
        "checked": results.len(),
        "valid": total_errors == 0,
        "total_errors": total_errors,
        "results": results,
    }))
}

fn validate_value(
    kind: &leanspec_core::model::FieldKind,
    value: &FieldValue,
) -> Result<(), String> {
    use leanspec_core::model::FieldKind;

    match (kind, value) {
        (FieldKind::Text | FieldKind::LongText, FieldValue::String(_)) => Ok(()),
        (FieldKind::Number, FieldValue::Number(_)) => Ok(()),
        (FieldKind::Bool, FieldValue::Bool(_)) => Ok(()),
        (FieldKind::Timestamp, FieldValue::Timestamp(_)) => Ok(()),
        (
            FieldKind::Enum {
                options,
                allow_custom,
                ..
            },
            FieldValue::Strings(values),
        ) => {
            if *allow_custom || options.is_empty() {
                return Ok(());
            }
            for v in values {
                if !options.iter().any(|o| o.value == *v) {
                    return Err(format!("value '{v}' is not a declared option"));
                }
            }
            Ok(())
        }
        (FieldKind::Checklist { .. }, FieldValue::Checklist(_)) => Ok(()),
        (FieldKind::References { .. }, FieldValue::References(_)) => Ok(()),
        _ => Err("value type does not match field kind".into()),
    }
}

pub fn get_dependencies(state: Arc<ServerState>, args: Value) -> Result<Value, McpToolError> {
    require_markdown(&state, "get_dependencies")?;
    let id = args
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| McpToolError::InvalidRequest("missing required field 'id'".into()))?;

    let adapter = state.adapter();
    let doc = adapter.get(id)?;

    let mut direct_deps: Vec<&str> = Vec::new();
    let mut parent: Option<&str> = None;
    for link in &doc.links {
        match link.link_type.as_str() {
            DEPENDS_ON => direct_deps.push(&link.target_id),
            PARENT => parent = Some(&link.target_id),
            _ => {}
        }
    }

    // Reverse-lookup: which other specs depend on this one?
    let all = adapter.list(&ListFilter::default())?;
    let dependents: Vec<&str> = all
        .iter()
        .filter(|d| {
            d.links
                .iter()
                .any(|l| l.link_type == DEPENDS_ON && l.target_id == id)
        })
        .map(|d| d.id.as_str())
        .collect();

    Ok(json!({
        "id": id,
        "parent": parent,
        "depends_on": direct_deps,
        "dependents": dependents,
    }))
}

pub fn get_stats(state: Arc<ServerState>) -> Result<Value, McpToolError> {
    require_markdown(&state, "get_stats")?;
    let adapter = state.adapter();
    let schema = adapter.schema().clone();

    let docs = adapter.list(&ListFilter {
        include_archived: true,
        ..Default::default()
    })?;

    let status_key = schema.key_for_semantic(semantic::STATUS);
    let priority_key = schema.key_for_semantic(semantic::PRIORITY);
    let tags_key = schema.key_for_semantic(semantic::TAGS);

    let mut by_status: HashMap<String, usize> = HashMap::new();
    let mut by_priority: HashMap<String, usize> = HashMap::new();
    let mut tag_counts: HashMap<String, usize> = HashMap::new();
    let mut unique_tags: HashSet<String> = HashSet::new();

    for doc in &docs {
        if let Some(key) = status_key {
            if let Some(FieldValue::String(s)) = doc.fields.get(key) {
                *by_status.entry(s.clone()).or_default() += 1;
            } else if let Some(FieldValue::Strings(s)) = doc.fields.get(key) {
                if let Some(first) = s.first() {
                    *by_status.entry(first.clone()).or_default() += 1;
                }
            }
        }
        if let Some(key) = priority_key {
            if let Some(FieldValue::String(s)) = doc.fields.get(key) {
                *by_priority.entry(s.clone()).or_default() += 1;
            } else if let Some(FieldValue::Strings(s)) = doc.fields.get(key) {
                if let Some(first) = s.first() {
                    *by_priority.entry(first.clone()).or_default() += 1;
                }
            }
        }
        if let Some(key) = tags_key {
            if let Some(FieldValue::Strings(tags)) = doc.fields.get(key) {
                for t in tags {
                    *tag_counts.entry(t.clone()).or_default() += 1;
                    unique_tags.insert(t.clone());
                }
            }
        }
    }

    Ok(json!({
        "total": docs.len(),
        "by_status": by_status,
        "by_priority": by_priority,
        "tags": tag_counts,
        "unique_tags": unique_tags.len(),
    }))
}
