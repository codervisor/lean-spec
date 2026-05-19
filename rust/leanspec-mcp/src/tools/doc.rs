//! Serialise a `SpecDoc` to the JSON shape MCP clients receive.
//!
//! Uses the document's `serde` derive so the output matches `SpecDoc`'s
//! public schema (also exported to the UI via `ts-rs`). Centralised here so
//! every tool that returns a doc emits the same shape.

use leanspec_core::SpecDoc;
use serde_json::Value;

pub fn doc_to_json(doc: &SpecDoc) -> Value {
    serde_json::to_value(doc).unwrap_or(Value::Null)
}
