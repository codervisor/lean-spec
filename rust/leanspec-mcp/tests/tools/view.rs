//! Tests for the `view` MCP tool

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use leanspec_mcp::tools::call_tool;
use serde_json::json;

#[tokio::test]
async fn test_view_spec_by_number() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("view", json!({ "specPath": "001" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["path"], "001-feature-a");
    assert_eq!(output["status"], "planned");
}

#[tokio::test]
async fn test_view_spec_by_full_path() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("view", json!({ "specPath": "001-feature-a" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["path"], "001-feature-a");
}

#[tokio::test]
async fn test_view_spec_not_found() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("view", json!({ "specPath": "999" })).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[tokio::test]
async fn test_view_missing_spec_param() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("view", json!({})).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Missing required parameter"));
}

#[tokio::test]
async fn test_view_output_structure() {
    let temp = create_test_project(&[("001-feature-a", "planned", Some("high"))]);
    set_specs_dir_env(&temp);

    let result = call_tool("view", json!({ "specPath": "001" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

    // Check all expected fields
    assert!(output["path"].is_string());
    assert!(output["title"].is_string());
    assert!(output["status"].is_string());
    assert!(output["created"].is_string());
    assert!(output["tags"].is_array());
    assert!(output["content"].is_string());
}

#[tokio::test]
async fn test_view_with_dependencies() {
    let temp = create_project_with_deps(&[
        ("001-base", "complete", vec![]),
        ("002-feature", "planned", vec!["001-base"]),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("view", json!({ "specPath": "002" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert!(output["depends_on"].is_array());
    assert!(output["depends_on"]
        .as_array()
        .unwrap()
        .iter()
        .any(|d| d.as_str().unwrap().contains("001")));
}

#[tokio::test]
async fn test_view_partial_name_match() {
    let temp = create_test_project(&[("001-feature-authentication", "planned", None)]);
    set_specs_dir_env(&temp);

    // Should find by partial match
    let result = call_tool("view", json!({ "specPath": "001-feature" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["path"], "001-feature-authentication");
}
