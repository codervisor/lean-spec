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

// Re-export commands for convenience
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
