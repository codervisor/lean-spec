//! Core spec model — the shared vocabulary for the LeanSpec type system.
//!
//! ## Layers
//!
//! ```text
//! ┌─ Rust primitives ─────────────────────────────────────────────────┐
//! │  FieldKind · FieldValue · FieldDisplay                            │
//! │  EnumOption · Reference · CompletableItem                         │
//! └───────────────────────────────────────────────────────────────────┘
//!          ↓ composed into
//! ┌─ Schema layer ────────────────────────────────────────────────────┐
//! │  FieldDef · LinkTypeDef · SpecSchema                              │
//! │  Loaded from built-in YAML bundles + team .leanspec/schemas/      │
//! └───────────────────────────────────────────────────────────────────┘
//!          ↓ values validated against
//! ┌─ Document layer ──────────────────────────────────────────────────┐
//! │  SpecDoc · ItemLink · UpdateRequest · CreateRequest               │
//! └───────────────────────────────────────────────────────────────────┘
//! ```

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

/// Well-known semantic keys for locating fields without hard-coding
/// adapter-specific field names.
///
/// This is an open set — teams can define their own semantics in YAML schema
/// bundles. The constants here are the LeanSpec standard vocabulary.
pub mod semantic {
    pub const STATUS: &str = "status";
    pub const PRIORITY: &str = "priority";
    pub const TAGS: &str = "tags";
    pub const ASSIGNEE: &str = "assignee";
    pub const REVIEWER: &str = "reviewer";
    pub const DUE_DATE: &str = "due_date";
    pub const SUMMARY: &str = "summary";
    pub const ACCEPTANCE: &str = "acceptance";
    pub const NOTES: &str = "notes";
}

// ── Primitives ────────────────────────────────────────────────────────────────

/// Rich option for an [`Enum`](FieldKind::Enum) field.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct EnumOption {
    /// Machine-stable identifier stored in `SpecDoc::fields`.
    pub value: String,
    /// Human-readable label.
    pub label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

impl EnumOption {
    pub fn simple(value: impl Into<String>, label: impl Into<String>) -> Self {
        Self {
            value: value.into(),
            label: label.into(),
            color: None,
            icon: None,
            description: None,
        }
    }

    pub fn with_color(mut self, color: impl Into<String>) -> Self {
        self.color = Some(color.into());
        self
    }
}

/// A typed reference to another spec item or external resource.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct Reference {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

impl Reference {
    pub fn id(id: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            title: None,
            url: None,
        }
    }
}

/// One item in a checklist or criterion list.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct CompletableItem {
    /// Stable id for traced criteria; `None` for plain checklist items.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    /// Reference to a Duhem verification descriptor (traced mode only).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ref_id: Option<String>,
    pub text: String,
    pub checked: bool,
}

impl CompletableItem {
    pub fn unchecked(text: impl Into<String>) -> Self {
        Self {
            id: None,
            ref_id: None,
            text: text.into(),
            checked: false,
        }
    }
}

/// Where a field is rendered in the UI.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "snake_case")]
pub enum FieldDisplay {
    /// Rendered in the metadata panel / sidebar.
    #[default]
    Inline,
    /// Rendered as a full-height body section.
    Section,
}

/// The primitive type of a field's value.
///
/// Carries no semantic meaning — semantics live in [`FieldDef::semantic`] and
/// in YAML schema bundles. This is the Rust type vocabulary, kept minimal so
/// new field shapes can be added without changing the enum.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum FieldKind {
    /// Short single-line string.
    Text,
    /// Multi-line markdown content (use with `display: Section`).
    LongText,
    Number,
    Bool,
    Timestamp,
    /// Single or multi-select from an option list.
    Enum {
        /// Static options defined in the schema.
        #[serde(default)]
        options: Vec<EnumOption>,
        /// `true` → multi-select, `false` → single-select.
        #[serde(default)]
        multi: bool,
        /// Allows values outside `options` (free-form labels / tags).
        #[serde(default)]
        allow_custom: bool,
        /// Options are resolved at runtime via `Adapter::resolve_schema`.
        #[serde(default)]
        dynamic: bool,
    },
    /// An ordered list of completable items.
    Checklist {
        /// Items carry stable `id` and `ref_id` linking to Duhem VDs.
        #[serde(default)]
        traced: bool,
    },
    /// One or more references to other spec items.
    References {
        #[serde(default)]
        multi: bool,
    },
}

/// A field value stored inside a [`SpecDoc`].
///
/// [`FieldValue::Strings`] covers single-select (len 1), multi-select (len N),
/// and free-form string lists (tags). There is no `Null` variant: an absent
/// key in [`SpecDoc::fields`] means the field is not set. Use
/// [`UpdateRequest::clear`] to explicitly remove a field.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
#[serde(tag = "kind", content = "value", rename_all = "snake_case")]
pub enum FieldValue {
    String(String),
    Number(f64),
    Bool(bool),
    Timestamp(DateTime<Utc>),
    /// Enum selections and free-form string lists.
    Strings(Vec<String>),
    Checklist(Vec<CompletableItem>),
    References(Vec<Reference>),
}

