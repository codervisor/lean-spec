//! Types for UI message compatibility

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UIMessage {
    pub id: String,
    pub role: MessageRole,
    pub parts: Vec<UIMessagePart>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
    Assistant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum UIMessagePart {
    Text {
        text: String,
    },
    ToolCall {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        input: serde_json::Value,
    },
    ToolResult {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        output: serde_json::Value,
    },
    File {
        url: String,
        #[serde(rename = "mediaType")]
        media_type: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        filename: Option<String>,
    },
    Reasoning {
        text: String,
    },
    SourceUrl {
        id: String,
        url: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        title: Option<String>,
    },
    SourceDocument {
        id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        title: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        media_type: Option<String>,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ui_message_serde() {
        // Test serialization
        let message = UIMessage {
            id: "msg_123".to_string(),
            role: MessageRole::User,
            parts: vec![UIMessagePart::Text {
                text: "Hello".to_string(),
            }],
            metadata: None,
        };
        let json = serde_json::to_string(&message).unwrap();
        assert!(json.contains("\"id\":\"msg_123\""));
        assert!(json.contains("\"role\":\"user\""));

        // Test deserialization
        let json =
            r#"{"id": "msg_456", "role": "assistant", "parts": [{"type": "text", "text": "Hi"}]}"#;
        let parsed: UIMessage = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.id, "msg_456");
        match &parsed.parts[0] {
            UIMessagePart::Text { text } => assert_eq!(text, "Hi"),
            _ => panic!("Expected text part"),
        }
    }

    #[test]
    fn test_message_parts_serialization() {
        // Consolidate all message part serialization tests
        // These verify serde tagged enum serialization works correctly

        // Tool call
        let tool_call = UIMessagePart::ToolCall {
            tool_call_id: "call_1".to_string(),
            tool_name: "list_specs".to_string(),
            input: serde_json::json!({ "projectId": "test" }),
        };
        let json = serde_json::to_string(&tool_call).unwrap();
        assert!(json.contains("\"type\":\"tool-call\""));
        assert!(json.contains("\"toolCallId\":\"call_1\""));

        // Tool result
        let tool_result = UIMessagePart::ToolResult {
            tool_call_id: "call_1".to_string(),
            tool_name: "get_spec".to_string(),
            output: serde_json::json!({ "title": "Test" }),
        };
        let json = serde_json::to_string(&tool_result).unwrap();
        assert!(json.contains("\"type\":\"tool-result\""));

        // File
        let file = UIMessagePart::File {
            url: "https://example.com/file.pdf".to_string(),
            media_type: "application/pdf".to_string(),
            filename: Some("doc.pdf".to_string()),
        };
        let json = serde_json::to_string(&file).unwrap();
        assert!(json.contains("\"type\":\"file\""));
        assert!(json.contains("\"mediaType\":\"application/pdf\""));

        // Reasoning
        let reasoning = UIMessagePart::Reasoning {
            text: "Thinking...".to_string(),
        };
        assert!(serde_json::to_string(&reasoning)
            .unwrap()
            .contains("\"type\":\"reasoning\""));

        // Source URL
        let source = UIMessagePart::SourceUrl {
            id: "src_1".to_string(),
            url: "https://example.com".to_string(),
            title: Some("Example".to_string()),
        };
        assert!(serde_json::to_string(&source)
            .unwrap()
            .contains("\"type\":\"source-url\""));
    }

    #[test]
    fn test_message_role_serialization() {
        assert_eq!(
            serde_json::to_string(&MessageRole::System).unwrap(),
            "\"system\""
        );
        assert_eq!(
            serde_json::to_string(&MessageRole::User).unwrap(),
            "\"user\""
        );
        assert_eq!(
            serde_json::to_string(&MessageRole::Assistant).unwrap(),
            "\"assistant\""
        );
    }
}
