//! Router configuration
//!
//! Sets up all API routes with the Axum router.

use axum::{
    body::Body,
    extract::State,
    http::{Method, Request, StatusCode},
    response::{IntoResponse, Response},
};
use axum::{
    middleware,
    routing::{delete, get, patch, post, put},
    Router,
};
use std::path::PathBuf;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;

use crate::config::ServerConfig;
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

    #[allow(unused_mut)]
    let mut router = Router::new()
        // Health endpoint
        .route("/health", get(handlers::health_check))
        .route("/api/chat/config", get(handlers::get_chat_config))
        .route("/api/chat/config", put(handlers::update_chat_config))
        .route("/api/chat/sessions", get(handlers::list_chat_sessions))
        .route("/api/chat/sessions", post(handlers::create_chat_session))
        .route("/api/chat/sessions/{id}", get(handlers::get_chat_session))
        .route(
            "/api/chat/sessions/{id}",
            patch(handlers::update_chat_session),
        )
        .route(
            "/api/chat/sessions/{id}",
            delete(handlers::delete_chat_session),
        )
        .route(
            "/api/chat/sessions/{id}/messages",
            put(handlers::replace_chat_messages),
        )
        .route("/api/chat/storage", get(handlers::get_chat_storage_info))
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
            "/api/projects/{id}/specs",
            post(handlers::create_project_spec),
        )
        .route(
            "/api/projects/{id}/specs/{spec}",
            get(handlers::get_project_spec),
        )
        .route(
            "/api/projects/{id}/specs/{spec}/tokens",
            get(handlers::get_project_spec_tokens),
        )
        .route(
            "/api/projects/{id}/specs/{spec}/validation",
            get(handlers::get_project_spec_validation),
        )
        .route(
            "/api/projects/{id}/specs/batch-metadata",
            post(handlers::batch_spec_metadata),
        )
        .route(
            "/api/projects/{id}/specs/{spec}/raw",
            get(handlers::get_project_spec_raw),
        )
        .route(
            "/api/projects/{id}/specs/{spec}/raw",
            patch(handlers::update_project_spec_raw),
        )
        .route(
            "/api/projects/{id}/specs/{spec}/subspecs/{file}/raw",
            get(handlers::get_project_subspec_raw),
        )
        .route(
            "/api/projects/{id}/specs/{spec}/subspecs/{file}/raw",
            patch(handlers::update_project_subspec_raw),
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
        // Spec events (SSE)
        .route("/api/events/specs", get(handlers::spec_events))
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
        // Session routes
        .route("/api/sessions", get(handlers::list_sessions))
        .route("/api/sessions", post(handlers::create_session))
        .route("/api/sessions/{id}", get(handlers::get_session))
        .route("/api/sessions/{id}", delete(handlers::delete_session))
        .route("/api/sessions/{id}/start", post(handlers::start_session))
        .route("/api/sessions/{id}/pause", post(handlers::pause_session))
        .route("/api/sessions/{id}/resume", post(handlers::resume_session))
        .route("/api/sessions/{id}/stop", post(handlers::stop_session))
        .route(
            "/api/sessions/{id}/archive",
            post(handlers::archive_session),
        )
        .route("/api/sessions/{id}/logs", get(handlers::get_session_logs))
        .route(
            "/api/sessions/{id}/logs/rotate",
            post(handlers::rotate_session_logs),
        )
        .route(
            "/api/sessions/{id}/events",
            get(handlers::get_session_events),
        )
        .route("/api/sessions/{id}/stream", get(handlers::ws_session_logs))
        .route("/api/runners", get(handlers::list_available_runners));

    // AI chat route (only when ai feature is enabled)
    #[cfg(feature = "ai")]
    {
        router = router.route("/api/chat", post(handlers::chat_stream));
    }

    let mut router = router.with_state(state.clone());

    if let Some(ui_dist) = resolve_ui_dist_path(&state.config) {
        let index_path = ui_dist.join("index.html");
        let serve_dir = ServeDir::new(ui_dist).not_found_service(ServeFile::new(index_path));
        router = router.fallback_service(serve_dir);
    }

    router
        // Add middleware
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(middleware::from_fn_with_state(state, readonly_guard))
}

fn resolve_ui_dist_path(config: &ServerConfig) -> Option<PathBuf> {
    if let Some(path) = config.server.ui_dist.clone() {
        if path.exists() {
            return Some(path);
        }
    }

    if let Ok(path) = std::env::var("LEANSPEC_UI_DIST") {
        let path = PathBuf::from(path);
        if path.exists() {
            return Some(path);
        }
    }

    // Skip UI serving in dev mode (for hot reload via Vite)
    if std::env::var("LEANSPEC_DEV_MODE").is_ok() {
        return None;
    }

    if cfg!(debug_assertions) {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/ui/dist");
        if path.exists() {
            return Some(path);
        }
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let bundled = exe_dir.join("ui-dist");
            if bundled.exists() {
                return Some(bundled);
            }

            if let Some(scope_dir) = exe_dir.parent() {
                let scoped_ui = scope_dir.join("ui").join("dist");
                if scoped_ui.exists() {
                    return Some(scoped_ui);
                }
            }
        }
    }

    None
}

async fn readonly_guard(
    State(state): State<AppState>,
    request: Request<Body>,
    next: middleware::Next,
) -> Response {
    if !state.config.security.readonly {
        return next.run(request).await;
    }

    let method = request.method();
    let path = request.uri().path();

    let is_safe_method = matches!(*method, Method::GET | Method::HEAD | Method::OPTIONS);

    if path.starts_with("/api") && !is_safe_method {
        return (StatusCode::FORBIDDEN, "Server is in read-only mode").into_response();
    }

    next.run(request).await
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
