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
    fn test_stream_event_to_sse_string() {
        let event = StreamEvent::MessageStart {
            message_id: "msg_123".to_string(),
        };
        let sse = event.to_sse_string();
        assert!(sse.starts_with("data: "));
        assert!(sse.contains("\"type\":\"start\""));
        assert!(sse.contains("\"messageId\":\"msg_123\""));
        assert!(sse.ends_with("\n\n"));
    }

    #[test]
    fn test_text_start_event() {
        let event = StreamEvent::TextStart {
            id: "text_456".to_string(),
        };
        let sse = event.to_sse_string();
        assert!(sse.contains("\"type\":\"text-start\""));
        assert!(sse.contains("\"id\":\"text_456\""));
    }

    #[test]
    fn test_text_delta_event() {
        let event = StreamEvent::TextDelta {
            id: "text_789".to_string(),
            delta: "Hello".to_string(),
        };
        let sse = event.to_sse_string();
        assert!(sse.contains("\"type\":\"text-delta\""));
        assert!(sse.contains("\"delta\":\"Hello\""));
    }

    #[test]
    fn test_tool_input_start_event() {
        let event = StreamEvent::ToolInputStart {
            tool_call_id: "call_abc".to_string(),
            tool_name: "list_specs".to_string(),
        };
        let sse = event.to_sse_string();
        assert!(sse.contains("\"type\":\"tool-input-start\""));
        assert!(sse.contains("\"toolCallId\":\"call_abc\""));
        assert!(sse.contains("\"toolName\":\"list_specs\""));
    }

    #[test]
    fn test_tool_input_available_event() {
        let input = serde_json::json!({ "projectId": "test" });
        let event = StreamEvent::ToolInputAvailable {
            tool_call_id: "call_def".to_string(),
            tool_name: "get_spec".to_string(),
            input,
        };
        let sse = event.to_sse_string();
        assert!(sse.contains("\"type\":\"tool-input-available\""));
        assert!(sse.contains("\"toolCallId\":\"call_def\""));
        assert!(sse.contains("\"projectId\""));
    }

    #[test]
    fn test_tool_output_available_event() {
        let output = serde_json::json!({ "result": "success" });
        let event = StreamEvent::ToolOutputAvailable {
            tool_call_id: "call_ghi".to_string(),
            output,
        };
        let sse = event.to_sse_string();
        assert!(sse.contains("\"type\":\"tool-output-available\""));
        assert!(sse.contains("\"toolCallId\":\"call_ghi\""));
        assert!(sse.contains("\"result\":\"success\""));
    }

    #[test]
    fn test_step_events() {
        let start = StreamEvent::StartStep.to_sse_string();
        assert!(start.contains("\"type\":\"start-step\""));

        let finish = StreamEvent::FinishStep.to_sse_string();
        assert!(finish.contains("\"type\":\"finish-step\""));
    }

    #[test]
    fn test_finish_event() {
        let event = StreamEvent::Finish.to_sse_string();
        assert!(event.contains("\"type\":\"finish\""));
    }

    #[test]
    fn test_error_event() {
        let event = StreamEvent::Error {
            error_text: "Something went wrong".to_string(),
        };
        let sse = event.to_sse_string();
        assert!(sse.contains("\"type\":\"error\""));
        assert!(sse.contains("\"errorText\":\"Something went wrong\""));
    }

    #[test]
    fn test_sse_done() {
        let done = sse_done();
        assert_eq!(done, "data: [DONE]\n\n");
    }
}
