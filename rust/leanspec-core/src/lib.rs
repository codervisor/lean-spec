//! # LeanSpec Core
//!
//! Core library for LeanSpec — a spec coding framework for AI-powered development.
//!
//! - **Provider abstraction** (`SpecProvider` trait) for pluggable spec backends
//! - Parsing and manipulating spec frontmatter
//! - Validating spec structure and content
//! - Computing dependency graphs between specs
//! - Token counting for context economy
//! - File system operations for spec management
//!
//! Currently supports markdown files as the default backend. Platform adapters
//! (GitHub, ADO, Jira) are planned — see:
//! <https://github.com/codervisor/lean-spec/issues/168>
//!
//! ## Example
//!
//! ```rust,no_run
//! use leanspec_core::{SpecLoader, FrontmatterValidator};
//!
//! let loader = SpecLoader::new("./specs");
//! let specs = loader.load_all().expect("Failed to load specs");
//!
//! let validator = FrontmatterValidator::new();
//! for spec in &specs {
//!     let result = validator.validate(spec);
//!     if !result.is_valid() {
//!         println!("Errors in {}: {:?}", spec.path, result.errors);
//!     }
//! }
//! ```

pub mod compute;
pub mod error;
pub mod io;
pub mod parsers;
pub mod providers;
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

// Re-export provider types
pub use providers::registry::ProviderRegistry;
pub use providers::{
    CreateSpecRequest, ProviderCapabilities, ProviderConfig, ProviderError, SpecProvider,
    UpdateSpecRequest,
};
