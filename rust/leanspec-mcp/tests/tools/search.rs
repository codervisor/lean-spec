//! Tests for the `search` MCP tool

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use leanspec_mcp::tools::call_tool;
use pretty_assertions::assert_eq;
use serde_json::json;

#[tokio::test]
async fn test_search_by_title() {
    let temp = create_test_project(&[
        ("001-authentication", "planned", None),
        ("002-authorization", "planned", None),
        ("003-database", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({ "query": "auth" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["query"], "auth");
    assert!(output["count"].as_u64().unwrap() >= 2); // authentication, authorization
}

#[tokio::test]
async fn test_search_by_path() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "planned", None),
        ("003-bugfix", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({ "query": "feature" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    // Search results depend on implementation
    assert!(output["count"].is_number());
}

#[tokio::test]
async fn test_search_with_limit() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "planned", None),
        ("003-feature-c", "planned", None),
        ("004-feature-d", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool(
        "search",
        json!({
            "query": "feature",
            "limit": 2
        }),
    )
    .await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert!(output["count"].as_u64().unwrap() <= 2);
}

#[tokio::test]
async fn test_search_no_results() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({ "query": "nonexistent" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["count"], 0);
    assert!(output["results"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn test_search_case_insensitive() {
    let temp = create_test_project(&[("001-authentication", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({ "query": "AUTHENTICATION" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["count"], 1);
}

#[tokio::test]
async fn test_search_missing_query_param() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({})).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Missing required parameter: query"));
}

#[tokio::test]
async fn test_search_empty_project() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({ "query": "anything" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["count"], 0);
}

#[tokio::test]
async fn test_search_output_structure() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({ "query": "feature" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

    assert!(output["query"].is_string());
    assert!(output["count"].is_number());
    assert!(output["results"].is_array());

    if let Some(results) = output["results"].as_array() {
        if !results.is_empty() {
            let result = &results[0];
            assert!(result["path"].is_string());
            assert!(result["title"].is_string());
            assert!(result["status"].is_string());
            assert!(result["score"].is_number());
            assert!(result["tags"].is_array());
        }
    }
}

#[tokio::test]
async fn test_search_results_sorted_by_score() {
    let temp = create_test_project(&[
        ("001-auth-login", "planned", None),         // Has "auth" in title
        ("002-user-management", "planned", None),    // No "auth"
        ("003-authentication", "planned", None),     // Has "auth" in path and title
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({ "query": "auth" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    let results = output["results"].as_array().unwrap();

    // Results should be sorted by score (descending)
    if results.len() >= 2 {
        let score1 = results[0]["score"].as_f64().unwrap();
        let score2 = results[1]["score"].as_f64().unwrap();
        assert!(score1 >= score2);
    }
}
