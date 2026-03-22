//! Health check handlers

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use serde::Serialize;

use crate::state::AppState;
use crate::types::HealthResponse;

const VERSION: &str = env!("CARGO_PKG_VERSION");

/// GET /health - Health check endpoint (backward compatible)
pub async fn health_check(State(_state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        version: VERSION.to_string(),
    })
}

/// GET /health/live - Liveness probe (always returns OK if process is running)
pub async fn health_live() -> Json<LivenessResponse> {
    Json(LivenessResponse {
        status: "ok".to_string(),
    })
}

/// GET /health/ready - Readiness probe (checks DB connectivity and project registry)
pub async fn health_ready(
    State(state): State<AppState>,
) -> Result<Json<ReadinessResponse>, (StatusCode, Json<ReadinessResponse>)> {
    let mut checks = Vec::new();
    let mut all_ok = true;

    // Check project registry is accessible (reading it without panic = OK)
    let registry_ok = {
        let _registry = state.registry.read().await;
        true
    };
    checks.push(HealthCheck {
        name: "registry".to_string(),
        status: if registry_ok { "ok" } else { "error" }.to_string(),
        message: None,
    });
    if !registry_ok {
        all_ok = false;
    }

    // Check chat store (DB connectivity)
    let db_ok = state.database.health_check().await;
    checks.push(HealthCheck {
        name: "database".to_string(),
        status: if db_ok { "ok" } else { "error" }.to_string(),
        message: if db_ok {
            None
        } else {
            Some("Database connection failed".to_string())
        },
    });
    if !db_ok {
        all_ok = false;
    }

    let response = ReadinessResponse {
        status: if all_ok { "ok" } else { "error" }.to_string(),
        version: VERSION.to_string(),
        checks,
    };

    if all_ok {
        Ok(Json(response))
    } else {
        Err((StatusCode::SERVICE_UNAVAILABLE, Json(response)))
    }
}

/// Liveness response (minimal)
#[derive(Debug, Clone, Serialize)]
pub struct LivenessResponse {
    pub status: String,
}

/// Readiness response with dependency checks
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadinessResponse {
    pub status: String,
    pub version: String,
    pub checks: Vec<HealthCheck>,
}

/// Individual health check result
#[derive(Debug, Clone, Serialize)]
pub struct HealthCheck {
    pub name: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}
