//! Adapter introspection endpoint.
//!
//! Returns the active [`leanspec_core::Adapter`]'s capabilities for a given
//! project so clients (UI, agents) can build adapter-aware workflows without
//! assuming markdown-specific conventions.

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use leanspec_core::adapters::{AdapterCapabilities, AdapterConfig, AdapterRegistry};

use crate::error::ApiError;
use crate::state::AppState;
use crate::utils::resolve_project;

/// GET /api/projects/{id}/adapter
pub async fn get_project_adapter_capabilities(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
) -> Result<Json<AdapterCapabilities>, (StatusCode, Json<ApiError>)> {
    let project = resolve_project(&state, &project_id).await?;
    let config = AdapterConfig::Markdown {
        directory: project.specs_dir.to_string_lossy().to_string(),
    };
    let adapter = AdapterRegistry::create(&config).map_err(|err| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::new("adapter_init_failed", err.to_string())),
        )
    })?;
    Ok(Json(adapter.capabilities().clone()))
}
