//! Error types for the HTTP server

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use leanspec_core::{CoreError, ErrorCode, StructuredError};
use serde::Serialize;
use serde_json::Value;
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
pub struct StructuredApiError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

/// Map an `ErrorCode` to the appropriate HTTP status.
///
/// This is the single place where error codes are mapped to HTTP semantics.
pub fn error_code_to_status(code: ErrorCode) -> StatusCode {
    match code {
        ErrorCode::NotFound | ErrorCode::ProjectNotFound | ErrorCode::SpecNotFound => {
            StatusCode::NOT_FOUND
        }
        ErrorCode::NoProject | ErrorCode::InvalidRequest | ErrorCode::ValidationFailed => {
            StatusCode::BAD_REQUEST
        }
        ErrorCode::CircularDependency | ErrorCode::TokenLimitExceeded => {
            StatusCode::UNPROCESSABLE_ENTITY
        }
        ErrorCode::Unauthorized => StatusCode::UNAUTHORIZED,
        ErrorCode::ToolNotFound => StatusCode::NOT_FOUND,
        ErrorCode::ToolError => StatusCode::BAD_REQUEST,
        ErrorCode::ModelNotAvailable => StatusCode::SERVICE_UNAVAILABLE,
        ErrorCode::AiProviderError => StatusCode::BAD_GATEWAY,
        ErrorCode::IoError
        | ErrorCode::DatabaseError
        | ErrorCode::ConfigError
        | ErrorCode::SerializationError
        | ErrorCode::InternalError => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiError {
    pub error: StructuredApiError,
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

impl ApiError {
    pub fn new(code: &str, error: impl Into<String>) -> Self {
        let message = error.into();
        Self {
            error: StructuredApiError {
                code: code.to_string(),
                message: message.clone(),
                details: None,
            },
            code: code.to_string(),
            message,
            details: None,
        }
    }

    pub fn with_details(mut self, details: impl Into<Value>) -> Self {
        let value = details.into();
        self.details = Some(value.clone());
        self.error.details = Some(value);
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

impl From<StructuredError> for ApiError {
    fn from(err: StructuredError) -> Self {
        let mut api_err = Self::new(err.code.as_str(), err.message);
        if let Some(details) = err.details {
            api_err = api_err.with_details(details);
        }
        api_err
    }
}

/// Result type for API handlers that may fail
pub type ApiResult<T> = Result<T, (StatusCode, Json<ApiError>)>;

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = map_error_code_to_status(&self.code);

        // Log the error with appropriate level based on status code
        match status {
            StatusCode::INTERNAL_SERVER_ERROR => {
                tracing::error!(
                    code = %self.code,
                    error = %self.message,
                    details = ?self.details,
                    status = %status.as_u16(),
                    "API error response"
                );
            }
            StatusCode::NOT_FOUND | StatusCode::BAD_REQUEST => {
                tracing::debug!(
                    code = %self.code,
                    error = %self.message,
                    details = ?self.details,
                    status = %status.as_u16(),
                    "API error response"
                );
            }
            _ => {
                tracing::warn!(
                    code = %self.code,
                    error = %self.message,
                    details = ?self.details,
                    status = %status.as_u16(),
                    "API error response"
                );
            }
        }

        (status, Json(self)).into_response()
    }
}

/// Helper to convert various errors to API errors with logging
pub fn to_api_error<E: std::fmt::Display>(code: &str, e: E) -> (StatusCode, Json<ApiError>) {
    let api_error = ApiError::new(code, e.to_string());
    let status = map_error_code_to_status(code);

    // Log the error with context
    match status {
        StatusCode::INTERNAL_SERVER_ERROR => {
            tracing::error!(
                code = %code,
                error = %e,
                status = %status.as_u16(),
                "API error"
            );
        }
        StatusCode::NOT_FOUND | StatusCode::BAD_REQUEST => {
            tracing::debug!(
                code = %code,
                error = %e,
                status = %status.as_u16(),
                "API error"
            );
        }
        _ => {
            tracing::warn!(
                code = %code,
                error = %e,
                status = %status.as_u16(),
                "API error"
            );
        }
    }

    (status, Json(api_error))
}

fn map_error_code_to_status(code: &str) -> StatusCode {
    match code {
        "NOT_FOUND" => error_code_to_status(ErrorCode::NotFound),
        "PROJECT_NOT_FOUND" => error_code_to_status(ErrorCode::ProjectNotFound),
        "SPEC_NOT_FOUND" => error_code_to_status(ErrorCode::SpecNotFound),
        "NO_PROJECT" => error_code_to_status(ErrorCode::NoProject),
        "INVALID_REQUEST" => error_code_to_status(ErrorCode::InvalidRequest),
        "UNAUTHORIZED" => error_code_to_status(ErrorCode::Unauthorized),
        "VALIDATION_FAILED" => error_code_to_status(ErrorCode::ValidationFailed),
        "DATABASE_ERROR" => error_code_to_status(ErrorCode::DatabaseError),
        "CONFIG_ERROR" => error_code_to_status(ErrorCode::ConfigError),
        "TOOL_NOT_FOUND" => error_code_to_status(ErrorCode::ToolNotFound),
        "TOOL_ERROR" => error_code_to_status(ErrorCode::ToolError),
        "CIRCULAR_DEPENDENCY" => error_code_to_status(ErrorCode::CircularDependency),
        "TOKEN_LIMIT_EXCEEDED" => error_code_to_status(ErrorCode::TokenLimitExceeded),
        "IO_ERROR" => error_code_to_status(ErrorCode::IoError),
        "SERIALIZATION_ERROR" => error_code_to_status(ErrorCode::SerializationError),
        "AI_PROVIDER_ERROR" => error_code_to_status(ErrorCode::AiProviderError),
        "MODEL_NOT_AVAILABLE" => error_code_to_status(ErrorCode::ModelNotAvailable),
        _ => error_code_to_status(ErrorCode::InternalError),
    }
}

/// Helper to create internal error with immediate logging and backtrace capture
/// Use this in map_err closures for 500 errors to get better dev DX
#[track_caller]
pub fn internal_error<E: std::fmt::Display + std::fmt::Debug>(
    e: E,
) -> (StatusCode, Json<ApiError>) {
    let caller = std::panic::Location::caller();
    let backtrace = std::backtrace::Backtrace::capture();

    tracing::error!(
        error = %e,
        error_debug = ?e,
        file = %caller.file(),
        line = %caller.line(),
        column = %caller.column(),
        backtrace = %backtrace,
        "Internal server error"
    );

    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiError::internal_error(&e.to_string())),
    )
}
