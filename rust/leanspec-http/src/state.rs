//! Application state management
//!
//! Shared state for the HTTP server using Arc for thread-safety.

use crate::chat_store::ChatStore;
use crate::config::ServerConfig;
use crate::error::ServerError;
use crate::project_registry::ProjectRegistry;
use crate::sync_state::SyncState;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    /// Server configuration
    pub config: Arc<ServerConfig>,

    /// Project registry
    pub registry: Arc<RwLock<ProjectRegistry>>,

    /// Cloud sync state
    pub sync_state: Arc<RwLock<SyncState>>,

    /// Chat session store
    pub chat_store: Arc<ChatStore>,
}

impl AppState {
    /// Create new application state
    pub fn new(config: ServerConfig) -> Result<Self, ServerError> {
        let mut registry = ProjectRegistry::new()?;

        // Auto-register a project when none are configured
        if registry.all().is_empty() {
            if let Some((project_path, specs_dir)) = default_project_path() {
                let _ = registry.auto_register_if_empty(
                    &project_path,
                    &specs_dir,
                    project_path.file_name().and_then(|n| n.to_str()),
                );
            }
        }

        let chat_store = ChatStore::new()?;

        Ok(Self {
            config: Arc::new(config),
            registry: Arc::new(RwLock::new(registry)),
            sync_state: Arc::new(RwLock::new(SyncState::load())),
            chat_store: Arc::new(chat_store),
        })
    }

    /// Create state with an existing registry (for testing)
    pub fn with_registry(config: ServerConfig, registry: ProjectRegistry) -> Self {
        let chat_store = ChatStore::new().expect("Failed to initialize chat store");
        Self {
            config: Arc::new(config),
            registry: Arc::new(RwLock::new(registry)),
            sync_state: Arc::new(RwLock::new(SyncState::load())),
            chat_store: Arc::new(chat_store),
        }
    }
}

/// Resolve a default project path by walking up to find a `specs` directory.
fn default_project_path() -> Option<(PathBuf, PathBuf)> {
    if let Ok(explicit) = std::env::var("LEANSPEC_PROJECT_PATH") {
        let root = PathBuf::from(explicit);
        let specs = root.join("specs");
        if specs.exists() {
            return Some((root, specs));
        }
    }

    // Fall back to the current working directory when resolution fails
    let mut dir = std::env::current_dir().ok()?;
    loop {
        let specs_dir = dir.join("specs");
        if specs_dir.exists() {
            return Some((dir.clone(), specs_dir));
        }
        if !(dir.pop()) {
            break;
        }
    }

    None
}
