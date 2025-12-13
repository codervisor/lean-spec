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

pub mod types;
pub mod parsers;
pub mod validators;
pub mod utils;

// Re-exports for convenience
pub use types::{
    SpecInfo, SpecFrontmatter, SpecStatus, SpecPriority, StatusTransition,
    SpecFilterOptions, LeanSpecConfig, ValidationResult, ValidationIssue, IssueSeverity,
};
pub use parsers::FrontmatterParser;
pub use validators::{FrontmatterValidator, StructureValidator, LineCountValidator};
pub use utils::{
    DependencyGraph, CompleteDependencyGraph, ImpactRadius,
    TokenCounter, TokenCount,
    SpecLoader, SpecStats, Insights,
};
