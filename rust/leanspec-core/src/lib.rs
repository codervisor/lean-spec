//! # LeanSpec Core
//!
//! Core library for the LeanSpec spec-coding framework.
//!
//! The public API is the [`adapters`] module: each adapter speaks its
//! backend's native language (markdown files today; GitHub Issues, Azure
//! DevOps, Jira, Linear in follow-ups) and exposes a uniform [`Adapter`]
//! trait returning [`SpecItem`]s with dynamic, adapter-declared metadata.
//!
//! The other modules ([`parsers`], [`spec_ops`], [`validators`], [`compute`],
//! [`search`], [`relationships`]) are the markdown adapter's internal
//! machinery. They remain addressable for markdown-specific CLI commands
//! (`backfill`, `compact`, `tokens`, …), but the public abstraction that
//! consumers should build against is [`Adapter`].
//!
//! ## Example
//!
//! ```rust,no_run
//! use leanspec_core::adapters::{AdapterRegistry, ListFilter};
//!
//! let adapter = AdapterRegistry::default_adapter();
//! let items = adapter.list(&ListFilter::default()).unwrap();
//! for item in items {
//!     println!("{}: {}", item.id, item.title);
//! }
//! ```

pub mod adapters;
pub mod compute;
pub mod error;
pub mod io;
pub mod parsers;
pub mod relationships;
pub mod search;
pub mod spec_ops;
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
pub use spec_ops::{
    apply_checklist_toggles, apply_replacements, apply_section_updates, preserve_title_heading,
    rebuild_content, split_frontmatter, ArchiveError, ChecklistToggle, ChecklistToggleResult,
    CompleteDependencyGraph, DependencyGraph, ImpactRadius, LoadError, MatchMode, MetadataUpdate,
    Replacement, ReplacementResult, SectionMode, SectionUpdate, SpecArchiver, SpecHierarchyNode,
    SpecLoader, SpecWriter, WriteError,
};
pub use types::{
    CheckboxItem, CompletionVerificationResult, ErrorSeverity, IncompleteChildSpec, LeanSpecConfig,
    Progress, SpecFilterOptions, SpecFrontmatter, SpecInfo, SpecPriority, SpecStatus,
    StatusTransition, UmbrellaVerificationResult, ValidationError, ValidationResult,
};
pub use validators::{
    global_frontmatter_validator, global_structure_validator, global_token_count_validator,
    CompletionVerifier, FrontmatterValidator, StructureValidator, TokenCountValidator,
};

// Re-export search module
pub use search::{
    find_content_snippet, parse_query, parse_query_terms, search_specs, search_specs_with_options,
    validate_search_query, SearchOptions, SearchQueryError, SearchResult,
};

// Re-export adapter types — the new public abstraction after the pivot
// described in https://github.com/codervisor/lean-spec/issues/168.
//
// Note: `SearchOptions` is exposed twice in the codebase — a legacy
// markdown-specific one in `search::SearchOptions` and the adapter-level one.
// The adapter version is re-exported under `AdapterSearchOptions` to keep the
// two disambiguated while both exist during the pivot.
pub use adapters::{
    Adapter, AdapterCapabilities, AdapterConfig, AdapterError, AdapterRegistry, CreateRequest,
    ItemLink, ListFilter, MetadataFieldSpec, MetadataKind, MetadataValue, SearchHit,
    SearchOptions as AdapterSearchOptions, SemanticHint, SpecItem, UpdateRequest,
};
