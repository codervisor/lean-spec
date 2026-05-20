//! `create_spec` — adapter-aware spec creation.
//!
//! Field values are typed against the adapter's schema: enum fields validate
//! against declared options, boolean/number kinds reject mismatched JSON
//! types. The adapter performs the actual write; markdown writes a new
//! directory + frontmatter, GitHub opens an issue, etc.

use std::collections::HashMap;
use std::sync::Arc;

use leanspec_core::model::{CreateRequest, FieldKind, FieldValue, SpecSchema};
use serde_json::Value;

use crate::error::McpToolError;
use crate::protocol::ToolDefinition;
use crate::schema_to_input::create_input_schema;
use crate::state::ServerState;

use super::doc_to_json;

pub fn definition(schema: &SpecSchema) -> ToolDefinition {
    ToolDefinition {
        name: "create_spec".into(),
        description: "Create a new spec. Field keys follow the active adapter's schema — \
                      call get_schema first to discover them. Returns the created SpecDoc."
            .into(),
        input_schema: create_input_schema(schema),
    }
}

pub fn call(state: Arc<ServerState>, args: Value) -> Result<Value, McpToolError> {
    let adapter = state.adapter();
    let schema = adapter.schema().clone();

    let title = args
        .get("title")
        .and_then(|v| v.as_str())
        .ok_or_else(|| McpToolError::InvalidRequest("missing required field 'title'".into()))?
        .to_string();

    let mut fields: HashMap<String, FieldValue> = HashMap::new();
    if let Value::Object(map) = &args {
        for (key, value) in map {
            if matches!(key.as_str(), "title" | "slug" | "schema_id") {
                continue;
            }
            let field_def = schema.field(key).ok_or_else(|| {
                McpToolError::Validation(format!("unknown field '{key}' on schema '{}'", schema.id))
            })?;
            let parsed = json_to_field_value(&field_def.kind, value)
                .map_err(|reason| McpToolError::Validation(format!("field '{key}': {reason}")))?;
            if let Some(v) = parsed {
                fields.insert(key.clone(), v);
            }
        }
    }

    let req = CreateRequest {
        slug: args
            .get("slug")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        title,
        schema_id: args
            .get("schema_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        fields,
        links: vec![],
    };

    let doc = adapter.create(&req)?;
    doc_to_json(&doc)
}

/// Convert a JSON value into a `FieldValue` consistent with the field's
/// declared kind. Returns `Ok(None)` for explicit JSON `null` so callers can
/// signal "leave unset" without using the schema's required-field gate.
pub(super) fn json_to_field_value(
    kind: &FieldKind,
    value: &Value,
) -> Result<Option<FieldValue>, String> {
    if value.is_null() {
        return Ok(None);
    }

    let v = match kind {
        FieldKind::Text | FieldKind::LongText => value
            .as_str()
            .map(|s| FieldValue::String(s.to_string()))
            .ok_or("expected string")?,
        FieldKind::Number => value
            .as_f64()
            .map(FieldValue::Number)
            .ok_or("expected number")?,
        FieldKind::Bool => value
            .as_bool()
            .map(FieldValue::Bool)
            .ok_or("expected boolean")?,
        FieldKind::Timestamp => {
            let s = value.as_str().ok_or("expected RFC 3339 timestamp string")?;
            let dt = chrono::DateTime::parse_from_rfc3339(s)
                .map_err(|e| format!("invalid timestamp: {e}"))?;
            FieldValue::Timestamp(dt.with_timezone(&chrono::Utc))
        }
        FieldKind::Enum {
            options,
            multi,
            allow_custom,
            ..
        } => {
            let strings: Vec<String> = match value {
                Value::String(s) => vec![s.clone()],
                Value::Array(arr) => arr
                    .iter()
                    .map(|v| {
                        v.as_str()
                            .map(|s| s.to_string())
                            .ok_or_else(|| "expected string".to_string())
                    })
                    .collect::<Result<Vec<_>, _>>()?,
                _ => return Err("expected string or array of strings".into()),
            };
            if !*multi && strings.len() > 1 {
                return Err("single-select field accepts only one value".into());
            }
            if !*allow_custom && !options.is_empty() {
                for s in &strings {
                    if !options.iter().any(|o| o.value == *s) {
                        let allowed: Vec<&str> = options.iter().map(|o| o.value.as_str()).collect();
                        return Err(format!(
                            "value '{s}' is not in allowed set [{}]",
                            allowed.join(", ")
                        ));
                    }
                }
            }
            FieldValue::Strings(strings)
        }
        FieldKind::Checklist { .. } => {
            let arr = value
                .as_array()
                .ok_or("expected array of {text, checked} items")?;
            let items: Result<Vec<_>, String> = arr
                .iter()
                .map(|v| {
                    let text = v
                        .get("text")
                        .and_then(|t| t.as_str())
                        .ok_or_else(|| "checklist item missing 'text'".to_string())?
                        .to_string();
                    let checked = v.get("checked").and_then(|c| c.as_bool()).unwrap_or(false);
                    Ok(leanspec_core::model::CompletableItem {
                        id: None,
                        ref_id: None,
                        text,
                        checked,
                    })
                })
                .collect();
            FieldValue::Checklist(items?)
        }
        FieldKind::References { multi } => {
            let refs: Vec<leanspec_core::model::Reference> = if *multi {
                let arr = value.as_array().ok_or("expected array of reference ids")?;
                arr.iter()
                    .map(|v| {
                        v.as_str()
                            .map(leanspec_core::model::Reference::id)
                            .ok_or_else(|| "expected string id".to_string())
                    })
                    .collect::<Result<Vec<_>, _>>()?
            } else {
                let s = value.as_str().ok_or("expected string id")?;
                vec![leanspec_core::model::Reference::id(s)]
            };
            FieldValue::References(refs)
        }
    };

    Ok(Some(v))
}

#[cfg(test)]
mod tests {
    use super::*;
    use leanspec_core::model::{EnumOption, FieldKind};
    use serde_json::json;

    #[test]
    fn enum_rejects_unknown_value() {
        let kind = FieldKind::Enum {
            options: vec![EnumOption::simple("open", "Open")],
            multi: false,
            allow_custom: false,
            dynamic: false,
        };
        let err = json_to_field_value(&kind, &json!("invalid")).unwrap_err();
        assert!(err.contains("not in allowed set"));
    }

    #[test]
    fn enum_allows_custom_when_flag_set() {
        let kind = FieldKind::Enum {
            options: vec![EnumOption::simple("open", "Open")],
            multi: false,
            allow_custom: true,
            dynamic: false,
        };
        let v = json_to_field_value(&kind, &json!("custom")).unwrap();
        assert!(matches!(v, Some(FieldValue::Strings(_))));
    }

    #[test]
    fn null_returns_none() {
        let kind = FieldKind::Text;
        let v = json_to_field_value(&kind, &json!(null)).unwrap();
        assert!(v.is_none());
    }
}
