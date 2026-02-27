//! File watcher for spec changes

use crate::error::ServerError;
use leanspec_core::SpecLoader;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tokio::runtime::Handle;
use tokio::sync::{broadcast, mpsc};

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SpecChangeType {
    Created,
    Modified,
    Deleted,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecChangeEvent {
    pub change_type: SpecChangeType,
    pub path: String,
}

pub struct FileWatcher {
    _watcher: RecommendedWatcher,
    tx: broadcast::Sender<SpecChangeEvent>,
    roots: Vec<PathBuf>,
}

impl FileWatcher {
    pub fn new(roots: Vec<PathBuf>, debounce: Duration) -> Result<Self, ServerError> {
        let (tx, _) = broadcast::channel(200);
        let (raw_tx, mut raw_rx) = mpsc::unbounded_channel::<Event>();

        let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = raw_tx.send(event);
            }
        })
        .map_err(|e| ServerError::ServerError(format!("Failed to start watcher: {e}")))?;

        for root in &roots {
            watcher.watch(root, RecursiveMode::Recursive).map_err(|e| {
                ServerError::ServerError(format!("Failed to watch {}: {e}", root.display()))
            })?;
        }

        let roots_clone = roots.clone();
        let tx_clone = tx.clone();
        let debounce_interval = if debounce.is_zero() {
            Duration::from_millis(300)
        } else {
            debounce
        };

        let handle = Handle::try_current().map_err(|_| {
            ServerError::ServerError("Tokio runtime not available for file watcher".to_string())
        })?;

        handle.spawn(async move {
            let mut pending: HashMap<PathBuf, (SpecChangeType, Instant)> = HashMap::new();
            let mut ticker = tokio::time::interval(debounce_interval);
            ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

            loop {
                tokio::select! {
                    Some(event) = raw_rx.recv() => {
                        if let Some(kind) = map_event_kind(&event.kind) {
                            for path in event.paths {
                                if should_ignore_path(&path) {
                                    continue;
                                }

                                // Keep core spec cache coherent with on-disk changes.
                                SpecLoader::invalidate_cached_path(&path);

                                pending.insert(path, (kind, Instant::now()));
                            }
                        }
                    }
                    _ = ticker.tick() => {
                        if pending.is_empty() {
                            continue;
                        }

                        let mut drained = HashMap::new();
                        std::mem::swap(&mut drained, &mut pending);

                        for (path, (kind, _)) in drained {
                            if let Some(event) = to_spec_event(&roots_clone, path, kind) {
                                let _ = tx_clone.send(event);
                            }
                        }
                    }
                }
            }
        });

        Ok(Self {
            _watcher: watcher,
            tx,
            roots,
        })
    }

    pub fn subscribe(&self) -> broadcast::Receiver<SpecChangeEvent> {
        self.tx.subscribe()
    }

    pub fn roots(&self) -> &[PathBuf] {
        &self.roots
    }
}

pub fn watch_enabled() -> bool {
    env_bool("ENABLE_FILE_WATCH", true)
}

pub fn watch_debounce() -> Duration {
    Duration::from_millis(env_u64("FILE_WATCH_DEBOUNCE_MS", 300))
}

pub fn sse_keepalive_interval() -> Duration {
    Duration::from_secs(env_u64("SSE_KEEPALIVE_SEC", 15))
}

pub fn sse_connection_limit() -> usize {
    env_u64("SSE_MAX_CONNECTIONS", 100) as usize
}

pub fn sse_min_interval() -> Duration {
    Duration::from_millis(env_u64("SSE_MIN_INTERVAL_MS", 100))
}

fn env_bool(key: &str, default: bool) -> bool {
    std::env::var(key)
        .ok()
        .map(|value| matches!(value.to_lowercase().as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(default)
}

fn env_u64(key: &str, default: u64) -> u64 {
    std::env::var(key)
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(default)
}

fn map_event_kind(kind: &EventKind) -> Option<SpecChangeType> {
    use notify::event::{CreateKind, ModifyKind, RemoveKind};

    match kind {
        EventKind::Create(CreateKind::File)
        | EventKind::Create(CreateKind::Folder)
        | EventKind::Create(CreateKind::Any) => Some(SpecChangeType::Created),
        EventKind::Modify(ModifyKind::Data(_))
        | EventKind::Modify(ModifyKind::Any)
        | EventKind::Modify(ModifyKind::Name(_)) => Some(SpecChangeType::Modified),
        EventKind::Remove(RemoveKind::File)
        | EventKind::Remove(RemoveKind::Folder)
        | EventKind::Remove(RemoveKind::Any) => Some(SpecChangeType::Deleted),
        _ => None,
    }
}

fn should_ignore_path(path: &Path) -> bool {
    let file_name = match path.file_name().and_then(|name| name.to_str()) {
        Some(name) => name,
        None => return true,
    };

    if file_name.starts_with(".") && file_name != ".lean-spec" {
        return true;
    }

    let lower = file_name.to_lowercase();
    let ignored_suffixes = [".swp", ".tmp", ".temp", "~", ".bak", ".ds_store"];

    if ignored_suffixes
        .iter()
        .any(|suffix| lower.ends_with(suffix))
    {
        return true;
    }

    if let Some(ext) = path.extension().and_then(|ext| ext.to_str()) {
        return !matches!(ext.to_lowercase().as_str(), "md" | "mdx");
    }

    true
}

fn to_spec_event(
    roots: &[PathBuf],
    path: PathBuf,
    change_type: SpecChangeType,
) -> Option<SpecChangeEvent> {
    if should_ignore_path(&path) {
        return None;
    }

    let relative = roots.iter().find_map(|root| {
        path.strip_prefix(root)
            .ok()
            .map(|relative| relative.to_path_buf())
    })?;

    let relative_str = relative.to_string_lossy().replace('\\', "/");

    Some(SpecChangeEvent {
        change_type,
        path: relative_str,
    })
}
