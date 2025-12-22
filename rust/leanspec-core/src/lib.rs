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
//!         println!("Issues in {}: {:?}", spec.path, result.issues);
//!     }
//! }
//! ```

pub mod parsers;
pub mod types;
pub mod utils;
pub mod validators;

// Re-exports for convenience
pub use parsers::FrontmatterParser;
pub use types::{
    CheckboxItem, CompletionVerificationResult, IssueSeverity, LeanSpecConfig, Progress,
    SpecFilterOptions, SpecFrontmatter, SpecInfo, SpecPriority, SpecStatus, StatusTransition,
    ValidationIssue, ValidationResult,
};
pub use utils::{
    CompleteDependencyGraph, DependencyGraph, ImpactRadius, Insights, LoadError, MetadataUpdate,
    SpecLoader, SpecStats, SpecWriter, TemplateError, TemplateLoader, TokenCount, TokenCounter,
    TokenStatus, WriteError,
};
pub use validators::{
    CompletionVerifier, FrontmatterValidator, LineCountValidator, StructureValidator,
};
