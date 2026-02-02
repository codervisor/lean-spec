//! # LeanSpec Core
//!
//! Core library for LeanSpec - a lightweight spec methodology for AI-powered development.
//!
//! This crate provides platform-agnostic functionality for:
//! - Parsing and manipulating spec frontmatter
//! - Validating spec structure and content
//! - Computing dependency graphs between specs
//! - Token counting for context economy
//! - File system operations for spec management
//!
//! ## Example
//!
//! ```rust,no_run
//! use leanspec_core::{SpecLoader, FrontmatterValidator};
//!
//! // Load all specs from a directory
//! let loader = SpecLoader::new("./specs");
//! let specs = loader.load_all().expect("Failed to load specs");
//!
//! // Validate specs
//! let validator = FrontmatterValidator::new();
//! for spec in &specs {
//!     let result = validator.validate(spec);
//!     if !result.is_valid() {
//!         println!("Errors in {}: {:?}", spec.path, result.errors);
//!     }
//! }
//! ```

pub mod error;
pub mod parsers;
pub mod relationships;
pub mod types;
pub mod utils;
pub mod validators;

#[cfg(any(feature = "sessions", feature = "storage"))]
pub mod db;

#[cfg(feature = "sessions")]
pub mod sessions;

#[cfg(feature = "storage")]
pub mod storage;

#[cfg(feature = "ai")]
pub mod ai;

#[cfg(feature = "ai")]
pub mod ai_native;

// Re-exports for convenience
pub use error::{CoreError, CoreResult};
pub use parsers::FrontmatterParser;
pub use relationships::{
    validate_dependency_addition, validate_parent_assignment, RelationshipError,
};
pub use types::{
    CheckboxItem, CompletionVerificationResult, ErrorSeverity, IncompleteChildSpec, LeanSpecConfig,
    Progress, SpecFilterOptions, SpecFrontmatter, SpecInfo, SpecPriority, SpecStatus,
    StatusTransition, UmbrellaVerificationResult, ValidationError, ValidationResult,
};
pub use utils::{
    global_token_counter, ArchiveError, CompleteDependencyGraph, DependencyGraph,
    DiscoveredProject, DiscoveryError, ImpactRadius, Insights, LoadError, MetadataUpdate,
    ProjectDiscovery, SpecArchiver, SpecLoader, SpecStats, SpecWriter, TemplateError,
    TemplateLoader, TokenCount, TokenCounter, TokenStatus, WriteError,
};
pub use validators::{
    global_frontmatter_validator, global_structure_validator, global_token_count_validator,
    CompletionVerifier, FrontmatterValidator, StructureValidator, TokenCountValidator,
};
