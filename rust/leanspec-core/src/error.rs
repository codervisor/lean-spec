//! Error types for leanspec-core
//!
//! Provides common error types used across all core modules.

use serde::Serialize;
use thiserror::Error;

/// Unified error codes shared across all LeanSpec layers.
///
/// These codes form a stable contract between the Rust backend, HTTP API,
/// MCP server, and TypeScript UI.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    // Resource errors
    NotFound,
    ProjectNotFound,
    SpecNotFound,
    NoProject,

    // Validation errors
    InvalidRequest,
    ValidationFailed,
    TokenLimitExceeded,
    CircularDependency,

    // Auth errors
    Unauthorized,

    // Tool errors
    ToolNotFound,
    ToolError,

    // System errors
    IoError,
    DatabaseError,
    ConfigError,
    SerializationError,
    InternalError,

    // AI errors
    AiProviderError,
    ModelNotAvailable,
}

impl ErrorCode {
    /// Returns the canonical string representation of this error code.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::NotFound => "NOT_FOUND",
            Self::ProjectNotFound => "PROJECT_NOT_FOUND",
            Self::SpecNotFound => "SPEC_NOT_FOUND",
            Self::NoProject => "NO_PROJECT",
            Self::InvalidRequest => "INVALID_REQUEST",
            Self::ValidationFailed => "VALIDATION_FAILED",
            Self::TokenLimitExceeded => "TOKEN_LIMIT_EXCEEDED",
            Self::CircularDependency => "CIRCULAR_DEPENDENCY",
            Self::Unauthorized => "UNAUTHORIZED",
            Self::ToolNotFound => "TOOL_NOT_FOUND",
            Self::ToolError => "TOOL_ERROR",
            Self::IoError => "IO_ERROR",
            Self::DatabaseError => "DATABASE_ERROR",
            Self::ConfigError => "CONFIG_ERROR",
            Self::SerializationError => "SERIALIZATION_ERROR",
            Self::InternalError => "INTERNAL_ERROR",
            Self::AiProviderError => "AI_PROVIDER_ERROR",
            Self::ModelNotAvailable => "MODEL_NOT_AVAILABLE",
        }
    }
}

impl std::fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Structured error that flows from core → HTTP/MCP → client.
#[derive(Debug, Clone, Serialize)]
pub struct StructuredError {
    /// Machine-readable error code.
    pub code: ErrorCode,
    /// Human-readable error message.
    pub message: String,
    /// Optional context about the error (e.g. which spec, which field).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

/// Core error type for all core operations
#[derive(Error, Debug)]
pub enum CoreError {
    /// Database operation failed
    #[error("Database error: {0}")]
    DatabaseError(String),

    /// Configuration error
    #[error("Configuration error: {0}")]
    ConfigError(String),

    /// Validation error
    #[error("Validation error: {0}")]
    ValidationError(String),

    /// Not found error
    #[error("Not found: {0}")]
    NotFound(String),

    /// Registry error
    #[error("Registry error: {0}")]
    RegistryError(String),

    /// Tool error
    #[error("Tool error: {0}")]
    ToolError(String),

    /// Tool not found
    #[error("Tool '{0}' not found: {1}")]
    ToolNotFound(String, String),

    /// Server error (for backward compatibility)
    #[error("Server error: {0}")]
    ServerError(String),

    /// I/O error
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    /// Serialization error
    #[error("Serialization error: {0}")]
    SerializationError(String),

    /// Other errors
    #[error("{0}")]
    Other(String),
}

impl From<serde_json::Error> for CoreError {
    fn from(e: serde_json::Error) -> Self {
        CoreError::SerializationError(e.to_string())
    }
}

impl From<serde_yaml::Error> for CoreError {
    fn from(e: serde_yaml::Error) -> Self {
        CoreError::SerializationError(e.to_string())
    }
}

#[cfg(any(feature = "sessions", feature = "storage"))]
impl From<sqlx::Error> for CoreError {
    fn from(e: sqlx::Error) -> Self {
        CoreError::DatabaseError(e.to_string())
    }
}

/// Result type alias for core operations
pub type CoreResult<T> = Result<T, CoreError>;

impl From<&CoreError> for StructuredError {
    fn from(error: &CoreError) -> Self {
        let (code, message) = match error {
            CoreError::DatabaseError(msg) => (ErrorCode::DatabaseError, msg.clone()),
            CoreError::ConfigError(msg) => (ErrorCode::ConfigError, msg.clone()),
            CoreError::ValidationError(msg) => (ErrorCode::ValidationFailed, msg.clone()),
            CoreError::NotFound(msg) => (ErrorCode::NotFound, msg.clone()),
            CoreError::RegistryError(msg) => (ErrorCode::InternalError, msg.clone()),
            CoreError::ToolError(msg) => (ErrorCode::ToolError, msg.clone()),
            CoreError::ToolNotFound(tool, details) => (
                ErrorCode::ToolNotFound,
                format!("Tool '{}' not found: {}", tool, details),
            ),
            CoreError::ServerError(msg) => (ErrorCode::InternalError, msg.clone()),
            CoreError::IoError(err) => (ErrorCode::IoError, err.to_string()),
            CoreError::SerializationError(msg) => (ErrorCode::SerializationError, msg.clone()),
            CoreError::Other(msg) => (ErrorCode::InternalError, msg.clone()),
        };

        StructuredError {
            code,
            message,
            details: None,
        }
    }
}

impl StructuredError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            details: None,
        }
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}
