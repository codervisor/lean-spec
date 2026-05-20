//! # LeanSpec Core
//!
//! Core library for the LeanSpec spec-coding framework.
//!
//! ## Public API layers
//!
//! - **Model layer** ([`model`]): the schema-driven type system — [`SpecDoc`],
//!   [`FieldValue`], [`FieldDef`], [`SpecSchema`], and friends.
//! - **Adapter layer** ([`adapters`]): each adapter speaks its backend's native
//!   language (markdown files, GitHub Issues, ADO Work Items, Jira) and exposes
//!   a uniform [`Adapter`] trait returning [`SpecDoc`]s.
//!
//! Markdown-specific internals (loader, writer, archiver, types, dependency
//! graph) live in [`adapters::markdown`] and are not re-exported from the crate
//! root. Markdown-only CLI commands reach them via the typed adapter handle.
//!
//! ## Example
//!
//! ```rust,no_run
//! use leanspec_core::adapters::{AdapterRegistry, ListFilter};
//!
//! let adapter = AdapterRegistry::default_adapter();
//! let docs = adapter.list(&ListFilter::default()).unwrap();
//! for doc in docs {
//!     println!("{}: {}", doc.id, doc.title);
//! }
//! ```

pub mod adapters;
pub mod compute;
pub mod error;
pub mod io;
pub mod model;
pub mod parsers;
pub mod relationships;
pub mod schema_registry;
pub mod search;
pub mod types;
pub mod validators;

#[cfg(feature = "storage")]
pub mod storage;

#[cfg(feature = "git")]
pub mod git;

// Re-exports for convenience
pub use compute::{
    global_token_counter, Insights, SpecStats, TokenCount, TokenCounter, TokenStatus,
};
pub use error::{CoreError, CoreResult, ErrorCode, StructuredError};
pub use io::{
    hash_content, DiscoveredProject, DiscoveryError, ProjectDiscovery, TemplateError,
    TemplateLoader,
};
pub use parsers::FrontmatterParser;
pub use relationships::{
    validate_dependency_addition, validate_parent_assignment,
    validate_parent_assignment_with_index, RelationshipError,
};
pub use search::{
    find_content_snippet, parse_query, parse_query_terms, search_specs, search_specs_with_options,
    validate_search_query, SearchOptions, SearchQueryError, SearchResult,
};
// Pure string utilities used by HTTP handlers in the fetch-transform-push
// pattern. They live inside the markdown adapter module but operate purely
// on `&str` and so are part of the generic crate API.
pub use adapters::markdown::content::{
    apply_checklist_toggles, apply_replacements, apply_section_updates, preserve_title_heading,
    rebuild_content, split_frontmatter, ChecklistToggle, ChecklistToggleResult, MatchMode,
    Replacement, ReplacementResult, SectionMode, SectionUpdate,
};
pub use types::{
    CheckboxItem, CompletionVerificationResult, ErrorSeverity, IncompleteChildSpec, LeanSpecConfig,
    Progress, UmbrellaVerificationResult, ValidationError, ValidationResult,
};
pub use validators::{
    global_frontmatter_validator, global_structure_validator, global_token_count_validator,
    CompletionVerifier, FrontmatterValidator, StructureValidator, TokenCountValidator,
};

// Model layer — the new schema-driven public abstraction.
pub use model::{
    semantic, CompletableItem, CreateRequest, EnumOption, FieldDef, FieldDisplay, FieldKind,
    FieldValue, ItemLink, LinkTypeDef, Reference, SpecDoc, SpecSchema, UpdateRequest,
};

// Schema registry — built-in + custom YAML schema bundles.
pub use schema_registry::{
    validate_schema_file, SchemaError, SchemaRegistry, ValidationIssue, BUILTIN_PREFIX,
};

// Adapter layer — the backend abstraction.
//
// Note: `SearchOptions` is present in both `search` (legacy markdown-specific)
// and `adapters` (adapter-level). The adapter version is re-exported under
// `AdapterSearchOptions` to keep the two distinct during the transition.
pub use adapters::{
    Adapter, AdapterCapabilities, AdapterConfig, AdapterError, AdapterRegistry, ListFilter,
    SearchHit, SearchOptions as AdapterSearchOptions,
};
