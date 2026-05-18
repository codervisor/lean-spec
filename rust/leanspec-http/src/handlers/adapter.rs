//! Adapter introspection endpoints.
//!
//! Surfaces the active [`leanspec_core::Adapter`]'s capabilities and schema
//! for a given project so clients (UI, agents) can build adapter-aware
//! workflows without assuming markdown-specific conventions.

#![allow(clippy::result_large_err)]

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use leanspec_core::adapters::AdapterCapabilities;
use leanspec_core::SpecSchema;

use crate::adapter_resolution::resolve_adapter;
use crate::error::ApiError;
use crate::state::AppState;
use crate::utils::resolve_project;

fn api_error(err: leanspec_core::AdapterError) -> (StatusCode, Json<ApiError>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiError::new("adapter_init_failed", err.to_string())),
    )
}

/// GET /api/projects/{id}/adapter
pub async fn get_project_adapter_capabilities(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
) -> Result<Json<AdapterCapabilities>, (StatusCode, Json<ApiError>)> {
    let project = resolve_project(&state, &project_id).await?;
    let adapter = resolve_adapter(&project.path, &project.specs_dir).map_err(api_error)?;
    Ok(Json(adapter.capabilities().clone()))
}

/// GET /api/projects/{id}/schema
///
/// Returns the active adapter's `SpecSchema` so the UI can render dynamic
/// field sets without hard-coding adapter-specific conventions.
pub async fn get_project_schema(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
) -> Result<Json<SpecSchema>, (StatusCode, Json<ApiError>)> {
    let project = resolve_project(&state, &project_id).await?;
    let adapter = resolve_adapter(&project.path, &project.specs_dir).map_err(api_error)?;
    Ok(Json(adapter.schema().clone()))
}
