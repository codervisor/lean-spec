//! Server capabilities endpoint
//!
//! Returns feature flags and configuration that the UI needs at startup.

use axum::extract::State;
use axum::Json;
use leanspec_core::storage::config::resolve_project_sources;
use serde::Serialize;

use crate::state::AppState;

/// GET /api/capabilities
pub async fn get_capabilities(State(state): State<AppState>) -> Json<CapabilitiesResponse> {
    let project_sources = resolve_project_sources(&state.config.server.project_sources);

    Json(CapabilitiesResponse {
        project_sources,
        readonly: state.config.security.readonly,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CapabilitiesResponse {
    /// Available project source modes: "local", "github"
    pub project_sources: Vec<String>,
    /// Whether the server is in read-only mode
    pub readonly: bool,
}
