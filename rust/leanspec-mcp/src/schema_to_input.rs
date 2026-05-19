//! Translate the active [`SpecSchema`] into JSON Schema fragments used in
//! `tools/list` `inputSchema` payloads.
//!
//! This is what makes the MCP server adapter-agnostic: tool input shapes
//! follow the adapter's declared fields, including enum value constraints
//! and AI hints, rather than hard-coding markdown-specific field names.

use leanspec_core::model::{semantic, FieldDef, FieldKind, SpecSchema};
use serde_json::{json, Map, Value};

/// JSON Schema property + a flag indicating whether the field is required.
pub struct FieldProperty {
    pub key: String,
    pub schema: Value,
    pub required: bool,
}

/// Build a JSON Schema property fragment for one schema field.
///
/// Falls back to a permissive `string` when the field kind has no obvious
/// JSON Schema mapping — callers downstream do real validation through the
/// adapter, so the wire-level schema is a hint, not a hard contract.
pub fn field_to_property(field: &FieldDef) -> FieldProperty {
    let mut prop = Map::new();

    match &field.kind {
        FieldKind::Text => {
            prop.insert("type".into(), json!("string"));
        }
        FieldKind::LongText => {
            prop.insert("type".into(), json!("string"));
        }
        FieldKind::Number => {
            prop.insert("type".into(), json!("number"));
        }
        FieldKind::Bool => {
            prop.insert("type".into(), json!("boolean"));
        }
        FieldKind::Timestamp => {
            prop.insert("type".into(), json!("string"));
            prop.insert("format".into(), json!("date-time"));
        }
        FieldKind::Enum {
            options,
            multi,
            allow_custom,
            ..
        } => {
            let values: Vec<String> = options.iter().map(|o| o.value.clone()).collect();
            if *multi {
                prop.insert("type".into(), json!("array"));
                let mut items = Map::new();
                items.insert("type".into(), json!("string"));
                if !values.is_empty() && !*allow_custom {
                    items.insert("enum".into(), json!(values));
                }
                prop.insert("items".into(), Value::Object(items));
            } else {
                prop.insert("type".into(), json!("string"));
                if !values.is_empty() && !*allow_custom {
                    prop.insert("enum".into(), json!(values));
                }
            }
        }
        FieldKind::Checklist { .. } => {
            prop.insert("type".into(), json!("array"));
            let items = json!({
                "type": "object",
                "properties": {
                    "text": { "type": "string" },
                    "checked": { "type": "boolean" }
                },
                "required": ["text"]
            });
            prop.insert("items".into(), items);
        }
        FieldKind::References { multi } => {
            if *multi {
                prop.insert("type".into(), json!("array"));
                prop.insert("items".into(), json!({ "type": "string" }));
            } else {
                prop.insert("type".into(), json!("string"));
            }
        }
    }

    // ai_hint wins over label for the JSON Schema `description` — that's
    // what the field exists for. Fall back to label so something useful
    // always shows up in tool catalog UIs.
    let description = field.ai_hint.clone().unwrap_or_else(|| field.label.clone());
    prop.insert("description".into(), json!(description));

    FieldProperty {
        key: field.key.clone(),
        schema: Value::Object(prop),
        required: field.required,
    }
}

/// Build the `inputSchema` object for `create_spec`: title (required) plus
/// all writable fields from the schema.
pub fn create_input_schema(schema: &SpecSchema) -> Value {
    let mut properties = Map::new();
    let mut required: Vec<String> = vec!["title".into()];

    properties.insert(
        "title".into(),
        json!({
            "type": "string",
            "description": "Spec title — short, action-oriented summary."
        }),
    );

    for field in &schema.fields {
        if field.key == "title" {
            continue;
        }
        let prop = field_to_property(field);
        if prop.required {
            required.push(prop.key.clone());
        }
        properties.insert(prop.key, prop.schema);
    }

    json!({
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": false
    })
}

