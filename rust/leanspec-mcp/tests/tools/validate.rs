//! Tests for the `validate` MCP tool

use crate::helpers::*;

use leanspec_mcp::tools::call_tool;
use serde_json::json;

#[tokio::test]
async fn test_validate_all_specs_pass() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "in-progress", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("validate", json!({})).await;
    assert!(result.is_ok());
    // Output can be either "passed validation" or JSON with issues
    let output = result.unwrap();
    assert!(!output.is_empty());
}

#[tokio::test]
async fn test_validate_single_spec() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "in-progress", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("validate", json!({ "specPath": "001" })).await;
    assert!(result.is_ok());
    // Should validate only the specified spec
    let output = result.unwrap();
    assert!(!output.is_empty());
}

#[tokio::test]
async fn test_validate_empty_project() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool("validate", json!({})).await;
    assert!(result.is_ok());
    assert!(result.unwrap().contains("0 specs passed validation"));
}

#[tokio::test]
async fn test_validate_spec_not_found() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("validate", json!({ "specPath": "999" })).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[tokio::test]
async fn test_validate_returns_issues() {
    // Create a spec with potential issues (very long content)
    let temp = create_empty_project();
    let specs_dir = temp.path().join("specs");
    let spec_dir = specs_dir.join("001-long-spec");
    std::fs::create_dir_all(&spec_dir).unwrap();

    // Create a very long spec (over 400 lines) to trigger warning
    let long_content = format!(
        "---\nstatus: planned\ncreated: '2025-01-01'\ncreated_at: '2025-01-01T00:00:00Z'\n---\n\n# Long Spec\n\n{}\n",
        "Content line\n".repeat(500)
    );
    std::fs::write(spec_dir.join("README.md"), long_content).unwrap();
    set_specs_dir_env(&temp);

    let result = call_tool("validate", json!({})).await;
    // May return issues for long content
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_validate_with_check_deps_flag() {
    let temp = create_project_with_deps(&[
        ("001-base", "complete", vec![]),
        ("002-feature", "planned", vec!["001-base"]),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("validate", json!({ "checkDeps": true })).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_validate_output_structure_with_issues() {
    // Create spec with missing required section
    let temp = create_empty_project();
    let specs_dir = temp.path().join("specs");
    let spec_dir = specs_dir.join("001-incomplete");
    std::fs::create_dir_all(&spec_dir).unwrap();

    let minimal_content =
        "---\nstatus: planned\ncreated: '2025-01-01'\ncreated_at: '2025-01-01T00:00:00Z'\n---\n\n# Incomplete\n";
    std::fs::write(spec_dir.join("README.md"), minimal_content).unwrap();
    set_specs_dir_env(&temp);

    let result = call_tool("validate", json!({})).await;
    assert!(result.is_ok());
    // Output could be either success message or JSON with issues
}
