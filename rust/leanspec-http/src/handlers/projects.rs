//! Project management handlers

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::error::{ApiError, ApiResult};
use crate::project_registry::{Project, ProjectUpdate};
use crate::state::AppState;

/// Response for project list
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectsListResponse {
    pub projects: Vec<ProjectResponse>,
    pub current_project_id: Option<String>,
}

/// Project response type (camelCase for frontend compatibility)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectResponse {
    pub id: String,
    pub name: String,
    pub path: String,
    pub specs_dir: String,
    pub favorite: bool,
    pub color: Option<String>,
    pub last_accessed: String,
    pub added_at: String,
}

impl From<&Project> for ProjectResponse {
    fn from(p: &Project) -> Self {
        Self {
            id: p.id.clone(),
            name: p.name.clone(),
            path: p.path.to_string_lossy().to_string(),
            specs_dir: p.specs_dir.to_string_lossy().to_string(),
            favorite: p.favorite,
            color: p.color.clone(),
            last_accessed: p.last_accessed.to_rfc3339(),
            added_at: p.added_at.to_rfc3339(),
        }
    }
}

/// GET /api/projects - List all projects
pub async fn list_projects(State(state): State<AppState>) -> Json<ProjectsListResponse> {
    let registry = state.registry.read().await;
    let projects: Vec<ProjectResponse> = registry.all().iter().map(|p| (*p).into()).collect();
    let current_project_id = registry.current_id().map(|s| s.to_string());

    Json(ProjectsListResponse {
        projects,
        current_project_id,
    })
}

/// Request body for adding a project
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddProjectRequest {
    pub path: String,
}

/// POST /api/projects - Add a new project
pub async fn add_project(
    State(state): State<AppState>,
    Json(req): Json<AddProjectRequest>,
) -> ApiResult<Json<ProjectResponse>> {
    let path = PathBuf::from(&req.path);

    let mut registry = state.registry.write().await;
    let project = registry.add(&path).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    Ok(Json((&project).into()))
}

/// GET /api/projects/:id - Get a project by ID
pub async fn get_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<Json<ProjectResponse>> {
    let registry = state.registry.read().await;
    let project = registry.get(&id).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&id)),
        )
    })?;

    Ok(Json(project.into()))
}

/// PATCH /api/projects/:id - Update a project
pub async fn update_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(updates): Json<ProjectUpdate>,
) -> ApiResult<Json<ProjectResponse>> {
    let mut registry = state.registry.write().await;
    let project = registry.update(&id, updates).map_err(|e| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&e.to_string())),
        )
    })?;

    Ok(Json(project.into()))
}

/// DELETE /api/projects/:id - Remove a project
pub async fn remove_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<StatusCode> {
    let mut registry = state.registry.write().await;
    registry.remove(&id).map_err(|e| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&e.to_string())),
        )
    })?;

    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/projects/:id/switch - Switch to a project
pub async fn switch_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<Json<ProjectResponse>> {
    let mut registry = state.registry.write().await;
    let project = registry.set_current(&id).map_err(|e| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&e.to_string())),
        )
    })?;

    Ok(Json(project.into()))
}

/// POST /api/projects/:id/favorite - Toggle favorite status
pub async fn toggle_favorite(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<Json<serde_json::Value>> {
    let mut registry = state.registry.write().await;
    let is_favorite = registry.toggle_favorite(&id).map_err(|e| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&e.to_string())),
        )
    })?;

    Ok(Json(serde_json::json!({ "favorite": is_favorite })))
}

/// POST /api/projects/refresh - Refresh and clean up invalid projects
pub async fn refresh_projects(State(state): State<AppState>) -> Json<serde_json::Value> {
    let mut registry = state.registry.write().await;
    let removed = registry.refresh().unwrap_or(0);

    Json(serde_json::json!({
        "removed": removed,
        "message": format!("Removed {} invalid projects", removed)
    }))
}
