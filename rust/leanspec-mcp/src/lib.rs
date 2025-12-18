//! LeanSpec MCP Server Library
//!
//! Model Context Protocol server for LeanSpec spec management.
//! This library provides the protocol and tool implementations.

pub mod protocol;
pub mod tools;

pub use protocol::{McpRequest, McpResponse, McpError, ToolDefinition, handle_request};
pub use tools::{get_tool_definitions, call_tool};
