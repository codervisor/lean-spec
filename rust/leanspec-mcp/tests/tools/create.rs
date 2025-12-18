//! Tests for the `create` MCP tool

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use leanspec_mcp::tools::call_tool;
use serde_json::json;

#[tokio::test]
async fn test_create_spec_basic() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool("create", json!({ "name": "test-feature" })).await;
    assert!(result.is_ok());
    assert!(result.unwrap().contains("Created spec"));

    // Verify file was created
    let specs_dir = temp.path().join("specs");
    let entries: Vec<_> = std::fs::read_dir(&specs_dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .collect();
    assert_eq!(entries.len(), 1);
    assert!(entries[0]
        .file_name()
        .to_string_lossy()
        .contains("test-feature"));
}

#[tokio::test]
async fn test_create_spec_with_title() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool(
        "create",
        json!({
            "name": "auth-system",
            "title": "Authentication System"
        }),
    )
    .await;
    assert!(result.is_ok());

    // Find created spec and verify title
    let specs_dir = temp.path().join("specs");
    let entries: Vec<_> = std::fs::read_dir(&specs_dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .collect();
    
    assert!(!entries.is_empty(), "No specs created");
    let content = std::fs::read_to_string(entries[0].path().join("README.md")).unwrap();
    assert!(content.contains("Authentication System"));
}

#[tokio::test]
async fn test_create_spec_with_status() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool(
        "create",
        json!({
            "name": "new-feature",
            "status": "in-progress"
        }),
    )
    .await;
    assert!(result.is_ok());

    let specs_dir = temp.path().join("specs");
    let entries: Vec<_> = std::fs::read_dir(&specs_dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .collect();
    
    assert!(!entries.is_empty(), "No specs created");
    let content = std::fs::read_to_string(entries[0].path().join("README.md")).unwrap();
    assert!(content.contains("status:"));
}

#[tokio::test]
async fn test_create_spec_with_priority() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool(
        "create",
        json!({
            "name": "urgent-fix",
            "priority": "high"
        }),
    )
    .await;
    assert!(result.is_ok());

    let specs_dir = temp.path().join("specs");
    let entries: Vec<_> = std::fs::read_dir(&specs_dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .collect();
    
    assert!(!entries.is_empty(), "No specs created");
}

#[tokio::test]
async fn test_create_spec_with_tags() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool(
        "create",
        json!({
            "name": "tagged-feature",
            "tags": ["feature", "backend", "api"]
        }),
    )
    .await;
    assert!(result.is_ok());

    let specs_dir = temp.path().join("specs");
    let entry = std::fs::read_dir(&specs_dir)
        .unwrap()
        .next()
        .unwrap()
        .unwrap();
    let content = std::fs::read_to_string(entry.path().join("README.md")).unwrap();
    assert!(content.contains("- feature"));
    assert!(content.contains("- backend"));
    assert!(content.contains("- api"));
}

#[tokio::test]
async fn test_create_spec_missing_name() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool("create", json!({})).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Missing required parameter: name"));
}

#[tokio::test]
async fn test_create_spec_auto_numbering() {
    let temp = create_test_project(&[
        ("001-existing", "planned", None),
        ("002-another", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("create", json!({ "name": "new-feature" })).await;
    assert!(result.is_ok());

    // Should create spec 003
    let output = result.unwrap();
    assert!(output.contains("003-new-feature"));
}

#[tokio::test]
async fn test_create_spec_all_options() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool(
        "create",
        json!({
            "name": "full-feature",
            "title": "Full Feature Implementation",
            "status": "planned",
            "priority": "critical",
            "tags": ["urgent", "core"]
        }),
    )
    .await;
    assert!(result.is_ok());

    let specs_dir = temp.path().join("specs");
    let entries: Vec<_> = std::fs::read_dir(&specs_dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .collect();
    
    // Should have created at least one spec
    assert!(!entries.is_empty());
    
    let content = std::fs::read_to_string(entries[0].path().join("README.md")).unwrap();

    assert!(content.contains("# Full Feature Implementation"));
    assert!(content.contains("status: planned"));
}