impl FieldValue {
    pub fn as_str(&self) -> Option<&str> {
        match self {
            FieldValue::String(s) => Some(s),
            _ => None,
        }
    }

    pub fn as_strings(&self) -> Option<&[String]> {
        match self {
            FieldValue::Strings(v) => Some(v),
            _ => None,
        }
    }

    pub fn as_bool(&self) -> Option<bool> {
        match self {
            FieldValue::Bool(b) => Some(*b),
            _ => None,
        }
    }

    pub fn as_timestamp(&self) -> Option<DateTime<Utc>> {
        match self {
            FieldValue::Timestamp(t) => Some(*t),
            _ => None,
        }
    }
}

impl From<String> for FieldValue {
    fn from(v: String) -> Self {
        FieldValue::String(v)
    }
}

impl From<&str> for FieldValue {
    fn from(v: &str) -> Self {
        FieldValue::String(v.to_string())
    }
}

impl From<bool> for FieldValue {
    fn from(v: bool) -> Self {
        FieldValue::Bool(v)
    }
}

impl From<f64> for FieldValue {
    fn from(v: f64) -> Self {
        FieldValue::Number(v)
    }
}

impl From<DateTime<Utc>> for FieldValue {
    fn from(v: DateTime<Utc>) -> Self {
        FieldValue::Timestamp(v)
    }
}

impl From<Vec<String>> for FieldValue {
    fn from(v: Vec<String>) -> Self {
        FieldValue::Strings(v)
    }
}

// ── Schema layer ──────────────────────────────────────────────────────────────

/// Declaration of one field in a [`SpecSchema`].
///
/// Covers both metadata panel fields (`display: Inline`) and body sections
/// (`display: Section`). There is no separate `SectionDef` — the two concepts
/// are unified here.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct FieldDef {
    /// Machine-stable key — matches a key in [`SpecDoc::fields`].
    pub key: String,
    pub label: String,
    pub kind: FieldKind,
    #[serde(default)]
    pub display: FieldDisplay,
    #[serde(default)]
    pub required: bool,
    /// Open semantic tag. Use constants from the [`semantic`] module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub semantic: Option<String>,
    /// Hint for AI field-filling — describes what should go in this field.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ai_hint: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub placeholder: Option<String>,
}

/// A directed or undirected link type between spec items.
///
/// Directedness is inferred: `inverse_key.is_some()` ⇒ directed.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct LinkTypeDef {
    pub key: String,
    pub label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inverse_key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inverse_label: Option<String>,
}

impl LinkTypeDef {
    pub fn is_directed(&self) -> bool {
        self.inverse_key.is_some()
    }
}

/// A complete spec schema: field declarations and link types.
///
/// Schemas are identified by string keys (`"leanspec:feature"`, `"acme:epic"`)
/// and loaded from built-in YAML bundles or team `.leanspec/schemas/` files.
/// Use `extends` to inherit and override a parent schema.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct SpecSchema {
    /// Stable identifier, e.g. `"leanspec:feature"`.
    pub id: String,
    pub name: String,
    /// Parent schema id for `extends`-based inheritance (write only the delta).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extends: Option<String>,
    /// All fields in display order.
    pub fields: Vec<FieldDef>,
    #[serde(default)]
    pub link_types: Vec<LinkTypeDef>,
}

impl SpecSchema {
    pub fn field(&self, key: &str) -> Option<&FieldDef> {
        self.fields.iter().find(|f| f.key == key)
    }

    pub fn field_with_semantic(&self, semantic: &str) -> Option<&FieldDef> {
        self.fields
            .iter()
            .find(|f| f.semantic.as_deref() == Some(semantic))
    }

    pub fn key_for_semantic(&self, semantic: &str) -> Option<&str> {
        self.field_with_semantic(semantic).map(|f| f.key.as_str())
    }
}

// ── Document layer ────────────────────────────────────────────────────────────

/// A relationship between two spec items.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct ItemLink {
    /// Link type key as declared in [`SpecSchema::link_types`].
    pub link_type: String,
    /// Adapter-native id of the linked item.
    pub target_id: String,
    /// Cached title of the target (populated at read time, not stored on disk).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_title: Option<String>,
}

