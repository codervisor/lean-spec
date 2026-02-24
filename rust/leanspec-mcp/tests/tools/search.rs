//! Tests for the `search` MCP tool

use crate::helpers::*;

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
    assert!(result
        .unwrap_err()
        .contains("Missing required parameter: query"));
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
        ("001-auth-login", "planned", None),      // Has "auth" in title
        ("002-user-management", "planned", None), // No "auth"
        ("003-authentication", "planned", None),  // Has "auth" in path and title
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

#[tokio::test]
async fn test_search_multi_term_cross_field() {
    let temp = create_test_project(&[
        ("001-desktop-app", "planned", None),  // Both terms in path
        ("002-cli-tool", "planned", None),     // Only one term
        ("003-web-frontend", "planned", None), // No matching terms
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({ "query": "desktop app" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    // Should find desktop-app (has both terms)
    assert!(output["count"].as_u64().unwrap() >= 1);

    let results = output["results"].as_array().unwrap();
    let paths: Vec<&str> = results
        .iter()
        .map(|r| r["path"].as_str().unwrap())
        .collect();
    assert!(paths.iter().any(|p| p.contains("desktop")));
}

#[tokio::test]
async fn test_search_multi_term_no_match_partial() {
    let temp = create_test_project(&[
        ("001-cli-only", "planned", None),
        ("002-webapp-only", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    // Search requires BOTH terms - should not match specs with only one term
    let result = call_tool("search", json!({ "query": "cli webapp" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    // Neither spec has both "cli" AND "webapp", so no matches
    assert_eq!(output["count"], 0);
}

#[tokio::test]
async fn test_search_terms_spread_across_fields() {
    // Create a base project using the helper
    use std::fs;

    let temp_dir = create_empty_project();
    let specs_dir = temp_dir.path().join("specs");

    // Create spec with "user" in path, "authentication" in title
    fs::create_dir_all(specs_dir.join("001-user-system")).unwrap();
    fs::write(
        specs_dir.join("001-user-system/README.md"),
        r#"---
status: planned
created: '2025-01-01'
tags:
  - security
  - api
created_at: '2025-01-01T00:00:00Z'
---
# Authentication System

User authentication and session management.
"#,
    )
    .unwrap();

    set_specs_dir_env(&temp_dir);

    // Search for terms that appear in different fields
    let result = call_tool("search", json!({ "query": "user authentication" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    // Should find the spec since "user" is in path and "authentication" is in title
    assert_eq!(output["count"], 1);
}

#[tokio::test]
async fn test_search_empty_query() {
    let temp = create_test_project(&[("001-feature", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({ "query": "   " })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    // Empty query (whitespace only) should return error message
    assert!(output.get("error").is_some() || output["count"] == 0);
}

#[tokio::test]
async fn test_search_boolean_operators() {
    let temp = create_test_project(&[
        ("001-auth-api", "planned", Some("high")),
        ("002-auth-only", "planned", Some("medium")),
        ("003-cli-only", "planned", Some("low")),
    ]);
    set_specs_dir_env(&temp);

    let and_result = call_tool("search", json!({ "query": "auth AND api" })).await;
    assert!(and_result.is_ok());
    let and_output: serde_json::Value = serde_json::from_str(&and_result.unwrap()).unwrap();
    assert_eq!(and_output["count"], 1);

    let or_result = call_tool("search", json!({ "query": "auth OR cli" })).await;
    assert!(or_result.is_ok());
    let or_output: serde_json::Value = serde_json::from_str(&or_result.unwrap()).unwrap();
    assert!(or_output["count"].as_u64().unwrap() >= 2);

    let not_result = call_tool("search", json!({ "query": "auth NOT cli" })).await;
    assert!(not_result.is_ok());
    let not_output: serde_json::Value = serde_json::from_str(&not_result.unwrap()).unwrap();
    assert!(not_output["count"].as_u64().unwrap() >= 1);
}

#[tokio::test]
async fn test_search_field_filters_and_created_range() {
    let temp = create_test_project(&[
        ("001-auth-api", "in-progress", Some("high")),
        ("002-cli-only", "planned", Some("medium")),
    ]);
    set_specs_dir_env(&temp);

    let status_result = call_tool("search", json!({ "query": "status:in-progress" })).await;
    assert!(status_result.is_ok());
    let status_output: serde_json::Value = serde_json::from_str(&status_result.unwrap()).unwrap();
    assert_eq!(status_output["count"], 1);

    let tag_result = call_tool("search", json!({ "query": "tag:test" })).await;
    assert!(tag_result.is_ok());
    let tag_output: serde_json::Value = serde_json::from_str(&tag_result.unwrap()).unwrap();
    assert_eq!(tag_output["count"], 2);

    let created_result = call_tool("search", json!({ "query": "created:>2024-12" })).await;
    assert!(created_result.is_ok());
    let created_output: serde_json::Value = serde_json::from_str(&created_result.unwrap()).unwrap();
    assert_eq!(created_output["count"], 2);
}

#[tokio::test]
async fn test_search_phrase_and_fuzzy() {
    let temp = create_test_project(&[("001-user-authentication", "planned", Some("high"))]);
    set_specs_dir_env(&temp);

    let phrase_result = call_tool("search", json!({ "query": "\"User Authentication\"" })).await;
    assert!(phrase_result.is_ok());
    let phrase_output: serde_json::Value = serde_json::from_str(&phrase_result.unwrap()).unwrap();
    assert_eq!(phrase_output["count"], 1);

    let fuzzy_result = call_tool("search", json!({ "query": "authetication~" })).await;
    assert!(fuzzy_result.is_ok());
    let fuzzy_output: serde_json::Value = serde_json::from_str(&fuzzy_result.unwrap()).unwrap();
    assert_eq!(fuzzy_output["count"], 1);
}

#[tokio::test]
async fn test_search_invalid_query_reports_error() {
    let temp = create_test_project(&[("001-feature", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("search", json!({ "query": "auth AND" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert!(output["error"]
        .as_str()
        .unwrap_or_default()
        .contains("Invalid search query"));
    assert_eq!(output["count"], 0);
}
