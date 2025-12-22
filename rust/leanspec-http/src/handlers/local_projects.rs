//! Local project handlers for discovery and directory browsing

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use leanspec_core::{DiscoveredProject, ProjectDiscovery};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

/// Request for project discovery
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverProjectsRequest {
    /// Path to start scanning from
    pub path: String,
    /// Maximum depth to scan (optional, default: 5)
    #[serde(default)]
    pub max_depth: Option<usize>,
}

/// Response for project discovery
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverProjectsResponse {
    pub projects: Vec<DiscoveredProjectResponse>,
    pub total: usize,
}

/// Discovered project for API response
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredProjectResponse {
    pub path: String,
    pub name: String,
    pub has_lean_spec: bool,
    pub specs_dir: Option<String>,
}

impl From<DiscoveredProject> for DiscoveredProjectResponse {
    fn from(project: DiscoveredProject) -> Self {
        Self {
            path: project.path.to_string_lossy().to_string(),
            name: project.name,
            has_lean_spec: project.has_lean_spec,
            specs_dir: project.specs_dir.map(|p| p.to_string_lossy().to_string()),
        }
    }
}

/// Request for directory listing
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDirectoryRequest {
    /// Path to list
    pub path: String,
    /// Show hidden files (optional, default: false)
    #[serde(default)]
    pub show_hidden: Option<bool>,
}

/// Response for directory listing
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDirectoryResponse {
    pub path: String,
    pub entries: Vec<DirectoryEntry>,
}

/// Directory entry information
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryEntry {
    pub name: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified: Option<SystemTime>,
}

/// POST /api/local-projects/discover - Discover LeanSpec projects
pub async fn discover_projects(
    State(_state): State<AppState>,
    Json(req): Json<DiscoverProjectsRequest>,
) -> ApiResult<Json<DiscoverProjectsResponse>> {
    let path = PathBuf::from(&req.path);

    if !path.exists() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiError::new("NOT_FOUND", "Path does not exist")),
        ));
    }

    // Create discovery with optional max depth
    let mut discovery = ProjectDiscovery::new();
    if let Some(max_depth) = req.max_depth {
        discovery = discovery.with_max_depth(max_depth);
    }

    // Discover projects
    let projects = discovery.discover(&path).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let total = projects.len();
    let project_responses: Vec<DiscoveredProjectResponse> =
        projects.into_iter().map(|p| p.into()).collect();

    Ok(Json(DiscoverProjectsResponse {
        projects: project_responses,
        total,
    }))
}

/// POST /api/local-projects/list-directory - List directory contents
pub async fn list_directory(
    State(_state): State<AppState>,
    Json(req): Json<ListDirectoryRequest>,
) -> ApiResult<Json<ListDirectoryResponse>> {
    let path = PathBuf::from(&req.path);

    if !path.exists() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiError::new("NOT_FOUND", "Path does not exist")),
        ));
    }

    if !path.is_dir() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Path is not a directory")),
        ));
    }

    let show_hidden = req.show_hidden.unwrap_or(false);
    let mut entries = Vec::new();

    for entry in fs::read_dir(&path).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })? {
        let entry = entry.map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files unless requested
        if !show_hidden && name.starts_with('.') {
            continue;
        }

        let metadata = entry.metadata().ok();
        let is_dir = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
        let size = metadata
            .as_ref()
            .and_then(|m| if m.is_file() { Some(m.len()) } else { None });
        let modified = metadata.and_then(|m| m.modified().ok());

        entries.push(DirectoryEntry {
            name,
            is_dir,
            size,
            modified,
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.cmp(&b.name),
    });

    Ok(Json(ListDirectoryResponse {
        path: path.to_string_lossy().to_string(),
        entries,
    }))
}
