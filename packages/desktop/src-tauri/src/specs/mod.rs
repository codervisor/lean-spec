//! Spec operations library for LeanSpec Desktop
//!
//! This module provides Rust implementations of spec operations
//! that replace the Node.js/TypeScript API routes.

pub mod commands;
pub mod constants;
pub mod frontmatter;
pub mod reader;
pub mod stats;
pub mod dependencies;
pub mod validation;

// Re-export main types
pub use frontmatter::{Frontmatter, parse_frontmatter};
pub use reader::{Spec, SpecReader, LightweightSpec};
pub use stats::{StatsResult, calculate_stats};
pub use dependencies::{DependencyGraph, DependencyNode, DependencyEdge, build_dependency_graph};
pub use validation::{ValidationResult, ValidationIssue, validate_spec, validate_all_specs};

// Re-export commands
pub use commands::{
    get_specs,
    get_spec_detail,
    get_project_stats,
    get_dependency_graph,
    get_spec_dependencies_cmd,
    search_specs,
    get_specs_by_status,
    get_all_tags,
    validate_spec_cmd,
    validate_all_specs_cmd,
    update_spec_status,
};
