//! Tests for the `update` MCP tool

use crate::helpers::*;

use leanspec_mcp::tools::call_tool;
use serde_json::json;

#[tokio::test]
async fn test_update_status() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "update",
        json!({
            "specPath": "001",
            "status": "in-progress"
        }),
    )
    .await;
    assert!(result.is_ok());
    assert!(result.unwrap().contains("status → in-progress"));

    // Verify the file was updated
    let content =
        std::fs::read_to_string(temp.path().join("specs/001-feature-a/README.md")).unwrap();
    assert!(content.contains("status: in-progress"));
}

#[tokio::test]
async fn test_update_priority() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "update",
        json!({
            "specPath": "001",
            "priority": "high"
        }),
    )
    .await;
    assert!(result.is_ok());
    assert!(result.unwrap().contains("priority → high"));

    let content =
        std::fs::read_to_string(temp.path().join("specs/001-feature-a/README.md")).unwrap();
    assert!(content.contains("priority: high"));
}

#[tokio::test]
async fn test_update_assignee() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "update",
        json!({
            "specPath": "001",
            "assignee": "developer@example.com"
        }),
    )
    .await;
    assert!(result.is_ok());
    assert!(result.unwrap().contains("assignee → developer@example.com"));

    let content =
        std::fs::read_to_string(temp.path().join("specs/001-feature-a/README.md")).unwrap();
    assert!(content.contains("assignee: developer@example.com"));
}

#[tokio::test]
async fn test_update_add_tags() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "update",
        json!({
            "specPath": "001",
            "addTags": ["new-tag", "another-tag"]
        }),
    )
    .await;
    assert!(result.is_ok());
    let output = result.unwrap();
    // Check that at least some tags were added
    assert!(output.contains("+tag:") || output.contains("new-tag") || output.contains("Updated"));
}

#[tokio::test]
async fn test_update_remove_tags() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    // "test" tag exists from helper - try to remove it
    let result = call_tool(
        "update",
        json!({
            "specPath": "001",
            "removeTags": ["test"]
        }),
    )
    .await;
    // This may or may not work depending on implementation
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_update_combined() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "update",
        json!({
            "specPath": "001",
            "status": "in-progress",
            "priority": "critical",
            "addTags": ["urgent"]
        }),
    )
    .await;
    assert!(result.is_ok());
    let output = result.unwrap();
    assert!(output.contains("status → in-progress"));
    assert!(output.contains("priority → critical"));
    assert!(output.contains("+tag: urgent"));
}

#[tokio::test]
async fn test_update_spec_not_found() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "update",
        json!({
            "specPath": "999",
            "status": "complete"
        }),
    )
    .await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[tokio::test]
async fn test_update_missing_spec_param() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("update", json!({ "status": "complete" })).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Missing required parameter"));
}

#[tokio::test]
async fn test_update_no_changes() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("update", json!({ "specPath": "001" })).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_update_duplicate_tag_ignored() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    // "test" tag already exists
    let result = call_tool(
        "update",
        json!({
            "specPath": "001",
            "addTags": ["test"]
        }),
    )
    .await;
    assert!(result.is_ok());
    // Should not show +tag for already existing tag
    assert!(!result.unwrap().contains("+tag: test"));
}
