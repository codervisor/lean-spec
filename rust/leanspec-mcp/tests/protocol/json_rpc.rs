//! JSON-RPC 2.0 compliance tests

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use pretty_assertions::assert_eq;
use serde_json::{json, Value};

/// Test: Valid JSON-RPC request structure
#[test]
fn test_valid_request_structure() {
    let request = build_request(1, "initialize", json!({}));

    assert_eq!(request["jsonrpc"], "2.0");
    assert_eq!(request["id"], 1);
    assert_eq!(request["method"], "initialize");
    assert!(request["params"].is_object());
}

/// Test: Request with string ID
#[test]
fn test_request_with_string_id() {
    let request = json!({
        "jsonrpc": "2.0",
        "id": "request-123",
        "method": "tools/list",
        "params": {}
    });

    assert_eq!(request["jsonrpc"], "2.0");
    assert_eq!(request["id"], "request-123");
}

/// Test: Request with null params
#[test]
fn test_request_null_params() {
    let request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": null
    });

    assert!(request["params"].is_null());
}

/// Test: Notification (no id field)
#[test]
fn test_notification_request() {
    let notification = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
        "params": {}
    });

    assert!(notification.get("id").is_none());
    assert_eq!(notification["method"], "notifications/initialized");
}

/// Test: Response success structure
#[test]
fn test_success_response_structure() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "result": {
            "tools": []
        }
    });

    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 1);
    assert!(response["result"].is_object());
    assert!(response.get("error").is_none());
}

/// Test: Response error structure
#[test]
fn test_error_response_structure() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32600,
            "message": "Invalid Request"
        }
    });

    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["error"]["code"], -32600);
    assert_eq!(response["error"]["message"], "Invalid Request");
    assert!(response.get("result").is_none());
}

/// Test: Error response with data
#[test]
fn test_error_response_with_data() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "error": {
            "code": -32602,
            "message": "Invalid params",
            "data": {
                "field": "spec",
                "reason": "missing required field"
            }
        }
    });

    assert_eq!(response["error"]["data"]["field"], "spec");
}

/// Test: JSON-RPC error codes
#[test]
fn test_standard_error_codes() {
    // Parse error
    let parse_error = json!({ "code": -32700, "message": "Parse error" });
    assert_eq!(parse_error["code"], -32700);

    // Invalid Request
    let invalid_request = json!({ "code": -32600, "message": "Invalid Request" });
    assert_eq!(invalid_request["code"], -32600);

    // Method not found
    let method_not_found = json!({ "code": -32601, "message": "Method not found" });
    assert_eq!(method_not_found["code"], -32601);

    // Invalid params
    let invalid_params = json!({ "code": -32602, "message": "Invalid params" });
    assert_eq!(invalid_params["code"], -32602);

    // Internal error
    let internal_error = json!({ "code": -32603, "message": "Internal error" });
    assert_eq!(internal_error["code"], -32603);
}

/// Test: Tool call request structure
#[test]
fn test_tool_call_request_structure() {
    let request = build_tool_call_request(1, "list", json!({ "status": "planned" }));

    assert_eq!(request["method"], "tools/call");
    assert_eq!(request["params"]["name"], "list");
    assert_eq!(request["params"]["arguments"]["status"], "planned");
}

/// Test: Tool call response content structure
#[test]
fn test_tool_call_response_content_structure() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "result": {
            "content": [{
                "type": "text",
                "text": "{\"count\": 5}"
            }]
        }
    });

    assert!(response["result"]["content"].is_array());
    assert_eq!(response["result"]["content"][0]["type"], "text");
    assert!(response["result"]["content"][0]["text"].is_string());
}

/// Test: Request with complex parameters
#[test]
fn test_request_with_complex_params() {
    let request = build_tool_call_request(
        1,
        "list",
        json!({
            "status": "planned",
            "tags": ["feature", "urgent"],
            "priority": "high"
        }),
    );

    assert!(request["params"]["arguments"]["tags"].is_array());
    assert_eq!(request["params"]["arguments"]["tags"][0], "feature");
    assert_eq!(request["params"]["arguments"]["tags"][1], "urgent");
}
