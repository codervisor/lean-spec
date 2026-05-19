//! Serialise a `SpecDoc` to the JSON shape MCP clients receive.
//!
//! Uses the document's `serde` derive so the output matches `SpecDoc`'s
//! public schema (also exported to the UI via `ts-rs`). Centralised here so
//! every tool that returns a doc emits the same shape, and so the failure
//! mode (which should never happen — `SpecDoc` only contains JSON-friendly
//! types) lands as a structured `INTERNAL_ERROR` rather than a silent
//! `null`.

use leanspec_core::SpecDoc;
use serde_json::Value;

use crate::error::McpToolError;

pub fn doc_to_json(doc: &SpecDoc) -> Result<Value, McpToolError> {
    serde_json::to_value(doc).map_err(|e| McpToolError::Internal(format!("serialize SpecDoc: {e}")))
}
