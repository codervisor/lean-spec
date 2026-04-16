//! # Spec Providers
//!
//! This module defines the `SpecProvider` trait, the core abstraction for spec
//! backends. Currently supports markdown files as the default provider.
//!
//! Platform adapters (GitHub Issues, ADO Work Items, Jira, etc.) will be added
//! as part of the adapter framework pivot — see:
//! <https://github.com/codervisor/lean-spec/issues/168>
//!
//! ## Usage
//!
//! ```rust,no_run
//! use leanspec_core::{ProviderRegistry, ProviderConfig};
//!
//! let config = ProviderConfig::Markdown { directory: "specs".into() };
//! let provider = ProviderRegistry::create(&config).unwrap();
//!
//! let specs = provider.list(&Default::default()).unwrap();
//! ```

pub mod markdown;
pub mod registry;

use crate::search::{SearchOptions, SearchResult};
use crate::spec_ops::DependencyGraph;
use crate::types::{SpecFilterOptions, SpecInfo, SpecPriority, SpecStatus};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;
use thiserror::Error;

/// Errors that can occur in spec provider operations.
#[derive(Debug, Error)]
pub enum ProviderError {
    /// The requested spec was not found.
    #[error("Spec not found: {0}")]
    NotFound(String),

    /// The operation is not supported by this provider.
    #[error("Operation not supported by {provider}: {operation}")]
    NotSupported { provider: String, operation: String },

    /// Authentication failed for the external service.
    #[error("Authentication failed for {provider}: {reason}")]
    AuthError { provider: String, reason: String },

    /// Network or API error communicating with the backend.
    #[error("Backend error for {provider}: {reason}")]
    BackendError { provider: String, reason: String },

    /// Configuration is invalid or missing.
    #[error("Configuration error: {0}")]
    ConfigError(String),

    /// I/O error (for file-based providers).
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    /// Parse error (for file-based providers).
    #[error("Parse error at {path}: {reason}")]
    ParseError { path: String, reason: String },
}

/// What a provider can and cannot do.
///
/// Not every backend supports every operation. For example, a read-only GitHub
/// integration might not support `create` or `update`. The framework uses this
/// to gracefully degrade and show appropriate error messages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCapabilities {
    /// Can create new specs.
    pub create: bool,
    /// Can update existing specs.
    pub update: bool,
    /// Can delete/archive specs.
    pub delete: bool,
    /// Supports full-text search.
    pub search: bool,
    /// Supports dependency graph tracking.
    pub dependencies: bool,
    /// Supports custom/extended fields.
    pub custom_fields: bool,
    /// Supports real-time change notifications.
    pub webhooks: bool,
    /// Supports writing changes back to the backend.
    pub bidirectional_sync: bool,
}

impl ProviderCapabilities {
    /// Full capabilities — all core operations supported (e.g., markdown provider).
    pub fn full() -> Self {
        Self {
            create: true,
            update: true,
            delete: true,
            search: true,
            dependencies: true,
            custom_fields: false, // Not yet wired through CreateSpecRequest/UpdateSpecRequest
            webhooks: false,
            bidirectional_sync: true,
        }
    }

    /// Read-only capabilities — listing and reading only.
    pub fn read_only() -> Self {
        Self {
            create: false,
            update: false,
            delete: false,
            search: true,
            dependencies: false,
            custom_fields: false,
            webhooks: false,
            bidirectional_sync: false,
        }
    }
}

/// Request to create a new spec.
#[derive(Debug, Clone)]
pub struct CreateSpecRequest {
    /// Spec name/slug (e.g., "my-feature").
    pub name: String,
    /// Human-readable title.
    pub title: String,
    /// Initial status.
    pub status: SpecStatus,
    /// Priority level.
    pub priority: Option<SpecPriority>,
    /// Tags/labels.
    pub tags: Vec<String>,
    /// Initial body content (markdown).
    pub content: String,
    /// Assignee identifier.
    pub assignee: Option<String>,
    /// Parent spec ID (for sub-specs / epics).
    pub parent: Option<String>,
    /// Dependency IDs.
    pub depends_on: Vec<String>,
    /// Custom/extended fields.
    pub custom: HashMap<String, String>,
}

