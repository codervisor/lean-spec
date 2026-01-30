//! LeanSpec HTTP Server
//!
//! A lightweight Rust HTTP server using Axum for serving the LeanSpec web UI.
//! Provides RESTful JSON API endpoints matching the existing Next.js API routes.
//!
//! ## Features
//!
//! - Multi-project support via shared project registry
//! - Direct integration with `leanspec_core` (no CLI spawning)
//! - RESTful JSON API for specs, stats, dependencies, validation
//! - Configuration system via `~/.lean-spec/config.json`
//!
//! ## Usage
//!
//! ```rust,no_run
//! use leanspec_http::start_server;
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     start_server("127.0.0.1", 3000).await?;
//!     Ok(())
//! }
//! ```

#[cfg(feature = "ai")]
pub mod ai;
pub mod chat_config;
pub mod chat_store;
pub mod config;
pub mod error;
pub mod handlers;
pub mod project_registry;
pub mod routes;
pub mod sessions;
pub mod state;
pub mod sync_state;
pub mod types;
pub mod utils;
pub mod watcher;

pub use config::{load_config, load_config_from_path, ServerConfig};
pub use error::ServerError;
pub use project_registry::ProjectRegistry;
pub use routes::create_router;
pub use sessions::{
    Session, SessionConfig, SessionEvent, SessionLog, SessionManager, SessionMode, SessionStatus,
    ToolAdapter, ToolManager,
};
pub use state::AppState;

/// Start the HTTP server on the given host and port
pub async fn start_server(host: &str, port: u16) -> Result<(), ServerError> {
    let config = load_config()?;
    let state = AppState::new(config)?;
    let app = create_router(state);

    let listener = tokio::net::TcpListener::bind(format!("{}:{}", host, port))
        .await
        .map_err(|e| ServerError::BindFailed(e.to_string()))?;

    tracing::info!("LeanSpec HTTP server listening on {}:{}", host, port);

    axum::serve(listener, app)
        .await
        .map_err(|e| ServerError::ServerError(e.to_string()))?;

    Ok(())
}

/// Start the server with a custom config
pub async fn start_server_with_config(
    host: &str,
    port: u16,
    config: ServerConfig,
) -> Result<(), ServerError> {
    let state = AppState::new(config)?;
    let app = create_router(state);

    let listener = tokio::net::TcpListener::bind(format!("{}:{}", host, port))
        .await
        .map_err(|e| ServerError::BindFailed(e.to_string()))?;

    tracing::info!("LeanSpec HTTP server listening on {}:{}", host, port);

    axum::serve(listener, app)
        .await
        .map_err(|e| ServerError::ServerError(e.to_string()))?;

    Ok(())
}
