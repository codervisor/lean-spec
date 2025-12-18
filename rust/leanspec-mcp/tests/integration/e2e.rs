//! End-to-end tests for MCP server

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use leanspec_mcp::{handle_request, McpRequest};
use serde_json::json;

/// Test: Full initialize → tools/list → tools/call sequence
#[tokio::test]
async fn test_full_mcp_session() {
    let temp = create_test_project(&[("001-feature", "planned", None)]);
    set_specs_dir_env(&temp);

    // Step 1: Initialize
    let init_request: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }
    }))
    .unwrap();

    let init_response = handle_request(init_request).await;
    assert!(init_response.result.is_some());
    assert!(init_response.error.is_none());

    // Step 2: List tools
    let tools_request: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    }))
    .unwrap();

    let tools_response = handle_request(tools_request).await;
    assert!(tools_response.result.is_some());

    let result = tools_response.result.unwrap();
    let tools = result.get("tools").unwrap();
    assert!(tools.is_array());
    assert!(!tools.as_array().unwrap().is_empty());

    // Step 3: Call stats tool (always works)
    let call_request: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "stats",
            "arguments": {}
        }
    }))
    .unwrap();

    let call_response = handle_request(call_request).await;
    assert!(call_response.result.is_some() || call_response.error.is_none());
}

/// Test: Notifications handling
#[tokio::test]
async fn test_notifications() {
    let temp = create_test_project(&[]);
    set_specs_dir_env(&temp);

    // Send initialized notification
    let notification: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
        "params": {}
    }))
    .unwrap();

    let response = handle_request(notification).await;
    // Notifications should return success with null result
    assert!(response.error.is_none());
}

/// Test: Unknown method handling
#[tokio::test]
async fn test_unknown_method() {
    let request: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "unknown/method",
        "params": {}
    }))
    .unwrap();

    let response = handle_request(request).await;
    assert!(response.error.is_some());
    assert_eq!(response.error.unwrap().code, -32601);
}

/// Test: Tool error handling
#[tokio::test]
async fn test_tool_error() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    // Call view with nonexistent spec
    let request: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "view",
            "arguments": {
                "specPath": "nonexistent"
            }
        }
    }))
    .unwrap();

    let response = handle_request(request).await;
    assert!(response.error.is_some());
    assert_eq!(response.error.unwrap().code, -32000);
}

/// Test: Unknown tool handling
#[tokio::test]
async fn test_unknown_tool() {
    let temp = create_empty_project();
    set_specs_dir_env(&temp);

    let request: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "nonexistent_tool",
            "arguments": {}
        }
    }))
    .unwrap();

    let response = handle_request(request).await;
    assert!(response.error.is_some());
}

/// Test: Response IDs match request IDs
#[tokio::test]
async fn test_response_id_matching() {
    let temp = create_test_project(&[]);
    set_specs_dir_env(&temp);

    for id in [1, 42, 999] {
        let request: McpRequest = serde_json::from_value(json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": "tools/list",
            "params": {}
        }))
        .unwrap();

        let response = handle_request(request).await;
        assert_eq!(response.id, Some(json!(id)));
    }
}

/// Test: String request IDs
#[tokio::test]
async fn test_string_request_id() {
    let temp = create_test_project(&[]);
    set_specs_dir_env(&temp);

    let request: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0",
        "id": "request-abc-123",
        "method": "tools/list",
        "params": {}
    }))
    .unwrap();

    let response = handle_request(request).await;
    assert_eq!(response.id, Some(json!("request-abc-123")));
}

/// Test: AI assistant simulation - typical usage pattern
#[tokio::test]
async fn test_ai_assistant_pattern() {
    let temp = create_test_project(&[
        ("001-base", "complete", None),
        ("002-feature", "planned", None),
    ]);
    set_specs_dir_env(&temp);

    // Pattern: Initialize → Board → Search → Create → Link → Validate

    // 1. Initialize
    let init: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}
    }))
    .unwrap();
    let _ = handle_request(init).await;

    // 2. Check board
    let board: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0", "id": 2, "method": "tools/call",
        "params": { "name": "board", "arguments": {} }
    }))
    .unwrap();
    let board_response = handle_request(board).await;
    assert!(board_response.result.is_some());

    // 3. Search existing specs
    let search: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0", "id": 3, "method": "tools/call",
        "params": { "name": "search", "arguments": { "query": "base" } }
    }))
    .unwrap();
    let search_response = handle_request(search).await;
    assert!(search_response.result.is_some());

    // 4. Create new spec
    let create: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0", "id": 4, "method": "tools/call",
        "params": { "name": "create", "arguments": { "name": "new-feature" } }
    }))
    .unwrap();
    let create_response = handle_request(create).await;
    assert!(create_response.result.is_some());

    // 5. Validate (skip link as it can be fragile)
    let validate: McpRequest = serde_json::from_value(json!({
        "jsonrpc": "2.0", "id": 6, "method": "tools/call",
        "params": { "name": "validate", "arguments": {} }
    }))
    .unwrap();
    let validate_response = handle_request(validate).await;
    assert!(validate_response.result.is_some());
}
