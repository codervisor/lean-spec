//! # Platform Adapters
//!
//! The adapter layer is LeanSpec's core abstraction after the pivot described
//! in <https://github.com/codervisor/lean-spec/issues/168>. Each adapter speaks
//! its backend's native language — GitHub Issues, Azure DevOps Work Items,
//! Jira, local markdown files — without forcing the data through a universal
//! LeanSpec schema.
//!
//! ## Model
//!
//! - [`SpecItem`] is the minimum shape a CLI/UI needs to display or edit a
//!   work item: an id, a title, a body, timestamps, a dynamic `metadata` map,
//!   and a list of native [`ItemLink`]s.
//! - [`AdapterCapabilities`] declares what a given adapter supports: which
//!   metadata fields exist, what enum values they accept, what link types it
//!   understands. Consumers that need semantic awareness (a board grouping by
//!   status, for example) look up fields via their [`SemanticHint`] rather
//!   than hard-coding keys.
//! - [`Adapter`] is the trait each backend implements.
//!
//! ## Example
//!
//! ```rust,no_run
//! use leanspec_core::adapters::{AdapterConfig, AdapterRegistry};
//!
//! let config = AdapterConfig::Markdown { directory: "specs".into() };
//! let adapter = AdapterRegistry::create(&config).unwrap();
//! let caps = adapter.capabilities();
//! println!("adapter = {}", caps.name);
//! ```

pub mod markdown;
pub mod registry;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;
use thiserror::Error;
use ts_rs::TS;

/// Errors returned by adapter operations.
#[derive(Debug, Error)]
pub enum AdapterError {
    /// The requested item does not exist on the backend.
    #[error("Item not found: {0}")]
    NotFound(String),

    /// The adapter does not support this operation.
    #[error("Operation not supported by {adapter}: {operation}")]
    NotSupported { adapter: String, operation: String },

    /// Authentication with the backend failed.
    #[error("Authentication failed for {adapter}: {reason}")]
    AuthError { adapter: String, reason: String },

    /// A network or API error talking to the backend.
    #[error("Backend error for {adapter}: {reason}")]
    BackendError { adapter: String, reason: String },

    /// Adapter configuration is invalid or missing.
    #[error("Configuration error: {0}")]
    ConfigError(String),

    /// Metadata did not match the adapter's declared field schema.
    #[error("Invalid metadata for {adapter}: {reason}")]
    InvalidMetadata { adapter: String, reason: String },

    /// A local I/O error (for file-backed adapters).
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    /// A parse error (for file-backed adapters).
    #[error("Parse error at {path}: {reason}")]
    ParseError { path: String, reason: String },
}

/// A value carried in a [`SpecItem`]'s `metadata` map.
///
/// This is deliberately small. The goal is to express arbitrary platform-native
/// fields without invoking JSON's full generality — adapters can stuff anything
/// exotic into [`SpecItem::raw`].
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
#[serde(untagged)]
pub enum MetadataValue {
    Null,
    String(String),
    Bool(bool),
    Number(f64),
    StringList(Vec<String>),
    Timestamp(DateTime<Utc>),
}

impl MetadataValue {
    /// Extract as string if the value is `String`. Other variants return `None`.
    pub fn as_str(&self) -> Option<&str> {
        match self {
            MetadataValue::String(s) => Some(s),
            _ => None,
        }
    }

    /// Extract as list of strings if the value is `StringList`. Other variants
    /// return `None`.
    pub fn as_string_list(&self) -> Option<&[String]> {
        match self {
            MetadataValue::StringList(v) => Some(v),
            _ => None,
        }
    }

    /// Extract as bool if the value is `Bool`.
    pub fn as_bool(&self) -> Option<bool> {
        match self {
            MetadataValue::Bool(b) => Some(*b),
            _ => None,
        }
    }

    /// Extract as timestamp if the value is `Timestamp`.
    pub fn as_timestamp(&self) -> Option<DateTime<Utc>> {
        match self {
            MetadataValue::Timestamp(t) => Some(*t),
            _ => None,
        }
    }
}

impl From<String> for MetadataValue {
    fn from(v: String) -> Self {
        MetadataValue::String(v)
    }
}

impl From<&str> for MetadataValue {
    fn from(v: &str) -> Self {
        MetadataValue::String(v.to_string())
    }
}

impl From<Vec<String>> for MetadataValue {
    fn from(v: Vec<String>) -> Self {
        MetadataValue::StringList(v)
    }
}

impl From<bool> for MetadataValue {
    fn from(v: bool) -> Self {
        MetadataValue::Bool(v)
    }
}

impl From<DateTime<Utc>> for MetadataValue {
    fn from(v: DateTime<Utc>) -> Self {
        MetadataValue::Timestamp(v)
    }
}

/// A relationship between two items, expressed in the adapter's native vocabulary.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct ItemLink {
    /// Adapter-declared link type: `"parent"`, `"child"`, `"depends_on"`,
    /// `"blocks"`, `"closes_issue"`, and so on.
    pub link_type: String,

    /// Native id of the linked item (e.g. `"123-my-spec"`, `"#42"`).
    pub target_id: String,
}