/// Build the `inputSchema` object for `update_spec`: id required, all
/// other fields optional. Field properties are wrapped to also accept JSON
/// `null` so callers can explicitly clear a field — `update_spec::call`
/// translates `null` into [`UpdateRequest::clear`].
pub fn update_input_schema(schema: &SpecSchema) -> Value {
    let mut properties = Map::new();

    properties.insert(
        "id".into(),
        json!({
            "type": "string",
            "description": "Adapter-native identifier of the spec to update."
        }),
    );
    properties.insert(
        "title".into(),
        json!({
            "type": "string",
            "description": "New title. Omit to leave unchanged."
        }),
    );

    for field in &schema.fields {
        if field.key == "title" || field.key == "id" {
            continue;
        }
        let prop = field_to_property(field);
        properties.insert(prop.key, allow_null(prop.schema));
    }

    json!({
        "type": "object",
        "properties": properties,
        "required": ["id"],
        "additionalProperties": false
    })
}

/// Build the `inputSchema` for `list_specs`.
///
/// Field filters accept either a single string or an array of strings, so
/// the schema models each filter as a `oneOf` of those two shapes (with
/// enum values applied where the schema declares them). Both semantic
/// aliases (`status`, `priority`, `tags`, `assignee`, `reviewer`) and the
/// adapter's actual field keys are exposed so callers can pick whichever
/// vocabulary they already know.
pub fn list_input_schema(schema: &SpecSchema) -> Value {
    let mut properties = Map::new();
    let mut seen_keys: std::collections::HashSet<String> = std::collections::HashSet::new();

    for (alias, sem) in SEMANTIC_ALIASES {
        if let Some(field) = schema.field_with_semantic(sem) {
            let prop = filter_value_schema(
                field,
                &format!("Filter by {} (semantic alias).", field.label),
            );
            properties.insert((*alias).to_string(), prop);
            seen_keys.insert((*alias).to_string());
        }
    }

    for field in &schema.fields {
        if seen_keys.contains(&field.key) {
            continue;
        }
        let prop = filter_value_schema(
            field,
            &format!("Filter by {} (one value or an array).", field.label),
        );
        properties.insert(field.key.clone(), prop);
        seen_keys.insert(field.key.clone());
    }

    properties.insert(
        "text".into(),
        json!({
            "type": "string",
            "description": "Free-text filter applied to title and body content."
        }),
    );
    properties.insert(
        "include_archived".into(),
        json!({
            "type": "boolean",
            "description": "Include archived specs in the result (default false)."
        }),
    );
    properties.insert(
        "limit".into(),
        json!({
            "type": "integer",
            "minimum": 1,
            "description": "Maximum number of specs to return."
        }),
    );

    // Adapter-specific field keys not declared on the active schema are
    // still forwarded by `list_specs::call`, so accept any extra key whose
    // value is string or array of strings.
    let extras = json!({
        "oneOf": [
            { "type": "string" },
            { "type": "array", "items": { "type": "string" } }
        ]
    });

    json!({
        "type": "object",
        "properties": properties,
        "additionalProperties": extras
    })
}

/// Aliases recognised by `list_specs::call`. Keep in sync with that file —
/// the two are paired but live apart to avoid a cycle.
const SEMANTIC_ALIASES: &[(&str, &str)] = &[
    ("status", semantic::STATUS),
    ("priority", semantic::PRIORITY),
    ("tags", semantic::TAGS),
    ("assignee", semantic::ASSIGNEE),
    ("reviewer", semantic::REVIEWER),
];

/// JSON Schema for a `list_specs` filter slot: a single value or an array
/// of values, with enum constraints honoured for enum-typed fields.
fn filter_value_schema(field: &FieldDef, description: &str) -> Value {
    let (single, multi) = if let FieldKind::Enum {
        options,
        allow_custom,
        ..
    } = &field.kind
    {
        if !options.is_empty() && !*allow_custom {
            let values: Vec<String> = options.iter().map(|o| o.value.clone()).collect();
            (
                json!({ "type": "string", "enum": values }),
                json!({ "type": "array", "items": { "type": "string", "enum": values } }),
            )
        } else {
            (
                json!({ "type": "string" }),
                json!({ "type": "array", "items": { "type": "string" } }),
            )
        }
    } else {
        (
            json!({ "type": "string" }),
            json!({ "type": "array", "items": { "type": "string" } }),
        )
    };

    json!({
        "oneOf": [single, multi],
        "description": description,
    })
}

