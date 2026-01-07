//! Shared utility functions for handlers

use axum::http::StatusCode;
use axum::Json;

use crate::error::ApiError;
use crate::project_registry::Project;
use crate::state::AppState;

/// Resolve a project by ID from the registry
///
/// Returns the project if found, or a NOT_FOUND error if it doesn't exist
pub async fn resolve_project(
    state: &AppState,
    project_id: &str,
) -> Result<Project, (StatusCode, Json<ApiError>)> {
    let registry = state.registry.read().await;
    let project = registry.get(project_id).cloned();

    project.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(project_id)),
        )
    })
}
