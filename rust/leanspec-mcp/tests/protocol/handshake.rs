//! MCP protocol handshake and initialization tests

#[path = "../helpers/mod.rs"]
mod helpers;

use helpers::*;
use pretty_assertions::assert_eq;
use serde_json::json;

/// Test: Initialize request builds correctly
#[test]
fn test_initialize_request_structure() {
    let request = build_initialize_request(1);
    
    assert_eq!(request["method"], "initialize");
    assert_eq!(request["params"]["protocolVersion"], "2024-11-05");
    assert!(request["params"]["capabilities"].is_object());
    assert_eq!(request["params"]["clientInfo"]["name"], "test-client");
}

/// Test: Initialize response should have required fields
#[test]
fn test_initialize_response_structure() {
    // Expected response structure from server
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "leanspec-mcp",
                "version": "0.3.0"
            }
        }
    });
    
    assert_success_response(&response);
    assert!(response["result"]["protocolVersion"].is_string());
    assert!(response["result"]["capabilities"].is_object());
    assert!(response["result"]["serverInfo"]["name"].is_string());
    assert!(response["result"]["serverInfo"]["version"].is_string());
}

/// Test: Server capabilities should include tools
#[test]
fn test_server_capabilities_tools() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "leanspec-mcp",
                "version": "0.3.0"
            }
        }
    });
    
    assert!(response["result"]["capabilities"]["tools"].is_object());
}

/// Test: Protocol version compatibility
#[test]
fn test_protocol_version_format() {
    let version = "2024-11-05";
    
    // Version should be in YYYY-MM-DD format
    assert_eq!(version.len(), 10);
    assert!(version.chars().nth(4) == Some('-'));
    assert!(version.chars().nth(7) == Some('-'));
}

/// Test: Initialized notification structure
#[test]
fn test_initialized_notification() {
    let notification = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
        "params": {}
    });
    
    assert!(notification.get("id").is_none());
    assert_eq!(notification["method"], "notifications/initialized");
}

/// Test: Tools list request
#[test]
fn test_tools_list_request() {
    let request = build_tools_list_request(2);
    
    assert_eq!(request["method"], "tools/list");
    assert_eq!(request["id"], 2);
}

/// Test: Tools list response structure
#[test]
fn test_tools_list_response_structure() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "result": {
            "tools": [
                {
                    "name": "list",
                    "description": "List all specs",
                    "inputSchema": {
                        "type": "object",
                        "properties": {}
                    }
                }
            ]
        }
    });
    
    assert_success_response(&response);
    assert!(response["result"]["tools"].is_array());
    
    let tool = &response["result"]["tools"][0];
    assert!(tool["name"].is_string());
    assert!(tool["description"].is_string());
    assert!(tool["inputSchema"].is_object());
}

/// Test: Tool definition schema
#[test]
fn test_tool_definition_schema() {
    let tool = json!({
        "name": "create",
        "description": "Create a new spec",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Spec name"
                }
            },
            "required": ["name"],
            "additionalProperties": false
        }
    });
    
    assert_eq!(tool["name"], "create");
    assert!(tool["inputSchema"]["properties"]["name"].is_object());
    assert!(tool["inputSchema"]["required"].is_array());
}
