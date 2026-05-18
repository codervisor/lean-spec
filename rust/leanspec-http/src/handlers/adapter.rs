//! Adapter introspection endpoints.
//!
//! Surfaces the active [`leanspec_core::Adapter`]'s capabilities and schema
//! for a given project so clients (UI, agents) can build adapter-aware
//! workflows without assuming markdown-specific conventions.

#![allow(clippy::result_large_err)]

use std::path::Path as FsPath;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use leanspec_core::adapters::{AdapterCapabilities, AdapterConfig, AdapterRegistry};
use leanspec_core::SpecSchema;

use crate::error::ApiError;
use crate::state::AppState;
use crate::utils::resolve_project;

/// Candidate file paths (relative to the project root) for adapter config,
/// in priority order. The legacy `provider:` files are honoured so existing
/// projects keep working.
const ADAPTER_CONFIG_CANDIDATES: &[&str] = &[
    "leanspec.adapter.yaml",
    ".lean-spec/adapter.yaml",
    "leanspec.provider.yaml",
    ".lean-spec/provider.yaml",
];

fn resolve_adapter_for_project(
    project_root: &FsPath,
    specs_dir: &FsPath,
) -> Result<Box<dyn leanspec_core::Adapter>, (StatusCode, Json<ApiError>)> {
    for candidate in ADAPTER_CONFIG_CANDIDATES {
        let path = project_root.join(candidate);
        if path.exists() {
            let config = AdapterRegistry::load_config(&path).map_err(api_error)?;
            return AdapterRegistry::create(&config).map_err(api_error);
        }
    }

    let config = AdapterConfig {
        adapter: "markdown".into(),
        settings: serde_json::json!({ "directory": specs_dir.to_string_lossy().as_ref() }),
    };
    AdapterRegistry::create(&config).map_err(api_error)
}

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
    let adapter = resolve_adapter_for_project(&project.path, &project.specs_dir)?;
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
    let adapter = resolve_adapter_for_project(&project.path, &project.specs_dir)?;
    Ok(Json(adapter.schema().clone()))
}
