//! Error types for the HTTP server

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use leanspec_core::CoreError;
use serde::Serialize;
use thiserror::Error;

/// Server-level errors
#[derive(Debug, Error)]
pub enum ServerError {
    #[error("Failed to bind to address: {0}")]
    BindFailed(String),

    #[error("Server error: {0}")]
    ServerError(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Project registry error: {0}")]
    RegistryError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Tool not found: {0}. {1}")]
    ToolNotFound(String, String),

    #[error("Tool error: {0}")]
    ToolError(String),
}

impl From<CoreError> for ServerError {
    fn from(error: CoreError) -> Self {
        match error {
            CoreError::DatabaseError(message) => Self::DatabaseError(message),
            CoreError::ConfigError(message) => Self::ConfigError(message),
            CoreError::ValidationError(message) => Self::ValidationError(message),
            CoreError::NotFound(message) => Self::NotFound(message),
            CoreError::RegistryError(message) => Self::RegistryError(message),
            CoreError::ToolError(message) => Self::ToolError(message),
            CoreError::ToolNotFound(tool, details) => Self::ToolNotFound(tool, details),
            CoreError::ServerError(message) => Self::ServerError(message),
            CoreError::IoError(err) => Self::ServerError(err.to_string()),
            CoreError::SerializationError(message) => Self::ServerError(message),
            CoreError::Other(message) => Self::ServerError(message),
        }
    }
}

/// API response error type
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiError {
    pub error: String,
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

impl ApiError {
    pub fn new(code: &str, error: impl Into<String>) -> Self {
        Self {
            error: error.into(),
            code: code.to_string(),
            details: None,
        }
    }

    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }

    // Common error constructors

    pub fn not_found(resource: &str) -> Self {
        Self::new("NOT_FOUND", format!("{} not found", resource))
    }

    pub fn no_project_selected() -> Self {
        Self::new(
            "NO_PROJECT",
            "No project selected. Please switch to a project first.",
        )
    }

    pub fn project_not_found(id: &str) -> Self {
        Self::new("PROJECT_NOT_FOUND", format!("Project '{}' not found", id))
    }

    pub fn spec_not_found(spec: &str) -> Self {
        Self::new("SPEC_NOT_FOUND", format!("Spec '{}' not found", spec))
    }

    pub fn invalid_request(reason: &str) -> Self {
        Self::new("INVALID_REQUEST", reason)
    }

    pub fn unauthorized(reason: &str) -> Self {
        Self::new("UNAUTHORIZED", reason)
    }

    pub fn internal_error(reason: &str) -> Self {
        Self::new("INTERNAL_ERROR", reason)
    }
}

/// Result type for API handlers that may fail
pub type ApiResult<T> = Result<T, (StatusCode, Json<ApiError>)>;

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match self.code.as_str() {
            "NOT_FOUND" | "PROJECT_NOT_FOUND" | "SPEC_NOT_FOUND" => StatusCode::NOT_FOUND,
            "NO_PROJECT" | "INVALID_REQUEST" => StatusCode::BAD_REQUEST,
            "UNAUTHORIZED" => StatusCode::UNAUTHORIZED,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };

        (status, Json(self)).into_response()
    }
}

/// Helper to convert various errors to API errors
pub fn to_api_error<E: std::fmt::Display>(code: &str, e: E) -> (StatusCode, Json<ApiError>) {
    let api_error = ApiError::new(code, e.to_string());
    let status = match code {
        "NOT_FOUND" | "PROJECT_NOT_FOUND" | "SPEC_NOT_FOUND" => StatusCode::NOT_FOUND,
        "NO_PROJECT" | "INVALID_REQUEST" => StatusCode::BAD_REQUEST,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    };
    (status, Json(api_error))
}
