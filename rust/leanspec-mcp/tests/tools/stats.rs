//! Tests for the `stats` MCP tool

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use leanspec_mcp::tools::call_tool;
use pretty_assertions::assert_eq;
use serde_json::json;

#[tokio::test]
async fn test_stats_basic() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "in-progress", Some("high")),
        ("003-feature-c", "complete", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("stats", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["total"], 3);
}

#[tokio::test]
async fn test_stats_by_status() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "planned", None),
        ("003-feature-c", "in-progress", None),
        ("004-feature-d", "complete", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("stats", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    let by_status = &output["byStatus"];

    assert_eq!(by_status["planned"], 2);
    assert_eq!(by_status["in-progress"], 1);
    assert_eq!(by_status["complete"], 1);
}

#[tokio::test]
async fn test_stats_by_priority() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", Some("high")),
        ("002-feature-b", "planned", Some("high")),
        ("003-feature-c", "planned", Some("low")),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("stats", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    let by_priority = &output["byPriority"];

    assert_eq!(by_priority["high"], 2);
    assert_eq!(by_priority["low"], 1);
}

#[tokio::test]
async fn test_stats_completion_percentage() {
    let temp = create_test_project(&[
        ("001-feature-a", "complete", None),
        ("002-feature-b", "complete", None),
        ("003-feature-c", "planned", None),
        ("004-feature-d", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("stats", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    let completion = output["completionPercentage"].as_f64().unwrap();

    // 2 complete out of 4 = 50%
    assert!((completion - 50.0).abs() < 0.1);
}

#[tokio::test]
async fn test_stats_active_count() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "in-progress", None),
        ("003-feature-c", "complete", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("stats", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    let active = output["activeCount"].as_u64().unwrap();

    // planned + in-progress = at least 1
    assert!(active >= 1);
}

#[tokio::test]
async fn test_stats_with_dependencies() {
    let temp = create_project_with_deps(&[
        ("001-base", "complete", vec![]),
        ("002-feature", "planned", vec!["001-base"]),
        ("003-another", "planned", vec!["001-base"]),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("stats", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

    // 2 specs have dependencies
    assert!(output["withDependencies"].is_number());
}

#[tokio::test]
async fn test_stats_empty_project() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool("stats", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["total"], 0);
    assert_eq!(output["activeCount"], 0);
}

#[tokio::test]
async fn test_stats_top_tags() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "planned", None),
        ("003-feature-c", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("stats", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

    // All specs have "test" tag
    let top_tags = output["topTags"].as_array().unwrap();
    assert!(!top_tags.is_empty());

    let test_tag = top_tags.iter().find(|t| t["tag"] == "test");
    assert!(test_tag.is_some());
    assert_eq!(test_tag.unwrap()["count"], 3);
}

#[tokio::test]
async fn test_stats_output_structure() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("stats", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

    // Check all expected fields
    assert!(output["total"].is_number());
    assert!(output["byStatus"].is_object());
    assert!(output["byPriority"].is_object());
    assert!(output["completionPercentage"].is_number());
    assert!(output["activeCount"].is_number());
    assert!(output["withDependencies"].is_number());
    assert!(output["totalDependencies"].is_number());
    assert!(output["subSpecs"].is_number());
    assert!(output["topTags"].is_array());
}

#[tokio::test]
async fn test_stats_all_complete() {
    let temp = create_test_project(&[
        ("001-feature-a", "complete", None),
        ("002-feature-b", "complete", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("stats", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

    // 100% completion
    let completion = output["completionPercentage"].as_f64().unwrap();
    assert!((completion - 100.0).abs() < 0.1);
}
