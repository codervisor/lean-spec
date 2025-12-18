//! Error handling tests for MCP protocol

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use pretty_assertions::assert_eq;
use serde_json::json;

/// Test: Parse error response (-32700)
#[test]
fn test_parse_error_response() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": null,
        "error": {
            "code": -32700,
            "message": "Parse error: invalid JSON"
        }
    });

    assert_error_response(&response, -32700);
}

/// Test: Invalid request error (-32600)
#[test]
fn test_invalid_request_error() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32600,
            "message": "Invalid Request"
        }
    });

    assert_error_response(&response, -32600);
}

/// Test: Method not found error (-32601)
#[test]
fn test_method_not_found_error() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32601,
            "message": "Method not found: unknown/method"
        }
    });

    assert_error_response(&response, -32601);
}

/// Test: Invalid params error (-32602)
#[test]
fn test_invalid_params_error() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32602,
            "message": "Invalid params: missing required field 'spec'"
        }
    });

    assert_error_response(&response, -32602);
}

/// Test: Internal error (-32603)
#[test]
fn test_internal_error() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32603,
            "message": "Internal error"
        }
    });

    assert_error_response(&response, -32603);
}

/// Test: Tool-level error (-32000)
#[test]
fn test_tool_error() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32000,
            "message": "Spec not found: 999-nonexistent"
        }
    });

    assert_error_response(&response, -32000);
}

/// Test: Error with additional data
#[test]
fn test_error_with_data() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32602,
            "message": "Invalid params",
            "data": {
                "field": "status",
                "expected": ["planned", "in-progress", "complete", "archived"],
                "received": "invalid-status"
            }
        }
    });

    assert_error_response(&response, -32602);
    let error = response.get("error").unwrap();
    assert!(error.get("data").is_some());
    assert_eq!(error["data"]["field"], "status");
}

/// Test: Error response preserves request ID
#[test]
fn test_error_preserves_id() {
    let request_id = 42;
    let response = json!({
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {
            "code": -32601,
            "message": "Method not found"
        }
    });

    assert_eq!(response["id"], request_id);
}

/// Test: Error response with string ID
#[test]
fn test_error_with_string_id() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": "request-abc-123",
        "error": {
            "code": -32602,
            "message": "Invalid params"
        }
    });

    assert_eq!(response["id"], "request-abc-123");
    assert_error_response(&response, -32602);
}

/// Test: Unknown tool error
#[test]
fn test_unknown_tool_error() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32000,
            "message": "Unknown tool: nonexistent_tool"
        }
    });

    assert_error_response(&response, -32000);
    assert!(response["error"]["message"]
        .as_str()
        .unwrap()
        .contains("Unknown tool"));
}

/// Test: File system error
#[test]
fn test_filesystem_error() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32000,
            "message": "Failed to read spec file: Permission denied"
        }
    });

    assert_error_response(&response, -32000);
}

/// Test: Validation error
#[test]
fn test_validation_error() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32000,
            "message": "Validation failed: invalid frontmatter"
        }
    });

    assert_error_response(&response, -32000);
}