/// The canonical document type returned by any adapter.
///
/// Both metadata panel fields and body sections live in `fields`, keyed by
/// their [`FieldDef::key`]. There is no separate `body` string.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct SpecDoc {
    /// Adapter-native identifier.
    pub id: String,
    pub title: String,
    /// Schema id this document conforms to.
    pub schema_id: String,
    /// All field values, keyed by [`FieldDef::key`].
    #[serde(default)]
    pub fields: HashMap<String, FieldValue>,
    #[serde(default)]
    pub links: Vec<ItemLink>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(type = "unknown | null")]
    pub raw: Option<serde_json::Value>,
}

impl SpecDoc {
    pub fn field(&self, key: &str) -> Option<&FieldValue> {
        self.fields.get(key)
    }

    pub fn field_str(&self, key: &str) -> Option<&str> {
        self.fields.get(key)?.as_str()
    }
}

/// Request to create a new spec document.
#[derive(Debug, Clone, Default)]
pub struct CreateRequest {
    /// Slug hint for file-based adapters.
    pub slug: Option<String>,
    pub title: String,
    /// Schema id to use; `None` uses the adapter's default schema.
    pub schema_id: Option<String>,
    pub fields: HashMap<String, FieldValue>,
    pub links: Vec<ItemLink>,
}

/// Request to partially update a spec document.
///
/// `None` title means "leave unchanged". Field updates merge: present keys
/// overwrite, absent keys are kept. Use `clear` to explicitly remove fields.
#[derive(Debug, Clone, Default)]
pub struct UpdateRequest {
    pub title: Option<String>,
    /// Fields to merge into the document.
    pub fields: HashMap<String, FieldValue>,
    /// Field keys to explicitly clear (remove from document).
    pub clear: Vec<String>,
    /// If `Some`, replaces all links; `None` leaves links untouched.
    pub replace_links: Option<Vec<ItemLink>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn field_value_conversions() {
        let v = FieldValue::from("hello");
        assert_eq!(v.as_str(), Some("hello"));

        let v = FieldValue::from(vec!["a".to_string(), "b".to_string()]);
        assert_eq!(
            v.as_strings(),
            Some(&["a".to_string(), "b".to_string()][..])
        );
        assert_eq!(v.as_str(), None);

        let v = FieldValue::from(true);
        assert_eq!(v.as_bool(), Some(true));
    }

    #[test]
    fn spec_schema_lookups() {
        let schema = SpecSchema {
            id: "test:schema".into(),
            name: "Test".into(),
            extends: None,
            fields: vec![
                FieldDef {
                    key: "status".into(),
                    label: "Status".into(),
                    kind: FieldKind::Enum {
                        options: vec![EnumOption::simple("open", "Open")],
                        multi: false,
                        allow_custom: false,
                        dynamic: false,
                    },
                    display: FieldDisplay::Inline,
                    required: true,
                    semantic: Some(semantic::STATUS.to_string()),
                    ai_hint: None,
                    placeholder: None,
                },
                FieldDef {
                    key: "summary".into(),
                    label: "Summary".into(),
                    kind: FieldKind::LongText,
                    display: FieldDisplay::Section,
                    required: false,
                    semantic: Some(semantic::SUMMARY.to_string()),
                    ai_hint: Some("Describe the feature".into()),
                    placeholder: None,
                },
            ],
            link_types: vec![LinkTypeDef {
                key: "parent".into(),
                label: "Parent".into(),
                inverse_key: Some("child".into()),
                inverse_label: Some("Child".into()),
            }],
        };

        assert_eq!(schema.key_for_semantic(semantic::STATUS), Some("status"));
        assert_eq!(schema.key_for_semantic(semantic::PRIORITY), None);
        assert!(schema.field("summary").is_some());
        assert!(schema.link_types[0].is_directed());
    }

    #[test]
    fn spec_doc_field_helpers() {
        let mut fields = HashMap::new();
        fields.insert("status".into(), FieldValue::from("planned"));
        let doc = SpecDoc {
            id: "001-test".into(),
            title: "Test".into(),
            schema_id: "leanspec:base".into(),
            fields,
            links: vec![],
            created_at: None,
            updated_at: None,
            url: None,
            raw: None,
        };
        assert_eq!(doc.field_str("status"), Some("planned"));
        assert!(doc.field("missing").is_none());
    }

    #[test]
    fn completable_item_constructor() {
        let item = CompletableItem::unchecked("Ship the feature");
        assert_eq!(item.text, "Ship the feature");
        assert!(!item.checked);
        assert!(item.id.is_none());
        assert!(item.ref_id.is_none());
    }

    #[test]
    fn link_type_directedness() {
        let directed = LinkTypeDef {
            key: "depends_on".into(),
            label: "Depends on".into(),
            inverse_key: Some("blocked_by".into()),
            inverse_label: Some("Blocked by".into()),
        };
        assert!(directed.is_directed());

        let undirected = LinkTypeDef {
            key: "related_to".into(),
            label: "Related to".into(),
            inverse_key: None,
            inverse_label: None,
        };
        assert!(!undirected.is_directed());
    }
}