/// Wrap a JSON Schema fragment so it also accepts an explicit `null`. Used
/// by `update_spec` field properties where `null` means "clear this field".
fn allow_null(prop: Value) -> Value {
    json!({
        "oneOf": [prop, { "type": "null" }]
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use leanspec_core::model::{EnumOption, FieldDef, FieldDisplay, FieldKind};

    fn schema_with_status() -> SpecSchema {
        SpecSchema {
            id: "test:s".into(),
            name: "test".into(),
            extends: None,
            fields: vec![
                FieldDef {
                    key: "status".into(),
                    label: "Status".into(),
                    kind: FieldKind::Enum {
                        options: vec![
                            EnumOption::simple("open", "Open"),
                            EnumOption::simple("closed", "Closed"),
                        ],
                        multi: false,
                        allow_custom: false,
                        dynamic: false,
                    },
                    display: FieldDisplay::Inline,
                    required: true,
                    semantic: Some("status".into()),
                    ai_hint: Some("Current state. Use 'open' for active work.".into()),
                    placeholder: None,
                },
                FieldDef {
                    key: "tags".into(),
                    label: "Tags".into(),
                    kind: FieldKind::Enum {
                        options: vec![],
                        multi: true,
                        allow_custom: true,
                        dynamic: false,
                    },
                    display: FieldDisplay::Inline,
                    required: false,
                    semantic: Some("tags".into()),
                    ai_hint: None,
                    placeholder: None,
                },
            ],
            link_types: vec![],
        }
    }

    #[test]
    fn create_schema_includes_enum_constraint() {
        let schema = schema_with_status();
        let v = create_input_schema(&schema);
        let status = v
            .pointer("/properties/status")
            .expect("status property missing");
        assert_eq!(status["type"], "string");
        assert_eq!(status["enum"], serde_json::json!(["open", "closed"]));
        assert_eq!(
            status["description"],
            "Current state. Use 'open' for active work."
        );
        let required = v["required"].as_array().unwrap();
        assert!(required.iter().any(|v| v == "title"));
        assert!(required.iter().any(|v| v == "status"));
    }

    #[test]
    fn update_schema_marks_only_id_required() {
        let schema = schema_with_status();
        let v = update_input_schema(&schema);
        let required = v["required"].as_array().unwrap();
        assert_eq!(required.len(), 1);
        assert_eq!(required[0], "id");
    }

    #[test]
    fn update_schema_allows_null_for_clearing_fields() {
        let schema = schema_with_status();
        let v = update_input_schema(&schema);
        let status = v
            .pointer("/properties/status")
            .expect("status property missing");
        let one_of = status["oneOf"].as_array().expect("status uses oneOf");
        assert!(
            one_of.iter().any(|s| s["type"] == "null"),
            "update_spec must accept null for status: {status}"
        );
    }

    #[test]
    fn multi_enum_becomes_array_without_enum_when_custom_allowed() {
        let schema = schema_with_status();
        let v = create_input_schema(&schema);
        let tags = v
            .pointer("/properties/tags")
            .expect("tags property missing");
        assert_eq!(tags["type"], "array");
        // allow_custom + empty options → no enum constraint
        assert!(tags["items"].get("enum").is_none());
    }

    #[test]
    fn list_schema_exposes_semantic_aliases_and_string_or_array() {
        let schema = schema_with_status();
        let v = list_input_schema(&schema);
        // `status` alias is present (matches the schema's STATUS semantic).
        let status = v
            .pointer("/properties/status")
            .expect("status alias property");
        let one_of = status["oneOf"].as_array().expect("status uses oneOf");
        // Must accept both a single string and an array of strings.
        assert!(one_of.iter().any(|s| s["type"] == "string"));
        assert!(one_of.iter().any(|s| s["type"] == "array"));
    }

    #[test]
    fn list_schema_accepts_extra_filter_keys() {
        let schema = schema_with_status();
        let v = list_input_schema(&schema);
        let extras = v
            .get("additionalProperties")
            .and_then(|e| e.get("oneOf"))
            .expect("additionalProperties.oneOf must be defined");
        assert!(extras
            .as_array()
            .unwrap()
            .iter()
            .any(|s| s["type"] == "string"));
    }
}
