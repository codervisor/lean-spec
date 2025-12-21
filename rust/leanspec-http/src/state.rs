//! Application state management
//!
//! Shared state for the HTTP server using Arc for thread-safety.

use crate::config::ServerConfig;
use crate::error::ServerError;
use crate::project_registry::ProjectRegistry;
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
}

impl AppState {
    /// Create new application state
    pub fn new(config: ServerConfig) -> Result<Self, ServerError> {
        let mut registry = ProjectRegistry::new()?;

        // Ensure a default project is available for single-project mode
        if registry.all().is_empty() {
            let default_path = default_project_path();

            if let Ok(project) = registry.add(&default_path) {
                let _ = registry.set_current(&project.id);
            }
        }

        Ok(Self {
            config: Arc::new(config),
            registry: Arc::new(RwLock::new(registry)),
        })
    }

    /// Create state with an existing registry (for testing)
    pub fn with_registry(config: ServerConfig, registry: ProjectRegistry) -> Self {
        Self {
            config: Arc::new(config),
            registry: Arc::new(RwLock::new(registry)),
        }
    }

    /// Get the current project's specs directory
    pub async fn current_specs_dir(&self) -> Option<std::path::PathBuf> {
        let registry = self.registry.read().await;
        registry.current().map(|p| p.specs_dir.clone())
    }

    /// Get the current project ID
    pub async fn current_project_id(&self) -> Option<String> {
        let registry = self.registry.read().await;
        registry.current_id().map(|s| s.to_string())
    }
}

/// Resolve a default project path by walking up to find a `specs` directory.
fn default_project_path() -> PathBuf {
    if let Ok(explicit) = std::env::var("LEANSPEC_PROJECT_PATH") {
        return PathBuf::from(explicit);
    }

    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    loop {
        if dir.join("specs").exists() {
            return dir;
        }
        if !(dir.pop()) {
            break;
        }
    }

    PathBuf::from(".")
}