/// The canonical shape for a work item exposed by any adapter.
///
/// Only `id`, `title`, and `body` are universal. Every other field is optional
/// or dynamic. Consumers that need semantic access (the `board` command
/// grouping by status, for instance) should look up the relevant metadata key
/// from [`AdapterCapabilities::field_with_semantic`].
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct SpecItem {
    /// The adapter-native identifier. Markdown adapters use the directory name
    /// (`"001-my-spec"`); GitHub uses the issue number (`"42"`); ADO uses the
    /// work item id.
    pub id: String,

    /// The human-readable title.
    pub title: String,

    /// The primary body/description content, typically markdown.
    pub body: String,

    /// Canonical URL on the backend, if one exists.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,

    /// Adapter-declared metadata. Keys are defined by the adapter's
    /// [`AdapterCapabilities::metadata_fields`].
    #[serde(default)]
    pub metadata: HashMap<String, MetadataValue>,

    /// Native links to other items.
    #[serde(default)]
    pub links: Vec<ItemLink>,

    /// Opaque raw payload from the backend, preserved for adapter-specific
    /// commands that need it. Other adapters ignore this field.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(type = "unknown | null")]
    pub raw: Option<serde_json::Value>,
}

/// Semantic tag that lets generic commands find adapter-specific fields.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
#[serde(rename_all = "snake_case")]
pub enum SemanticHint {
    /// The field that acts as workflow state (markdown: `status`,
    /// GitHub: `state`, ADO: `State`).
    Status,
    /// The field that acts as priority (markdown: `priority`,
    /// ADO: `Priority`).
    Priority,
    /// The field that carries free-form tags/labels.
    Tags,
    /// The field that names the assignee.
    Assignee,
    /// The field that holds the target due date.
    DueDate,
}

/// What kind of data a metadata field accepts.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum MetadataKind {
    /// Free-form single-line text.
    Text,
    /// An enumerated string with a fixed set of allowed values.
    Enum { values: Vec<String> },
    /// A multi-value list of strings (tags/labels).
    StringList,
    /// A boolean flag.
    Bool,
    /// A numeric field.
    Number,
    /// A date/time field.
    Timestamp,
}

/// Declaration of one metadata field an adapter supports.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct MetadataFieldSpec {
    /// The field key as stored in [`SpecItem::metadata`].
    pub key: String,

    /// A short human-readable label.
    pub label: String,

    /// The value shape.
    pub kind: MetadataKind,

    /// Whether the adapter requires this field on create.
    #[serde(default)]
    pub required: bool,

    /// Optional semantic tag that lets generic commands locate the field
    /// without hard-coding `key`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub semantic: Option<SemanticHint>,
}

/// What an adapter can and cannot do, plus the metadata schema it exposes.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct AdapterCapabilities {
    /// Human-readable adapter name — e.g. `"markdown"`, `"github"`, `"ado"`.
    pub name: String,

    /// The adapter supports creating new items.
    pub supports_create: bool,

    /// The adapter supports mutating existing items.
    pub supports_update: bool,

    /// The adapter supports deleting/closing items.
    pub supports_delete: bool,

    /// The adapter supports free-text search.
    pub supports_search: bool,

    /// The adapter tracks real-time change notifications.
    pub supports_webhooks: bool,

    /// The list of metadata fields this adapter declares.
    pub metadata_fields: Vec<MetadataFieldSpec>,

    /// Link types this adapter understands (e.g., `"parent"`, `"depends_on"`).
    pub link_types: Vec<String>,
}

impl AdapterCapabilities {
    /// Find the field a given semantic hint maps to on this adapter, if any.
    pub fn field_with_semantic(&self, hint: SemanticHint) -> Option<&MetadataFieldSpec> {
        self.metadata_fields
            .iter()
            .find(|f| f.semantic == Some(hint))
    }

    /// Get the key for a semantic field, if the adapter exposes one.
    pub fn key_for_semantic(&self, hint: SemanticHint) -> Option<&str> {
        self.field_with_semantic(hint).map(|f| f.key.as_str())
    }
}

/// Filters passed to [`Adapter::list`].
///
/// All metadata filters are free-form: each entry matches items whose metadata
/// at `key` equals one of the listed string values. Adapters that want richer
/// filtering can inspect [`ListFilter::raw`].
#[derive(Debug, Clone, Default)]
pub struct ListFilter {
    /// Metadata equality filters: key → accepted values.
    pub metadata: HashMap<String, Vec<String>>,
    /// Free-text filter applied to title/body.
    pub text: Option<String>,
    /// Include items archived by the backend. Adapters that don't model
    /// archiving ignore this.
    pub include_archived: bool,
    /// Free-form adapter-specific payload (not TS-exported).
    pub raw: Option<serde_json::Value>,
}

// `ListFilter::raw` is not serialized over the wire; TS binding users should
// ignore it. The field is kept so adapter-specific CLI commands can smuggle
// native filter clauses through the generic trait.

