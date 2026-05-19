//! Tool error vocabulary.
//!
//! `McpToolError` is mapped to a structured JSON-RPC error (`errorCode` in
//! `data`) by the dispatch layer so MCP clients can react programmatically
//! without parsing free-form strings.

use leanspec_core::adapters::AdapterError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum McpToolError {
    #[error("invalid request: {0}")]
    InvalidRequest(String),

    #[error("spec not found: {0}")]
    NotFound(String),

    #[error("validation failed: {0}")]
    Validation(String),

    #[error("operation not supported by adapter '{adapter}': {reason}")]
    NotSupported { adapter: String, reason: String },

    #[error("authentication failed: {0}")]
    Unauthorized(String),

    #[error("backend error: {0}")]
    Backend(String),

    #[error("adapter init failed: {0}")]
    AdapterInit(String),

    #[error("internal error: {0}")]
    Internal(String),
}

impl McpToolError {
    /// Stable error code surfaced in the JSON-RPC error `data.errorCode`.
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidRequest(_) => "INVALID_REQUEST",
            Self::NotFound(_) => "SPEC_NOT_FOUND",
            Self::Validation(_) => "VALIDATION_FAILED",
            Self::NotSupported { .. } => "ADAPTER_NOT_SUPPORTED",
            Self::Unauthorized(_) => "UNAUTHORIZED",
            Self::Backend(_) => "BACKEND_ERROR",
            Self::AdapterInit(_) => "ADAPTER_INIT_FAILED",
            Self::Internal(_) => "INTERNAL_ERROR",
        }
    }

    /// JSON-RPC numeric code. Application errors use the conventional
    /// `-32000` range; `-32602` is the standard "Invalid params" code.
    pub fn jsonrpc_code(&self) -> i32 {
        match self {
            Self::InvalidRequest(_) => -32602,
            _ => -32000,
        }
    }
}

impl From<AdapterError> for McpToolError {
    fn from(err: AdapterError) -> Self {
        match err {
            AdapterError::NotFound(id) => Self::NotFound(id),
            AdapterError::NotSupported { adapter, operation } => Self::NotSupported {
                adapter,
                reason: format!("operation '{operation}' is unsupported"),
            },
            AdapterError::InvalidField { adapter, reason } => {
                Self::Validation(format!("{adapter}: {reason}"))
            }
            AdapterError::AuthError { adapter, reason } => {
                Self::Unauthorized(format!("{adapter}: {reason}"))
            }
            AdapterError::ConfigError(reason) => Self::AdapterInit(reason),
            AdapterError::ParseError { reason, .. } => Self::Validation(reason),
            AdapterError::BackendError { adapter, reason } => {
                Self::Backend(format!("{adapter}: {reason}"))
            }
            AdapterError::RateLimit { .. } => Self::Backend(err.to_string()),
            AdapterError::IoError(e) => Self::Internal(e.to_string()),
        }
    }
}
