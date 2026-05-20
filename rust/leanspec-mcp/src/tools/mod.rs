//! MCP tool registry and dispatch.
//!
//! Tools that touch the [`leanspec_core::Adapter`] route everything through
//! [`ServerState::adapter`], so the same MCP server works against markdown,
//! GitHub, ADO, or Jira projects. Markdown-only tools refuse non-markdown
//! adapters with a structured `ADAPTER_NOT_SUPPORTED` error.

mod create_spec;
mod doc;
mod get_capabilities;
mod get_schema;
mod get_spec;
mod list_specs;
mod markdown_only;
mod reload_schema;
mod search_specs;
mod update_spec;

pub use doc::doc_to_json;

use std::sync::Arc;

use serde_json::Value;

use crate::error::McpToolError;
use crate::protocol::ToolDefinition;
use crate::state::ServerState;

/// Return tool definitions sized for the active adapter (input schemas and
/// descriptions are generated from the schema's `ai_hint` fields).
pub fn definitions(state: &ServerState) -> Vec<ToolDefinition> {
    let adapter = state.adapter();
    let schema = adapter.schema();
    let mut defs = vec![
        list_specs::definition(schema),
        get_spec::definition(),
        create_spec::definition(schema),
        update_spec::definition(schema),
        search_specs::definition(),
        get_schema::definition(),
        get_capabilities::definition(),
        reload_schema::definition(),
    ];

    // Markdown-only tools are advertised in the catalog regardless of the
    // active adapter so AI agents can discover them; the runtime guard
    // returns ADAPTER_NOT_SUPPORTED when they're invoked on a remote project.
    defs.extend(markdown_only::definitions());
    defs
}

pub async fn call(state: Arc<ServerState>, name: &str, args: Value) -> Result<Value, McpToolError> {
    match name {
        "list_specs" => list_specs::call(state, args),
        "get_spec" => get_spec::call(state, args),
        "create_spec" => create_spec::call(state, args),
        "update_spec" => update_spec::call(state, args),
        "search_specs" => search_specs::call(state, args),
        "get_schema" => get_schema::call(state),
        "get_capabilities" => get_capabilities::call(state),
        "reload_schema" => reload_schema::call(state),
        "validate_spec" => markdown_only::validate_spec(state, args),
        "get_dependencies" => markdown_only::get_dependencies(state, args),
        "get_stats" => markdown_only::get_stats(state),
        other => Err(McpToolError::InvalidRequest(format!(
            "unknown tool: {other}"
        ))),
    }
}
