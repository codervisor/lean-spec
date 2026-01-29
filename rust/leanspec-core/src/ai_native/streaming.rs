//! SSE stream events for AI SDK UI compatibility

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum StreamEvent {
    #[serde(rename = "start")]
    MessageStart {
        #[serde(rename = "messageId")]
        message_id: String,
    },
    #[serde(rename = "text-start")]
    TextStart { id: String },
    #[serde(rename = "text-delta")]
    TextDelta { id: String, delta: String },
    #[serde(rename = "text-end")]
    TextEnd { id: String },
    #[serde(rename = "tool-input-start")]
    ToolInputStart {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
    },
    #[serde(rename = "tool-input-delta")]
    ToolInputDelta {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "inputTextDelta")]
        input_text_delta: String,
    },
    #[serde(rename = "tool-input-available")]
    ToolInputAvailable {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        input: serde_json::Value,
    },
    #[serde(rename = "tool-output-available")]
    ToolOutputAvailable {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        output: serde_json::Value,
    },
    #[serde(rename = "start-step")]
    StartStep,
    #[serde(rename = "finish-step")]
    FinishStep,
    #[serde(rename = "finish")]
    Finish,
    #[serde(rename = "error")]
    Error {
        #[serde(rename = "errorText")]
        error_text: String,
    },
}

impl StreamEvent {
    pub fn to_sse_string(&self) -> String {
        let json = serde_json::to_string(self).unwrap_or_else(|_| "{}".to_string());
        format!("data: {}\n\n", json)
    }
}

pub fn sse_done() -> String {
    "data: [DONE]\n\n".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stream_event_serialization() {
        // Consolidate all SSE event serialization tests into one
        // These primarily verify serde derive and SSE format work correctly

        // Test message start
        let event = StreamEvent::MessageStart {
            message_id: "msg_123".to_string(),
        };
        let sse = event.to_sse_string();
        assert!(sse.starts_with("data: ") && sse.ends_with("\n\n"), "SSE format");
        assert!(sse.contains("\"type\":\"start\""));
        assert!(sse.contains("\"messageId\":\"msg_123\""));

        // Test text events
        let text_start = StreamEvent::TextStart { id: "t1".to_string() };
        assert!(text_start.to_sse_string().contains("\"type\":\"text-start\""));

        let text_delta = StreamEvent::TextDelta { id: "t1".to_string(), delta: "Hello".to_string() };
        assert!(text_delta.to_sse_string().contains("\"delta\":\"Hello\""));

        let text_end = StreamEvent::TextEnd { id: "t1".to_string() };
        assert!(text_end.to_sse_string().contains("\"type\":\"text-end\""));

        // Test tool events
        let tool_start = StreamEvent::ToolInputStart {
            tool_call_id: "call_1".to_string(),
            tool_name: "list_specs".to_string(),
        };
        let tool_start_sse = tool_start.to_sse_string();
        assert!(tool_start_sse.contains("\"toolCallId\":\"call_1\""));
        assert!(tool_start_sse.contains("\"toolName\":\"list_specs\""));

        let tool_available = StreamEvent::ToolInputAvailable {
            tool_call_id: "call_2".to_string(),
            tool_name: "get_spec".to_string(),
            input: serde_json::json!({ "id": "test" }),
        };
        assert!(tool_available.to_sse_string().contains("\"type\":\"tool-input-available\""));

        let tool_output = StreamEvent::ToolOutputAvailable {
            tool_call_id: "call_2".to_string(),
            output: serde_json::json!({ "result": "success" }),
        };
        assert!(tool_output.to_sse_string().contains("\"result\":\"success\""));

        // Test step and control events
        assert!(StreamEvent::StartStep.to_sse_string().contains("\"type\":\"start-step\""));
        assert!(StreamEvent::FinishStep.to_sse_string().contains("\"type\":\"finish-step\""));
        assert!(StreamEvent::Finish.to_sse_string().contains("\"type\":\"finish\""));

        let error = StreamEvent::Error { error_text: "Something went wrong".to_string() };
        assert!(error.to_sse_string().contains("\"errorText\":\"Something went wrong\""));

        // Test done marker
        assert_eq!(sse_done(), "data: [DONE]\n\n");
    }
}