/// Request to update an existing spec.
#[derive(Debug, Clone, Default)]
pub struct UpdateSpecRequest {
    /// New title (None = no change).
    pub title: Option<String>,
    /// New status (None = no change).
    pub status: Option<SpecStatus>,
    /// New priority (None = no change).
    pub priority: Option<SpecPriority>,
    /// New tags (None = no change).
    pub tags: Option<Vec<String>>,
    /// New body content (None = no change).
    pub content: Option<String>,
    /// New assignee (None = no change).
    pub assignee: Option<String>,
    /// New parent (None = no change).
    pub parent: Option<String>,
    /// New dependencies (None = no change).
    pub depends_on: Option<Vec<String>>,
    /// Custom field updates.
    pub custom: HashMap<String, String>,
}

/// The core abstraction for spec backends.
///
/// Implement this trait to connect LeanSpec to any spec source: GitHub Issues,
/// Azure DevOps Work Items, Jira, Linear, or custom systems.
///
/// All methods are synchronous to keep the initial implementation simple and
/// compatible with the existing codebase. Providers that talk to remote APIs
/// can use blocking HTTP clients internally (the CLI and MCP server already
/// use tokio, so providers can be called from `spawn_blocking` as needed).
pub trait SpecProvider: Send + Sync {
    /// Human-readable name of this provider (e.g., "markdown", "github", "ado").
    fn name(&self) -> &str;

    /// What this provider can and cannot do.
    fn capabilities(&self) -> ProviderCapabilities;

    /// List all specs, optionally filtered.
    fn list(&self, filters: &SpecFilterOptions) -> Result<Vec<SpecInfo>, ProviderError>;

    /// Get a single spec by its ID.
    ///
    /// The ID format is provider-specific:
    /// - Markdown: directory name (e.g., "001-my-feature")
    /// - GitHub: issue number (e.g., "42")
    /// - ADO: work item ID (e.g., "12345")
    fn get(&self, id: &str) -> Result<SpecInfo, ProviderError>;

    /// Create a new spec.
    fn create(&self, request: &CreateSpecRequest) -> Result<SpecInfo, ProviderError>;

    /// Update an existing spec.
    fn update(&self, id: &str, request: &UpdateSpecRequest) -> Result<SpecInfo, ProviderError>;

    /// Search specs by query string.
    fn search(
        &self,
        query: &str,
        options: &SearchOptions,
    ) -> Result<Vec<SearchResult>, ProviderError>;

    /// Archive/delete a spec.
    ///
    /// The semantics are provider-specific:
    /// - Markdown: sets status to `archived`
    /// - GitHub: closes the issue
    /// - ADO: transitions work item to Closed
    ///
    /// Returns `ProviderError::NotSupported` if the backend doesn't support deletion.
    fn delete(&self, id: &str) -> Result<(), ProviderError>;

    /// Get the dependency graph for a spec.
    ///
    /// Returns `ProviderError::NotSupported` if the backend doesn't track dependencies.
    fn dependencies(&self, id: &str) -> Result<DependencyGraph, ProviderError>;
}

impl fmt::Debug for dyn SpecProvider {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SpecProvider({})", self.name())
    }
}

/// Configuration for selecting and configuring a provider.
///
/// Currently only supports the Markdown provider. Platform adapters (GitHub,
/// ADO, Jira, etc.) will be added as part of the adapter framework pivot.
/// See: https://github.com/codervisor/lean-spec/issues/168
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "provider", rename_all = "lowercase")]
pub enum ProviderConfig {
    /// Local markdown files in a `specs/` directory (default, current behavior).
    Markdown {
        /// Path to the specs directory (default: "specs").
        #[serde(default = "default_specs_directory")]
        directory: String,
    },
}

fn default_specs_directory() -> String {
    "specs".to_string()
}

impl Default for ProviderConfig {
    fn default() -> Self {
        ProviderConfig::Markdown {
            directory: default_specs_directory(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_config_default_is_markdown() {
        let config = ProviderConfig::default();
        match config {
            ProviderConfig::Markdown { directory } => {
                assert_eq!(directory, "specs");
            }
        }
    }

    #[test]
    fn test_capabilities_full() {
        let caps = ProviderCapabilities::full();
        assert!(caps.create);
        assert!(caps.update);
        assert!(caps.delete);
        assert!(caps.search);
        assert!(caps.dependencies);
    }

    #[test]
    fn test_capabilities_read_only() {
        let caps = ProviderCapabilities::read_only();
        assert!(!caps.create);
        assert!(!caps.update);
        assert!(!caps.delete);
        assert!(caps.search);
    }
}
