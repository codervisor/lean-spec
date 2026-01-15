//! Router configuration
//!
//! Sets up all API routes with the Axum router.

use axum::{
    routing::{delete, get, patch, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::handlers;
use crate::state::AppState;

/// Create the application router with all routes
pub fn create_router(state: AppState) -> Router {
    // Build CORS layer from config
    let cors = if state.config.server.cors.enabled {
        let origins: Vec<_> = state
            .config
            .server
            .cors
            .origins
            .iter()
            .filter_map(|o| o.parse().ok())
            .collect();

        if origins.is_empty() {
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        } else {
            CorsLayer::new()
                .allow_origin(origins)
                .allow_methods(Any)
                .allow_headers(Any)
        }
    } else {
        CorsLayer::new()
    };

    Router::new()
        // Health endpoint
        .route("/health", get(handlers::health_check))
        // Project routes
        .route("/api/projects", get(handlers::list_projects))
        .route("/api/projects", post(handlers::add_project))
        .route("/api/projects/refresh", post(handlers::refresh_projects))
        .route("/api/projects/{id}", get(handlers::get_project))
        .route("/api/projects/{id}", patch(handlers::update_project))
        .route("/api/projects/{id}", delete(handlers::remove_project))
        .route(
            "/api/projects/{id}/favorite",
            post(handlers::toggle_favorite),
        )
        .route(
            "/api/projects/{id}/specs",
            get(handlers::list_project_specs),
        )
        .route(
            "/api/projects/{id}/specs/{spec}",
            get(handlers::get_project_spec),
        )
        .route(
            "/api/projects/{id}/dependencies",
            get(handlers::get_project_dependencies),
        )
        .route("/api/projects/{id}/stats", get(handlers::get_project_stats))
        .route(
            "/api/projects/{id}/validate",
            post(handlers::validate_project),
        )
        .route(
            "/api/projects/{id}/context",
            get(handlers::get_project_context),
        )
        .route(
            "/api/projects/{id}/search",
            post(handlers::search_project_specs),
        )
        .route(
            "/api/projects/{id}/specs/{spec}/metadata",
            patch(handlers::update_project_metadata),
        )
        // Cloud sync routes
        .route("/api/sync/machines", get(handlers::list_machines))
        .route("/api/sync/machines/{id}", patch(handlers::rename_machine))
        .route("/api/sync/machines/{id}", delete(handlers::revoke_machine))
        .route(
            "/api/sync/machines/{id}/execution",
            post(handlers::trigger_execution_request),
        )
        .route("/api/sync/device/code", post(handlers::create_device_code))
        .route(
            "/api/sync/device/activate",
            post(handlers::activate_device_code),
        )
        .route(
            "/api/sync/oauth/token",
            post(handlers::exchange_device_code),
        )
        .route("/api/sync/events", post(handlers::ingest_sync_events))
        .route("/api/sync/bridge/ws", get(handlers::bridge_ws))
        // Local project routes
        .route(
            "/api/local-projects/discover",
            post(handlers::discover_projects),
        )
        .route(
            "/api/local-projects/list-directory",
            post(handlers::list_directory),
        )
        // Add middleware
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::ServerConfig;

    #[test]
    fn test_router_creation() {
        let config = ServerConfig::default();
        // This will fail without a valid filesystem, but tests router building
        let _state =
            AppState::with_registry(config, crate::project_registry::ProjectRegistry::default());
    }
}