/// Request passed to [`Adapter::create`].
#[derive(Debug, Clone, Default)]
pub struct CreateRequest {
    /// Short slug/name used to derive the id on file-based adapters.
    pub slug: Option<String>,
    /// Human-readable title.
    pub title: String,
    /// Body/description content.
    pub body: String,
    /// Metadata values to apply on creation.
    pub metadata: HashMap<String, MetadataValue>,
    /// Links to attach on creation.
    pub links: Vec<ItemLink>,
}

/// Request passed to [`Adapter::update`].
///
/// Every field is optional: `None` means "leave unchanged." Metadata updates
/// are a partial merge — keys present here overwrite, keys missing are kept.
#[derive(Debug, Clone, Default)]
pub struct UpdateRequest {
    pub title: Option<String>,
    pub body: Option<String>,
    pub metadata: HashMap<String, MetadataValue>,
    /// Explicit link set to replace existing links of the given types, or
    /// `None` to leave links untouched. An empty vector clears the link set.
    pub replace_links: Option<Vec<ItemLink>>,
}

/// A search result pointing back to a [`SpecItem`].
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct SearchHit {
    /// Native id of the hit.
    pub id: String,
    /// Score (higher = better match). Adapters that don't rank return 1.0.
    pub score: f32,
    /// Short snippet for display.
    pub snippet: Option<String>,
}

/// Options for [`Adapter::search`].
#[derive(Debug, Clone, Default)]
pub struct SearchOptions {
    pub limit: Option<usize>,
    pub include_body: bool,
}

impl SearchOptions {
    pub fn with_limit(mut self, limit: usize) -> Self {
        self.limit = Some(limit);
        self
    }
}

/// The core adapter trait. Every backend LeanSpec can talk to implements this.
///
/// Implementations are expected to be cheap to clone or share by reference.
/// All methods are synchronous; adapters that need async clients should bridge
/// internally (e.g. with a shared tokio runtime and `block_on`).
pub trait Adapter: Send + Sync {
    /// What this adapter supports, plus its metadata/link vocabulary.
    fn capabilities(&self) -> &AdapterCapabilities;

    /// List items with optional filters.
    fn list(&self, filter: &ListFilter) -> Result<Vec<SpecItem>, AdapterError>;

    /// Fetch a single item by its adapter-native id.
    fn get(&self, id: &str) -> Result<SpecItem, AdapterError>;

    /// Create a new item. Returns the newly-created item with its id populated.
    fn create(&self, req: &CreateRequest) -> Result<SpecItem, AdapterError>;

    /// Update an existing item. Returns the item after the update has been
    /// applied.
    fn update(&self, id: &str, req: &UpdateRequest) -> Result<SpecItem, AdapterError>;

    /// Delete or close an item. The semantics are adapter-specific:
    /// markdown moves the spec to `archived` status; GitHub closes the issue;
    /// ADO transitions the work item to a closed state.
    fn delete(&self, id: &str) -> Result<(), AdapterError>;

    /// Full-text search. Backends that don't support it can return an empty
    /// vector or `NotSupported`.
    fn search(&self, query: &str, opts: &SearchOptions) -> Result<Vec<SearchHit>, AdapterError>;

    /// List the direct links of an item.
    fn get_links(&self, id: &str) -> Result<Vec<ItemLink>, AdapterError> {
        // Default: walk the item's metadata.
        Ok(self.get(id)?.links)
    }
}

impl fmt::Debug for dyn Adapter {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Adapter({})", self.capabilities().name)
    }
}

/// Configuration for selecting and configuring an adapter.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "adapter", rename_all = "lowercase")]
pub enum AdapterConfig {
    /// Local markdown files under a `specs/` directory.
    Markdown {
        #[serde(default = "default_specs_directory")]
        directory: String,
    },
}

fn default_specs_directory() -> String {
    "specs".to_string()
}

impl Default for AdapterConfig {
    fn default() -> Self {
        AdapterConfig::Markdown {
            directory: default_specs_directory(),
        }
    }
}

pub use registry::AdapterRegistry;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn metadata_value_as_str() {
        let v = MetadataValue::from("hello");
        assert_eq!(v.as_str(), Some("hello"));
        let v = MetadataValue::from(vec!["a".to_string()]);
        assert_eq!(v.as_str(), None);
    }

    #[test]
    fn capabilities_field_lookup() {
        let caps = AdapterCapabilities {
            name: "test".into(),
            supports_create: true,
            supports_update: true,
            supports_delete: true,
            supports_search: true,
            supports_webhooks: false,
            metadata_fields: vec![MetadataFieldSpec {
                key: "status".into(),
                label: "Status".into(),
                kind: MetadataKind::Enum {
                    values: vec!["open".into(), "closed".into()],
                },
                required: true,
                semantic: Some(SemanticHint::Status),
            }],
            link_types: vec!["parent".into()],
        };

        assert_eq!(caps.key_for_semantic(SemanticHint::Status), Some("status"));
        assert_eq!(caps.key_for_semantic(SemanticHint::Priority), None);
    }

    #[test]
    fn adapter_config_default_is_markdown() {
        let cfg = AdapterConfig::default();
        match cfg {
            AdapterConfig::Markdown { directory } => assert_eq!(directory, "specs"),
        }
    }
}
