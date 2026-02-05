//! MCP Tool implementations
//!
//! This module is organized into submodules by domain:
//! - `specs`: List, view, create, update, search
//! - `relationships`: Dependency and hierarchy management
//! - `validation`: Validate specs, count tokens
//! - `board`: Board view and stats
//! - `helpers`: Shared utility functions

mod board;
mod helpers;
mod relationships;
mod specs;
mod validation;

use crate::protocol::ToolDefinition;
use helpers::get_specs_dir;
use serde_json::Value;

// Re-export the test helper
pub use helpers::set_test_specs_dir;

/// Get all tool definitions
pub fn get_tool_definitions() -> Vec<ToolDefinition> {
    let mut definitions = Vec::new();
    definitions.extend(specs::get_definitions());
    definitions.extend(relationships::get_definitions());
    definitions.extend(validation::get_definitions());
    definitions.extend(board::get_definitions());
    definitions
}

/// Call a tool with arguments
pub async fn call_tool(name: &str, args: Value) -> Result<String, String> {
    let specs_dir = get_specs_dir();

    match name {
        // Spec management tools
        "list" => specs::tool_list(&specs_dir, args),
        "view" => specs::tool_view(&specs_dir, args),
        "create" => specs::tool_create(&specs_dir, args),
        "update" => specs::tool_update(&specs_dir, args),
        "search" => specs::tool_search(&specs_dir, args),

        // Validation tools
        "validate" => validation::tool_validate(&specs_dir, args),
        "tokens" => validation::tool_tokens(&specs_dir, args),

        // Board and stats tools
        "board" => board::tool_board(&specs_dir, args),
        "stats" => board::tool_stats(&specs_dir),

        // Relationship tools
        "relationships" => relationships::tool_relationships(&specs_dir, args),

        _ => Err(format!("Unknown tool: {}", name)),
    }
}
