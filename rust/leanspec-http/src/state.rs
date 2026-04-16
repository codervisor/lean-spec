//! Application state management
//!
//! Shared state for the HTTP server using Arc for thread-safety.

use crate::config::ServerConfig;
use crate::error::ServerError;
use crate::project_registry::{Project, ProjectRegistry};
use crate::watcher::{sse_connection_limit, watch_debounce, watch_enabled, FileWatcher};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{RwLock, Semaphore};

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    /// Server configuration
    pub config: Arc<ServerConfig>,

    /// Project registry
    pub registry: Arc<RwLock<ProjectRegistry>>,

    /// File watcher for spec changes
    pub file_watcher: Option<Arc<FileWatcher>>,

    /// SSE connection limiter
    pub sse_connections: Arc<Semaphore>,
}

impl AppState {
    /// Create new application state
    pub async fn new(config: ServerConfig) -> Result<Self, ServerError> {
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

        let file_watcher = if watch_enabled() {
            let roots: Vec<_> = registry.all().iter().map(|p| p.specs_dir.clone()).collect();
            if roots.is_empty() {
                None
            } else {
                match FileWatcher::new(roots, watch_debounce()) {
                    Ok(watcher) => Some(Arc::new(watcher)),
                    Err(err) => {
                        tracing::warn!("Failed to initialize spec watcher: {}", err);
                        None
                    }
                }
            }
        } else {
            None
        };

        let sse_connections = Arc::new(Semaphore::new(sse_connection_limit()));

        Ok(Self {
            config: Arc::new(config),
            registry: Arc::new(RwLock::new(registry)),
            file_watcher,
            sse_connections,
        })
    }

    /// Create state with an existing registry (for testing)
    pub async fn with_registry(config: ServerConfig, registry: ProjectRegistry) -> Self {
        let file_watcher = if watch_enabled() {
            let roots: Vec<_> = registry.all().iter().map(|p| p.specs_dir.clone()).collect();
            FileWatcher::new(roots, watch_debounce()).ok().map(Arc::new)
        } else {
            None
        };
        let sse_connections = Arc::new(Semaphore::new(sse_connection_limit()));
        Self {
            config: Arc::new(config),
            registry: Arc::new(RwLock::new(registry)),
            file_watcher,
            sse_connections,
        }
    }
}

/// Resolve a default project path by walking up to find a `specs` directory.
fn default_project_path() -> Option<(PathBuf, PathBuf)> {
    if let Ok(explicit) = std::env::var("LEANSPEC_PROJECT_PATH") {
        let root = PathBuf::from(&explicit);
        if root.exists() {
            if let Ok(project) = Project::from_path(&root) {
                if project.specs_dir.exists() {
                    return Some((root, project.specs_dir));
                }
            }
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
