//! Error types for native AI module

use thiserror::Error;

#[derive(Debug, Error)]
pub enum AiError {
    #[error("Missing API key for provider: {0}")]
    MissingApiKey(String),
    #[error("Invalid provider: {0}")]
    InvalidProvider(String),
    #[error("Invalid model: {0}")]
    InvalidModel(String),
    #[error("AI provider error: {0}")]
    Provider(String),
    #[error("Tool error: {0}")]
    Tool(String),
    #[error("Tool execution failed: {tool_name} - {message}")]
    ToolExecution { tool_name: String, message: String },
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Stream error: {0}")]
    Stream(String),
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_missing_api_key_error() {
        let err = AiError::MissingApiKey("openai".to_string());
        assert_eq!(err.to_string(), "Missing API key for provider: openai");
    }

    #[test]
    fn test_invalid_provider_error() {
        let err = AiError::InvalidProvider("unknown".to_string());
        assert_eq!(err.to_string(), "Invalid provider: unknown");
    }

    #[test]
    fn test_invalid_model_error() {
        let err = AiError::InvalidModel("gpt-99".to_string());
        assert_eq!(err.to_string(), "Invalid model: gpt-99");
    }

    #[test]
    fn test_provider_error() {
        let err = AiError::Provider("Rate limited".to_string());
        assert_eq!(err.to_string(), "AI provider error: Rate limited");
    }

    #[test]
    fn test_tool_error() {
        let err = AiError::Tool("Tool not found".to_string());
        assert_eq!(err.to_string(), "Tool error: Tool not found");
    }

    #[test]
    fn test_tool_execution_error() {
        let err = AiError::ToolExecution {
            tool_name: "list_specs".to_string(),
            message: "Invalid input".to_string(),
        };
        assert_eq!(
            err.to_string(),
            "Tool execution failed: list_specs - Invalid input"
        );
    }

    #[test]
    fn test_serialization_error() {
        let err = AiError::Serialization("Invalid JSON".to_string());
        assert_eq!(err.to_string(), "Serialization error: Invalid JSON");
    }

    #[test]
    fn test_stream_error() {
        let err = AiError::Stream("Connection lost".to_string());
        assert_eq!(err.to_string(), "Stream error: Connection lost");
    }

    #[test]
    fn test_invalid_request_error() {
        let err = AiError::InvalidRequest("Empty messages".to_string());
        assert_eq!(err.to_string(), "Invalid request: Empty messages");
    }
}
