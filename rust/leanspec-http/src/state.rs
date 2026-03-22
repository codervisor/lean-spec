//! Application state management
//!
//! Shared state for the HTTP server using Arc for thread-safety.

use crate::chat_config::ChatConfigStore;
use crate::chat_store::ChatStore;
use crate::config::{config_dir, resolve_database_path, ServerConfig};
use crate::error::ServerError;
use crate::project_registry::{Project, ProjectRegistry};
use crate::sessions::{global_runners_path, SessionDatabase, SessionManager};
use crate::sync_state::SyncState;
use crate::watcher::{sse_connection_limit, watch_debounce, watch_enabled, FileWatcher};
use leanspec_core::db::Database;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::{RwLock, Semaphore};

type RunnerModelsCacheMap = HashMap<String, (Instant, Vec<String>)>;
type RunnerModelsCache = Arc<RwLock<RunnerModelsCacheMap>>;

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

    /// Chat config store
    pub chat_config: Arc<RwLock<ChatConfigStore>>,

    /// Session manager for AI coding sessions
    pub session_manager: Arc<SessionManager>,

    /// Shared database handle
    pub database: Arc<Database>,

    /// File watcher for spec changes
    pub file_watcher: Option<Arc<FileWatcher>>,

    /// SSE connection limiter
    pub sse_connections: Arc<Semaphore>,

    /// Runner model discovery cache (keyed by "<project_path>:<runner_id>")
    pub runner_models_cache: RunnerModelsCache,
}

impl AppState {
    /// Create new application state (async for database initialization)
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

        let unified_db_path = resolve_database_path(config.database_url.as_deref())?;
        let sessions_dir = config_dir();
        fs::create_dir_all(&sessions_dir).map_err(|e| {
            ServerError::ConfigError(format!("Failed to create sessions dir: {}", e))
        })?;

        // Initialize the shared database (runs migrations)
        let database = Database::connect(&unified_db_path).await.map_err(|e| {
            ServerError::ConfigError(format!("Failed to initialize database: {}", e))
        })?;
        let database = Arc::new(database);

        let chat_store = ChatStore::new(database.pool().clone(), unified_db_path.clone());
        let chat_config = ChatConfigStore::load_default()?;
        let session_db = SessionDatabase::new(database.pool().clone());

        let legacy_sessions_path = sessions_dir.join("sessions.db");
        if session_db
            .migrate_from_legacy_db(&legacy_sessions_path)
            .await?
        {
            mark_legacy_db_migrated(&legacy_sessions_path);
        }

        let legacy_chat_path = sessions_dir.join("chat.db");
        if chat_store.migrate_from_legacy_db(&legacy_chat_path).await? {
            mark_legacy_db_migrated(&legacy_chat_path);
        }
        let legacy_runners_path = global_runners_path();
        if session_db.migrate_from_legacy_runners_json().await? {
            mark_legacy_json_migrated(&legacy_runners_path);
        }

        let session_manager = Arc::new(SessionManager::new(session_db));

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
            sync_state: Arc::new(RwLock::new(SyncState::load())),
            chat_store: Arc::new(chat_store),
            chat_config: Arc::new(RwLock::new(chat_config)),
            session_manager,
            database,
            file_watcher,
            sse_connections,
            runner_models_cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Create state with an existing registry (for testing)
    pub async fn with_registry(config: ServerConfig, registry: ProjectRegistry) -> Self {
        let database = Database::connect_in_memory()
            .await
            .expect("Failed to initialize in-memory database");
        let database = Arc::new(database);

        let chat_store = ChatStore::new(database.pool().clone(), PathBuf::from(":memory:"));
        let chat_config = ChatConfigStore::load_default().expect("Failed to load chat config");
        let session_db = SessionDatabase::new(database.pool().clone());
        let session_manager = Arc::new(SessionManager::new(session_db));
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
            sync_state: Arc::new(RwLock::new(SyncState::load())),
            chat_store: Arc::new(chat_store),
            chat_config: Arc::new(RwLock::new(chat_config)),
            session_manager,
            database,
            file_watcher,
            sse_connections,
            runner_models_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

fn mark_legacy_db_migrated(path: &PathBuf) {
    let migrated = path.with_extension("db.migrated");
    if let Err(err) = fs::rename(path, &migrated) {
        tracing::warn!(
            "Failed to rename legacy database '{}' to '{}': {}",
            path.display(),
            migrated.display(),
            err
        );
    }
}

fn mark_legacy_json_migrated(path: &PathBuf) {
    let migrated = path.with_extension("json.migrated");
    if let Err(err) = fs::rename(path, &migrated) {
        tracing::warn!(
            "Failed to rename legacy file '{}' to '{}': {}",
            path.display(),
            migrated.display(),
            err
        );
    }
}

/// Resolve a default project path by walking up to find a `specs` directory.
fn default_project_path() -> Option<(PathBuf, PathBuf)> {
    if let Ok(explicit) = std::env::var("LEANSPEC_PROJECT_PATH") {
        let root = PathBuf::from(&explicit);
        if root.exists() {
            // Use Project::from_path to discover the specs dir with the
            // standard multi-candidate logic (specs, .lean-spec/specs, etc.)
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
