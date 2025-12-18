//! Health check handlers

use axum::extract::State;
use axum::Json;

use crate::state::AppState;
use crate::types::HealthResponse;

const VERSION: &str = env!("CARGO_PKG_VERSION");

/// GET /health - Health check endpoint
pub async fn health_check(State(state): State<AppState>) -> Json<HealthResponse> {
    let current_project = state.current_project_id().await;

    Json(HealthResponse {
        status: "ok".to_string(),
        version: VERSION.to_string(),
        current_project,
    })
}
