//! Translate the active [`SpecSchema`] into JSON Schema fragments used in
//! `tools/list` `inputSchema` payloads.
//!
//! This is what makes the MCP server adapter-agnostic: tool input shapes
//! follow the adapter's declared fields, including enum value constraints
//! and AI hints, rather than hard-coding markdown-specific field names.

use leanspec_core::model::{FieldDef, FieldKind, SpecSchema};
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
/// other fields optional.
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
        properties.insert(prop.key, prop.schema);
    }

    json!({
        "type": "object",
        "properties": properties,
        "required": ["id"],
        "additionalProperties": false
    })
}

/// Build the `inputSchema` for `list_specs`: filter fields are taken from
/// the schema (each accepts an array of strings).
pub fn list_input_schema(schema: &SpecSchema) -> Value {
    let mut properties = Map::new();

    for field in &schema.fields {
        if matches!(field.kind, FieldKind::Enum { .. }) {
            let mut item_prop = Map::new();
            item_prop.insert("type".into(), json!("string"));
            if let FieldKind::Enum {
                options,
                allow_custom,
                ..
            } = &field.kind
            {
                if !options.is_empty() && !*allow_custom {
                    item_prop.insert(
                        "enum".into(),
                        json!(options.iter().map(|o| o.value.clone()).collect::<Vec<_>>()),
                    );
                }
            }
            let description = format!("Filter by {} (one or more values).", field.label);
            properties.insert(
                field.key.clone(),
                json!({
                    "type": "array",
                    "items": Value::Object(item_prop),
                    "description": description
                }),
            );
        }
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

    json!({
        "type": "object",
        "properties": properties,
        "additionalProperties": false
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
}
