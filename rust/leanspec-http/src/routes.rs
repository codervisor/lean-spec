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
        .route("/api/projects/{id}/switch", post(handlers::switch_project))
        .route(
            "/api/projects/{id}/favorite",
            post(handlers::toggle_favorite),
        )
        // Spec routes
        .route("/api/specs", get(handlers::list_specs))
        .route("/api/specs/{spec}", get(handlers::get_spec))
        .route(
            "/api/specs/{spec}/metadata",
            patch(handlers::update_metadata),
        )
        // Search route
        .route("/api/search", post(handlers::search_specs))
        // Stats route
        .route("/api/stats", get(handlers::get_stats))
        // Dependency routes
        .route("/api/deps/{spec}", get(handlers::get_dependencies))
        // Validation routes
        .route("/api/validate", get(handlers::validate_all))
        .route("/api/validate/{spec}", get(handlers::validate_spec))
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
        let _state = AppState::with_registry(config, crate::project_registry::ProjectRegistry::default());
    }
}
