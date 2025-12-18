//! Tests for the `board` MCP tool

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use leanspec_mcp::tools::call_tool;
use pretty_assertions::assert_eq;
use serde_json::json;

#[tokio::test]
async fn test_board_group_by_status() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "in-progress", None),
        ("003-feature-c", "complete", None),
        ("004-feature-d", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("board", json!({ "groupBy": "status" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["groupBy"], "status");
    assert_eq!(output["total"], 4);
    assert!(output["groups"].is_array());
}

#[tokio::test]
async fn test_board_default_group_by() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    // No groupBy specified, should default to "status"
    let result = call_tool("board", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["groupBy"], "status");
}

#[tokio::test]
async fn test_board_group_by_priority() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", Some("high")),
        ("002-feature-b", "planned", Some("low")),
        ("003-feature-c", "planned", Some("high")),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("board", json!({ "groupBy": "priority" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["groupBy"], "priority");

    // Should have groups for high and low
    let groups = output["groups"].as_array().unwrap();
    // Check we have some groups
    assert!(!groups.is_empty());
}

#[tokio::test]
async fn test_board_group_by_assignee() {
    let temp = create_empty_project();
    let specs_dir = temp.path().join("specs");

    // Create specs with assignees
    for (name, assignee) in [
        ("001-spec-a", "alice"),
        ("002-spec-b", "bob"),
        ("003-spec-c", "alice"),
    ] {
        let spec_dir = specs_dir.join(name);
        std::fs::create_dir_all(&spec_dir).unwrap();
        let content = format!(
            "---\nstatus: planned\ncreated: '2025-01-01'\nassignee: {}\ncreated_at: '2025-01-01T00:00:00Z'\n---\n\n# {}\n",
            assignee, name
        );
        std::fs::write(spec_dir.join("README.md"), content).unwrap();
    }
    set_specs_dir_env(&temp);

    let result = call_tool("board", json!({ "groupBy": "assignee" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["groupBy"], "assignee");

    let groups = output["groups"].as_array().unwrap();
    let alice_group = groups.iter().find(|g| g["name"] == "alice");
    assert!(alice_group.is_some());
    assert_eq!(alice_group.unwrap()["count"], 2);
}

#[tokio::test]
async fn test_board_group_by_tag() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None),
        ("002-feature-b", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("board", json!({ "groupBy": "tag" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["groupBy"], "tag");

    // All specs have "test" tag from helper
    let groups = output["groups"].as_array().unwrap();
    let test_group = groups.iter().find(|g| g["name"] == "test");
    assert!(test_group.is_some());
}

#[tokio::test]
async fn test_board_empty_project() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let result = call_tool("board", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    assert_eq!(output["total"], 0);
}

#[tokio::test]
async fn test_board_output_structure() {
    let temp = create_test_project(&[("001-feature-a", "planned", None)]);
    set_specs_dir_env(&temp);

    let result = call_tool("board", json!({})).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();

    assert!(output["groupBy"].is_string());
    assert!(output["total"].is_number());
    assert!(output["groups"].is_array());

    if let Some(groups) = output["groups"].as_array() {
        if !groups.is_empty() {
            let group = &groups[0];
            assert!(group["name"].is_string());
            assert!(group["count"].is_number());
            assert!(group["specs"].is_array());

            if let Some(specs) = group["specs"].as_array() {
                if !specs.is_empty() {
                    let spec = &specs[0];
                    assert!(spec["path"].is_string());
                    assert!(spec["title"].is_string());
                    assert!(spec["status"].is_string());
                }
            }
        }
    }
}

#[tokio::test]
async fn test_board_unassigned_group() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None), // No assignee
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("board", json!({ "groupBy": "assignee" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    let groups = output["groups"].as_array().unwrap();

    // Should have at least one group
    assert!(!groups.is_empty());
}

#[tokio::test]
async fn test_board_none_priority_group() {
    let temp = create_test_project(&[
        ("001-feature-a", "planned", None), // No priority
    ]);
    set_specs_dir_env(&temp);

    let result = call_tool("board", json!({ "groupBy": "priority" })).await;
    assert!(result.is_ok());

    let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
    let groups = output["groups"].as_array().unwrap();

    // Should have "none" group for specs without priority
    let none_group = groups.iter().find(|g| g["name"] == "none");
    assert!(none_group.is_some());
}
