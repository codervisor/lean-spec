//! # Platform Adapters
//!
//! The adapter layer is LeanSpec's core abstraction. Each adapter speaks its
//! backend's native language — GitHub Issues, Azure DevOps Work Items, Jira,
//! local markdown files — without forcing the data through a universal schema.
//!
//! ## Model
//!
//! - [`SpecDoc`] is the canonical document shape: an id, a title, a schema id,
//!   a `fields` map (covering both metadata and body sections), and [`ItemLink`]s.
//! - [`SpecSchema`] declares the vocabulary: which fields exist, what enum
//!   options they accept, what link types the adapter understands.
//! - [`AdapterCapabilities`] declares operational support flags and the default
//!   schema id for this adapter.
//! - [`Adapter`] is the trait each backend implements.

#[cfg(feature = "ado")]
pub mod ado;
pub mod cache;
#[cfg(feature = "github")]
pub mod github;
pub mod jira;
pub mod markdown;
pub mod registry;

#[cfg(any(test, feature = "test-utils"))]
pub mod test_harness;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;
use thiserror::Error;
use ts_rs::TS;

// Re-export model types so callers can import them from either
// `leanspec_core::model` or `leanspec_core::adapters`.
pub use crate::model::{
    semantic, CompletableItem, CreateRequest, EnumOption, FieldDef, FieldDisplay, FieldKind,
    FieldValue, ItemLink, LinkTypeDef, Reference, SpecDoc, SpecSchema, UpdateRequest,
};

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

    /// Field value did not match the adapter's declared schema.
    #[error("Invalid field for {adapter}: {reason}")]
    InvalidField { adapter: String, reason: String },

    /// The backend rejected the request because a rate limit has been hit.
    ///
    /// `reset_at` is the moment the limit window resets. `None` if the backend
    /// did not advertise a reset time. Adapters do not retry internally — the
    /// caller decides how to back off.
    #[error("Rate limit hit for {adapter}; resets at {}", reset_at.map(|t| t.to_rfc3339()).unwrap_or_else(|| "unknown".into()))]
    RateLimit {
        adapter: String,
        reset_at: Option<DateTime<Utc>>,
    },

    /// A local I/O error (for file-backed adapters).
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    /// A parse error (for file-backed adapters).
    #[error("Parse error at {path}: {reason}")]
    ParseError { path: String, reason: String },
}

/// Operational capabilities of an adapter plus its default schema reference.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct AdapterCapabilities {
    /// Human-readable adapter name, e.g. `"markdown"`, `"github"`, `"ado"`.
    pub name: String,
    pub supports_create: bool,
    pub supports_update: bool,
    pub supports_delete: bool,
    pub supports_search: bool,
    pub supports_webhooks: bool,
    /// The schema id documents returned by this adapter conform to by default.
    pub default_schema: String,
}

/// Filters passed to [`Adapter::list`].
#[derive(Debug, Clone, Default)]
pub struct ListFilter {
    /// Field equality filters: key → accepted string values.
    pub fields: HashMap<String, Vec<String>>,
    /// Free-text filter applied to title and body content.
    pub text: Option<String>,
    /// Include items archived by the backend.
    pub include_archived: bool,
    /// Free-form adapter-specific payload (not serialised).
    pub raw: Option<serde_json::Value>,
}

/// A search result pointing back to a [`SpecDoc`].
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct SearchHit {
    pub id: String,
    pub score: f32,
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

/// Open adapter configuration — `adapter` selects the backend, `settings` is
/// forwarded to the concrete adapter's constructor.
///
/// This replaces the old closed `AdapterConfig` enum so that external adapters
/// can be registered without modifying `leanspec-core`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdapterConfig {
    pub adapter: String,
    #[serde(default)]
    pub settings: serde_json::Value,
    /// Optional schema id (from the [`SchemaRegistry`]) that documents
    /// produced by this adapter conform to. When unset, the adapter uses
    /// its own built-in default schema.
    ///
    /// [`SchemaRegistry`]: crate::schema_registry::SchemaRegistry
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema_id: Option<String>,
}

impl Default for AdapterConfig {
    fn default() -> Self {
        Self {
            adapter: "markdown".to_string(),
            settings: serde_json::json!({ "directory": "specs" }),
            schema_id: None,
        }
    }
}

/// The core adapter trait. Every backend LeanSpec can talk to implements this.
pub trait Adapter: Send + Sync {
    /// Operational capabilities and default schema id.
    fn capabilities(&self) -> &AdapterCapabilities;

    /// The schema documents returned by this adapter conform to.
    fn schema(&self) -> &SpecSchema;

    /// Populate dynamic enum options into a schema (called once at startup).
    ///
    /// Adapters with static schemas (like markdown) use the default no-op.
    /// Adapters backed by GitHub/ADO/Jira can fetch live option lists here.
    fn resolve_schema(&self, _schema: &mut SpecSchema) -> Result<(), AdapterError> {
        Ok(())
    }

    fn list(&self, filter: &ListFilter) -> Result<Vec<SpecDoc>, AdapterError>;
    fn get(&self, id: &str) -> Result<SpecDoc, AdapterError>;
    fn create(&self, req: &CreateRequest) -> Result<SpecDoc, AdapterError>;
    fn update(&self, id: &str, req: &UpdateRequest) -> Result<SpecDoc, AdapterError>;
    fn delete(&self, id: &str) -> Result<(), AdapterError>;
    fn search(&self, query: &str, opts: &SearchOptions) -> Result<Vec<SearchHit>, AdapterError>;

    fn get_links(&self, id: &str) -> Result<Vec<ItemLink>, AdapterError> {
        Ok(self.get(id)?.links)
    }
}

impl fmt::Debug for dyn Adapter {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Adapter({})", self.capabilities().name)
    }
}

pub use cache::{AdapterCache, DEFAULT_TTL as ADAPTER_CACHE_DEFAULT_TTL};
pub use registry::AdapterRegistry;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adapter_config_default_is_markdown() {
        let cfg = AdapterConfig::default();
        assert_eq!(cfg.adapter, "markdown");
        assert_eq!(
            cfg.settings.get("directory").and_then(|v| v.as_str()),
            Some("specs")
        );
    }

    #[test]
    fn spec_schema_field_lookup() {
        let schema = SpecSchema {
            id: "test:schema".into(),
            name: "Test".into(),
            extends: None,
            fields: vec![FieldDef {
                key: "status".into(),
                label: "Status".into(),
                kind: FieldKind::Enum {
                    options: vec![],
                    multi: false,
                    allow_custom: false,
                    dynamic: false,
                },
                display: FieldDisplay::Inline,
                required: true,
                semantic: Some(semantic::STATUS.to_string()),
                ai_hint: None,
                placeholder: None,
            }],
            link_types: vec![],
        };

        assert_eq!(schema.key_for_semantic(semantic::STATUS), Some("status"));
        assert_eq!(schema.key_for_semantic(semantic::PRIORITY), None);
        assert!(schema.field("status").is_some());
    }

    #[test]
    fn field_value_helpers() {
        let v = FieldValue::from("hello");
        assert_eq!(v.as_str(), Some("hello"));

        let v = FieldValue::from(vec!["a".to_string()]);
        assert_eq!(v.as_strings(), Some(&["a".to_string()][..]));
        assert_eq!(v.as_str(), None);
    }

    #[test]
    fn link_type_def_directedness() {
        let directed = LinkTypeDef {
            key: "parent".into(),
            label: "Parent".into(),
            inverse_key: Some("child".into()),
            inverse_label: Some("Child".into()),
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
