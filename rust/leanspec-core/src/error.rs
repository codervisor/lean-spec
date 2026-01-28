//! Error types for leanspec-core
//!
//! Provides common error types used across all core modules.

use thiserror::Error;

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
impl From<rusqlite::Error> for CoreError {
    fn from(e: rusqlite::Error) -> Self {
        CoreError::DatabaseError(e.to_string())
    }
}

/// Result type alias for core operations
pub type CoreResult<T> = Result<T, CoreError>;
