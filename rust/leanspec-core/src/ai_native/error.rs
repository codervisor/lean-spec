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
    fn test_error_display() {
        // Consolidate all error variant display tests into one
        // These primarily verify thiserror derive works correctly
        let test_cases: Vec<(AiError, &str)> = vec![
            (
                AiError::MissingApiKey("openai".to_string()),
                "Missing API key for provider: openai",
            ),
            (
                AiError::InvalidProvider("unknown".to_string()),
                "Invalid provider: unknown",
            ),
            (
                AiError::InvalidModel("gpt-99".to_string()),
                "Invalid model: gpt-99",
            ),
            (
                AiError::Provider("Rate limited".to_string()),
                "AI provider error: Rate limited",
            ),
            (
                AiError::Tool("Tool not found".to_string()),
                "Tool error: Tool not found",
            ),
            (
                AiError::ToolExecution {
                    tool_name: "list_specs".to_string(),
                    message: "Invalid input".to_string(),
                },
                "Tool execution failed: list_specs - Invalid input",
            ),
            (
                AiError::Serialization("Invalid JSON".to_string()),
                "Serialization error: Invalid JSON",
            ),
            (
                AiError::Stream("Connection lost".to_string()),
                "Stream error: Connection lost",
            ),
            (
                AiError::InvalidRequest("Empty messages".to_string()),
                "Invalid request: Empty messages",
            ),
        ];

        for (error, expected) in test_cases {
            assert_eq!(error.to_string(), expected, "Failed for {:?}", error);
        }
    }
}
