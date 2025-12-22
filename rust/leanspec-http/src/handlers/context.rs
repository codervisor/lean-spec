//! Context file handlers for managing .lean-spec/context directory

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use serde::Serialize;
use std::fs;
use std::time::SystemTime;

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

/// Context file information
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified: Option<SystemTime>,
}

/// Response for listing context files
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListContextResponse {
    pub files: Vec<ContextFile>,
    pub total: usize,
}

/// Response for getting context file content
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextFileResponse {
    pub name: String,
    pub path: String,
    pub content: String,
    pub size: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_type: Option<String>,
}

/// GET /api/context - List context files
pub async fn list_context_files(
    State(state): State<AppState>,
) -> ApiResult<Json<ListContextResponse>> {
    // Get current project
    let registry = state.registry.read().await;
    let project = registry
        .current()
        .or_else(|| registry.all().first().map(|p| *p))
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(ApiError::no_project_selected()),
            )
        })?;

    let context_dir = project.path.join(".lean-spec").join("context");

    // If context directory doesn't exist, return empty list
    if !context_dir.exists() {
        return Ok(Json(ListContextResponse {
            files: Vec::new(),
            total: 0,
        }));
    }

    let mut files = Vec::new();

    // Recursively scan context directory
    for entry in walkdir::WalkDir::new(&context_dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();

        // Skip directories
        if path.is_dir() {
            continue;
        }

        let metadata = fs::metadata(path).ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified = metadata.and_then(|m| m.modified().ok());

        // Get relative path from context directory
        let rel_path = path
            .strip_prefix(&context_dir)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        files.push(ContextFile {
            name: path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "unknown".to_string()),
            path: rel_path,
            size,
            modified,
        });
    }

    files.sort_by(|a, b| a.path.cmp(&b.path));
    let total = files.len();

    Ok(Json(ListContextResponse { files, total }))
}

/// GET /api/context/:file - Get context file content
pub async fn get_context_file(
    State(state): State<AppState>,
    Path(file_path): Path<String>,
) -> ApiResult<Json<ContextFileResponse>> {
    // Get current project
    let registry = state.registry.read().await;
    let project = registry
        .current()
        .or_else(|| registry.all().first().map(|p| *p))
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(ApiError::no_project_selected()),
            )
        })?;

    let context_dir = project.path.join(".lean-spec").join("context");
    let full_path = context_dir.join(&file_path);

    // Security check: ensure the resolved path is within the context directory
    let canonical_context = context_dir.canonicalize().map_err(|_| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::new("NOT_FOUND", "Context directory not found")),
        )
    })?;

    let canonical_file = full_path.canonicalize().map_err(|_| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::new("NOT_FOUND", "File not found")),
        )
    })?;

    if !canonical_file.starts_with(&canonical_context) {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ApiError::new("FORBIDDEN", "Access denied")),
        ));
    }

    // Read file content
    let content = fs::read_to_string(&canonical_file).map_err(|e| {
        if e.kind() == std::io::ErrorKind::InvalidData {
            (
                StatusCode::BAD_REQUEST,
                Json(ApiError::new(
                    "BINARY_FILE",
                    "Cannot read binary file as text",
                )),
            )
        } else {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        }
    })?;

    let metadata = fs::metadata(&canonical_file).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    // Detect file type from extension
    let file_type = canonical_file
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_string());

    Ok(Json(ContextFileResponse {
        name: canonical_file
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string()),
        path: file_path,
        content,
        size: metadata.len(),
        file_type,
    }))
}
