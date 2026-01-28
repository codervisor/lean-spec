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
    #[error("Serialization error: {0}")]
    Serialization(String),
}
