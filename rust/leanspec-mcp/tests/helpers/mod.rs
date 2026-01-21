//! Test helpers for MCP server tests

#![allow(dead_code)]

use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use tempfile::TempDir;

const DEFAULT_TEMPLATE: &str = r"---
status: planned
created: '{date}'
tags: []
priority: medium
---

# {name}

> **Status**: {status} · **Priority**: {priority} · **Created**: {date}

## Overview

## Design

## Plan

- [ ] Task 1

## Test

- [ ] Test 1

## Notes
";

static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Creates a test project with sample specs
pub fn create_test_project(specs: &[(&str, &str, Option<&str>)]) -> TempDir {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let specs_dir = temp_dir.path().join("specs");
    std::fs::create_dir_all(&specs_dir).expect("Failed to create specs dir");

    seed_template_dir(temp_dir.path());

    for (name, status, priority) in specs {
        let spec_dir = specs_dir.join(name);
        std::fs::create_dir_all(&spec_dir).expect("Failed to create spec dir");

        let priority_line = priority
            .map(|p| format!("priority: {}\n", p))
            .unwrap_or_default();

        let content = format!(
            "---\nstatus: {}\ncreated: '2025-01-01'\n{}tags:\n  - test\ncreated_at: '2025-01-01T00:00:00Z'\n---\n\n# {}\n\n> **Status**: {} · **Created**: 2025-01-01\n\n## Overview\n\nTest spec content.\n",
            status,
            priority_line,
            name.split('-').skip(1).map(capitalize).collect::<Vec<_>>().join(" "),
            status
        );

        std::fs::write(spec_dir.join("README.md"), content).expect("Failed to write spec file");
    }

    temp_dir
}

/// Creates a test project with dependencies between specs
pub fn create_project_with_deps(
    specs: &[(&str, &str, Vec<&str>)], // (name, status, depends_on)
) -> TempDir {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let specs_dir = temp_dir.path().join("specs");
    std::fs::create_dir_all(&specs_dir).expect("Failed to create specs dir");

    seed_template_dir(temp_dir.path());

    for (name, status, deps) in specs {
        let spec_dir = specs_dir.join(name);
        std::fs::create_dir_all(&spec_dir).expect("Failed to create spec dir");

        let deps_section = if deps.is_empty() {
            String::new()
        } else {
            let deps_list = deps
                .iter()
                .map(|d| format!("  - {}", d))
                .collect::<Vec<_>>()
                .join("\n");
            format!("depends_on:\n{}\n", deps_list)
        };

        let content = format!(
            "---\nstatus: {}\ncreated: '2025-01-01'\ntags:\n  - test\n{}created_at: '2025-01-01T00:00:00Z'\n---\n\n# {}\n\n## Overview\n\nTest spec.\n",
            status,
            deps_section,
            name
        );

        std::fs::write(spec_dir.join("README.md"), content).expect("Failed to write spec file");
    }

    temp_dir
}

/// Create an empty test project
pub fn create_empty_project() -> TempDir {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let specs_dir = temp_dir.path().join("specs");
    std::fs::create_dir_all(&specs_dir).expect("Failed to create specs dir");
    seed_template_dir(temp_dir.path());
    temp_dir
}

fn seed_template_dir(root: &std::path::Path) {
    let templates_dir = root.join(".lean-spec").join("templates");
    std::fs::create_dir_all(&templates_dir).expect("Failed to create templates dir");
    let template_path = templates_dir.join("spec-template.md");
    if !template_path.exists() {
        std::fs::write(&template_path, DEFAULT_TEMPLATE).expect("Failed to write default template");
    }
}

/// Build a JSON-RPC request
pub fn build_request(id: u64, method: &str, params: Value) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params
    })
}

/// Build an initialize request
pub fn build_initialize_request(id: u64) -> Value {
    build_request(
        id,
        "initialize",
        json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }),
    )
}

/// Build a tools/list request
pub fn build_tools_list_request(id: u64) -> Value {
    build_request(id, "tools/list", json!({}))
}

/// Build a tools/call request
pub fn build_tool_call_request(id: u64, tool_name: &str, arguments: Value) -> Value {
    build_request(
        id,
        "tools/call",
        json!({
            "name": tool_name,
            "arguments": arguments
        }),
    )
}

/// Get specs directory path from temp dir
pub fn specs_dir(temp_dir: &TempDir) -> PathBuf {
    temp_dir.path().join("specs")
}

/// Set LEANSPEC_SPECS_DIR environment variable with unique identifier
pub fn set_specs_dir_env(temp_dir: &TempDir) {
    // Use atomic counter to create unique env var name per test
    let test_id = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
    let specs_path = specs_dir(temp_dir);

    // Set test-wide env and a per-test override to avoid races in parallel runs
    std::env::set_var("LEANSPEC_SPECS_DIR", &specs_path);
    std::env::set_var("LEANSPEC_TEST_ID", test_id.to_string());
    std::env::set_var(format!("LEANSPEC_SPECS_DIR_{}", test_id), specs_path);
}

/// Assert response is a success with expected structure
pub fn assert_success_response(response: &Value) {
    assert_eq!(response.get("jsonrpc"), Some(&json!("2.0")));
    assert!(response.get("result").is_some(), "Expected result field");
    assert!(response.get("error").is_none(), "Unexpected error field");
}

/// Assert response is an error with specific code
pub fn assert_error_response(response: &Value, expected_code: i32) {
    assert_eq!(response.get("jsonrpc"), Some(&json!("2.0")));
    assert!(response.get("error").is_some(), "Expected error field");
    let error = response.get("error").unwrap();
    assert_eq!(
        error.get("code"),
        Some(&json!(expected_code)),
        "Error code mismatch"
    );
}

/// Assert MCP tool content response
pub fn assert_tool_content_response(response: &Value) {
    assert_success_response(response);
    let result = response.get("result").unwrap();
    let content = result.get("content").expect("Expected content field");
    assert!(content.is_array(), "Content should be an array");
}

/// Get text content from tool response
pub fn get_tool_text_content(response: &Value) -> Option<String> {
    response
        .get("result")?
        .get("content")?
        .get(0)?
        .get("text")?
        .as_str()
        .map(String::from)
}

/// Parse tool response text as JSON
pub fn parse_tool_json_response(response: &Value) -> Option<Value> {
    let text = get_tool_text_content(response)?;
    serde_json::from_str(&text).ok()
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_test_project() {
        let temp = create_test_project(&[
            ("001-feature-a", "planned", None),
            ("002-feature-b", "in-progress", Some("high")),
        ]);

        let specs_dir = temp.path().join("specs");
        assert!(specs_dir.join("001-feature-a/README.md").exists());
        assert!(specs_dir.join("002-feature-b/README.md").exists());
    }

    #[test]
    fn test_build_request() {
        let req = build_request(1, "test_method", json!({"key": "value"}));
        assert_eq!(req["jsonrpc"], "2.0");
        assert_eq!(req["id"], 1);
        assert_eq!(req["method"], "test_method");
        assert_eq!(req["params"]["key"], "value");
    }
}
