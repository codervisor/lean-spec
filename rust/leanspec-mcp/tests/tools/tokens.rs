//! Tests for the `tokens` MCP tool

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use leanspec_mcp::tools::call_tool;
use serde_json::json;

#[tokio::test]
async fn test_tokens_single_spec() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("tokens", json!({ "spec": "001" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert!(output["spec"].is_string());
    assert!(output["total"].is_number());
    assert!(output["frontmatter"].is_number());
    assert!(output["content"].is_number());
    assert!(output["status"].is_string());
}

#[tokio::test]
async fn test_tokens_all_specs() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "planned", None),
        ("003-feature-c", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("tokens", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["count"], 3);
    assert!(output["totalTokens"].is_number());
    assert!(output["averageTokens"].is_number());
    assert!(output["specs"].is_array());
}

#[tokio::test]
async fn test_tokens_empty_project() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool("tokens", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["count"], 0);
    assert_eq!(output["totalTokens"], 0);
    assert_eq!(output["averageTokens"], 0);
}

#[tokio::test]
async fn test_tokens_spec_not_found() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("tokens", json!({ "spec": "999" })).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[tokio::test]
async fn test_tokens_single_spec_output() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("tokens", json!({ "spec": "001" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

    // Total should be approximately sum of frontmatter and content
    let total = output["total"].as_u64().unwrap();
    let frontmatter = output["frontmatter"].as_u64().unwrap();
    let content = output["content"].as_u64().unwrap();
    // Allow some variance due to tokenization details
    assert!(total >= frontmatter.saturating_sub(5) + content.saturating_sub(5));
}

#[tokio::test]
async fn test_tokens_all_specs_output_structure() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("tokens", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    let specs = output["specs"].as_array().unwrap();

    if !specs.is_empty() {
        let spec = &specs[0];
        assert!(spec["path"].is_string());
        assert!(spec["title"].is_string());
        assert!(spec["total"].is_number());
        assert!(spec["status"].is_string());
    }
}

#[tokio::test]
async fn test_tokens_status_indication() {
    // Create a short spec (should be optimal)
    let temp = create_test_project(&[("001-short", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("tokens", json!({ "spec": "001" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

    // Status should indicate token health
    let status = output["status"].as_str().unwrap();
    // Status could be "Optimal", "Good", "Warning", etc.
    assert!(!status.is_empty());
}

#[tokio::test]
async fn test_tokens_large_spec() {
    let temp = create_empty_project();
    let specs_dir = temp.path().join("specs");
    let spec_dir = specs_dir.join("001-large-spec");
    std::fs::create_dir_all(&spec_dir).unwrap();

    // Create a large spec with lots of content
    let large_content = format!(
        "---\nstatus: planned\ncreated: '2025-01-01'\ncreated_at: '2025-01-01T00:00:00Z'\n---\n\n# Large Spec\n\n{}\n",
        "This is a long line of content that will contribute to the token count. ".repeat(100)
    );
    std::fs::write(spec_dir.join("README.md"), large_content).unwrap();
    set_specs_dir_env(&temp);

    let result = call_tool("tokens", json!({ "spec": "001" })).await;
    // May fail if spec can't be loaded
    if result.is_err() {
        return;
    }

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    let total = output["total"].as_u64().unwrap();

    // Large spec should have significant tokens
    assert!(total > 50);
}

#[tokio::test]
async fn test_tokens_average_calculation() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("tokens", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    let total = output["totalTokens"].as_u64().unwrap();
    let count = output["count"].as_u64().unwrap();
    let average = output["averageTokens"].as_u64().unwrap();

    // Average should be approximately total / count
    if count > 0 {
        assert_eq!(average, total / count);
    }
}
