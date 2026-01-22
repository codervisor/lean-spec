//! Tests for the `deps` MCP tool

use crate::helpers::*;

use leanspec_mcp::tools::call_tool;
use serde_json::json;

#[tokio::test]
async fn test_deps_show_dependencies() {
    let temp = create_project_with_deps(&[
        ("001-base", "complete", vec![]),
        ("002-feature", "planned", vec!["001-base"]),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("deps", json!({ "specPath": "002" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["spec"], "002-feature");
    assert!(output["dependsOn"].is_array());
    assert!(!output["dependsOn"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn test_deps_show_required_by() {
    let temp = create_project_with_deps(&[
        ("001-base", "complete", vec![]),
        ("002-feature", "planned", vec!["001-base"]),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("deps", json!({ "specPath": "001" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["spec"], "001-base");
    assert!(output["requiredBy"].is_array());
    assert!(!output["requiredBy"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn test_deps_no_dependencies() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("deps", json!({ "specPath": "001" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert!(output["dependsOn"].as_array().unwrap().is_empty());
    assert!(output["requiredBy"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn test_deps_with_depth() {
    let temp = create_project_with_deps(&[
        ("001-base", "complete", vec![]),
        ("002-middle", "complete", vec!["001-base"]),
        ("003-top", "planned", vec!["002-middle"]),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("deps", json!({ "specPath": "003", "depth": 2 })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    // Should show full dependency chain within depth
    assert!(!output["dependsOn"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn test_deps_circular_detection() {
    // Create specs with circular dependency
    let temp = create_empty_project();
    let specs_dir = temp.path().join("specs");

    // Create spec A depending on B
    let spec_a = specs_dir.join("001-spec-a");
    std::fs::create_dir_all(&spec_a).unwrap();
    std::fs::write(
        spec_a.join("README.md"),
        "---\nstatus: planned\ncreated: '2025-01-01'\ndepends_on:\n  - 002-spec-b\ncreated_at: '2025-01-01T00:00:00Z'\n---\n\n# Spec A\n",
    )
    .unwrap();

    // Create spec B depending on A (circular)
    let spec_b = specs_dir.join("002-spec-b");
    std::fs::create_dir_all(&spec_b).unwrap();
    std::fs::write(
        spec_b.join("README.md"),
        "---\nstatus: planned\ncreated: '2025-01-01'\ndepends_on:\n  - 001-spec-a\ncreated_at: '2025-01-01T00:00:00Z'\n---\n\n# Spec B\n",
    )
    .unwrap();

    set_specs_dir_env(&temp);

    let result = call_tool("deps", json!({ "specPath": "001" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["hasCircular"], true);
}

#[tokio::test]
async fn test_deps_spec_not_found() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("deps", json!({ "specPath": "999" })).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[tokio::test]
async fn test_deps_missing_spec_param() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("deps", json!({})).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Missing required parameter"));
}

#[tokio::test]
async fn test_deps_output_structure() {
    let temp = create_project_with_deps(&[
        ("001-base", "complete", vec![]),
        ("002-feature", "planned", vec!["001-base"]),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("deps", json!({ "specPath": "002" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

    // Check structure
    assert!(output["spec"].is_string());
    assert!(output["title"].is_string());
    assert!(output["dependsOn"].is_array());
    assert!(output["requiredBy"].is_array());
    assert!(output["hasCircular"].is_boolean());

    // Check dependency object structure
    if let Some(deps) = output["dependsOn"].as_array() {
        if !deps.is_empty() {
            let dep = &deps[0];
            assert!(dep["path"].is_string());
            assert!(dep["title"].is_string());
            assert!(dep["status"].is_string());
        }
    }
}
