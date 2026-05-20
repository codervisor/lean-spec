//! Adapter introspection endpoints.
//!
//! Surfaces the active [`leanspec_core::Adapter`]'s capabilities and schema
//! for a given project so clients (UI, agents) can build adapter-aware
//! workflows without assuming markdown-specific conventions.
//!
//! Reads route through the shared [`leanspec_core::adapters::AdapterCache`]
//! so network-backed schema enrichment (GitHub labels, ADO states, Jira
//! statuses) is paid once per cache window rather than once per request.
//! `POST /api/projects/{id}/schema/refresh` flushes the cache for a project
//! and re-resolves the adapter immediately.

#![allow(clippy::result_large_err)]

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use leanspec_core::adapters::AdapterCapabilities;
use leanspec_core::SpecSchema;
use serde::Serialize;

use crate::adapter_resolution::{refresh_adapter, resolve_adapter_cached};
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
    let adapter = resolve_adapter_cached(&state.adapter_cache, &project.path, &project.specs_dir)
        .map_err(api_error)?;
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
    let adapter = resolve_adapter_cached(&state.adapter_cache, &project.path, &project.specs_dir)
        .map_err(api_error)?;
    Ok(Json(adapter.schema().clone()))
}

/// Response body for `POST /api/projects/{id}/schema/refresh`.
#[derive(Debug, Serialize)]
pub struct SchemaRefreshResponse {
    /// The adapter name (`markdown` / `github` / `ado` / `jira`).
    pub adapter: String,
    /// The freshly-resolved schema.
    pub schema: SpecSchema,
}

/// POST /api/projects/{id}/schema/refresh
///
/// Flushes the cached adapter for this project and re-runs schema enrichment
/// (e.g. re-fetches GitHub labels / Jira statuses). The response carries the
/// freshly-resolved schema so callers don't need a follow-up GET.
pub async fn refresh_project_schema(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
) -> Result<Json<SchemaRefreshResponse>, (StatusCode, Json<ApiError>)> {
    let project = resolve_project(&state, &project_id).await?;
    let adapter = refresh_adapter(&state.adapter_cache, &project.path, &project.specs_dir)
        .map_err(api_error)?;
    Ok(Json(SchemaRefreshResponse {
        adapter: adapter.capabilities().name.clone(),
        schema: adapter.schema().clone(),
    }))
}
