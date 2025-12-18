//! Tests for the `unlink` MCP tool

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use leanspec_mcp::tools::call_tool;
use serde_json::json;

#[tokio::test]
async fn test_unlink_dependency() {
    let temp = create_project_with_deps(&[
        ("001-base", "complete", vec![]),
        ("002-feature", "planned", vec!["001-base"]),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "unlink",
        json!({
            "specPath": "002",
            "dependsOn": "001"
        }),
    )
    .await;
    assert!(result.is_ok());
    assert!(result.unwrap().contains("Unlinked"));

    // Verify the dependency was removed
    let content = std::fs::read_to_string(temp.path().join("specs/002-feature/README.md")).unwrap();
    assert!(!content.contains("001-base"));
}

#[tokio::test]
async fn test_unlink_nonexistent_dependency() {
    let temp = create_test_project(&[
        ("001-base", "complete", None),
        ("002-feature", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "unlink",
        json!({
            "specPath": "002",
            "dependsOn": "001"
        }),
    )
    .await;
    // Should return error since no dependency exists
    assert!(result.is_err());
}

#[tokio::test]
async fn test_unlink_spec_not_found() {
    let temp = create_test_project(&[("001-base", "complete", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "unlink",
        json!({
            "specPath": "999",
            "dependsOn": "001"
        }),
    )
    .await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[tokio::test]
async fn test_unlink_missing_spec_param() {
    let temp = create_test_project(&[("001-base", "complete", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("unlink", json!({ "dependsOn": "001" })).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Missing required parameter"));
}

#[tokio::test]
async fn test_unlink_missing_depends_on_param() {
    let temp = create_test_project(&[("001-base", "complete", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("unlink", json!({ "specPath": "001" })).await;
    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .contains("Missing required parameter: dependsOn"));
}

#[tokio::test]
async fn test_unlink_one_of_multiple() {
    let temp = create_project_with_deps(&[
        ("001-base-a", "complete", vec![]),
        ("002-base-b", "complete", vec![]),
        ("003-feature", "planned", vec!["001-base-a", "002-base-b"]),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "unlink",
        json!({
            "specPath": "003",
            "dependsOn": "001"
        }),
    )
    .await;
    assert!(result.is_ok());

    // Verify only one dependency was removed
    let content = std::fs::read_to_string(temp.path().join("specs/003-feature/README.md")).unwrap();
    assert!(!content.contains("001-base-a"));
    assert!(content.contains("002-base-b"));
}

#[tokio::test]
async fn test_unlink_by_partial_match() {
    let temp = create_project_with_deps(&[
        ("001-base-feature", "complete", vec![]),
        ("002-top", "planned", vec!["001-base-feature"]),
    ]);
    set_specs_dir_env(&temp);

    // Should match by partial name or full name
    let result = call_tool(
        "unlink",
        json!({
            "specPath": "002",
            "dependsOn": "001-base-feature"
        }),
    )
    .await;
    assert!(result.is_ok());
}
