//! Adapter cache for long-running processes (HTTP server, MCP server).
//!
//! Building an [`Adapter`] is cheap, but baking its enriched schema is not —
//! the GitHub/ADO/Jira adapters each perform a network round-trip from their
//! constructor (`resolve_inline`). For one-shot CLI invocations that's fine,
//! but a server that calls [`AdapterRegistry::create`] per request would issue
//! a fresh round-trip on every endpoint hit.
//!
//! [`AdapterCache`] caches a resolved [`Adapter`] per project root with a
//! configurable TTL. Stale entries are re-resolved on next access; entries
//! can also be explicitly invalidated (e.g. via a `POST /schema/refresh`
//! endpoint or an MCP `reload_schema` tool).

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use super::{Adapter, AdapterConfig, AdapterError, AdapterRegistry};

/// Default TTL for cached adapters when callers do not pick one explicitly.
///
/// Five minutes matches the spec design and is short enough that schema
/// drift in the backing system (a new GitHub label, a renamed Jira status)
/// surfaces within a session without forcing a manual refresh.
pub const DEFAULT_TTL: Duration = Duration::from_secs(5 * 60);

struct CachedAdapter {
    adapter: Arc<dyn Adapter>,
    resolved_at: Instant,
}

/// Thread-safe cache of resolved adapters keyed by project root path.
///
/// `AdapterCache` is `Clone`-able via [`Arc`] wrapping at the caller side;
/// the internal state is shared behind a [`Mutex`]. Look-ups are O(1) on the
/// project root.
pub struct AdapterCache {
    cache: Mutex<HashMap<PathBuf, CachedAdapter>>,
    ttl: Duration,
}

impl AdapterCache {
    /// Create a new cache with the supplied TTL.
    pub fn new(ttl: Duration) -> Self {
        Self {
            cache: Mutex::new(HashMap::new()),
            ttl,
        }
    }

    /// Cache TTL — entries older than this are re-resolved on next access.
    pub fn ttl(&self) -> Duration {
        self.ttl
    }

    /// Get the cached adapter for `project_root`, resolving it via `factory`
    /// if absent or stale.
    ///
    /// `factory` is invoked outside the cache lock so a slow resolution does
    /// not block other projects. If two callers race, one wins and the other
    /// re-uses the freshly-cached entry (the loser's resolved adapter is
    /// dropped). A small amount of duplicated work in the rare race case is
    /// preferable to holding the lock across a network round-trip.
    pub fn get_or_resolve<F>(
        &self,
        project_root: &Path,
        factory: F,
    ) -> Result<Arc<dyn Adapter>, AdapterError>
    where
        F: FnOnce() -> Result<Box<dyn Adapter>, AdapterError>,
    {
        if let Some(adapter) = self.lookup_fresh(project_root) {
            return Ok(adapter);
        }

        let adapter: Arc<dyn Adapter> = Arc::from(factory()?);

        // Stash the freshly-resolved adapter; if a racing caller already
        // populated the entry, fold our result into theirs so both threads
        // observe the same adapter from this point onward.
        let mut cache = self.cache.lock().unwrap();
        if let Some(existing) = cache.get(project_root) {
            if existing.resolved_at.elapsed() < self.ttl {
                return Ok(existing.adapter.clone());
            }
        }
        cache.insert(
            project_root.to_path_buf(),
            CachedAdapter {
                adapter: adapter.clone(),
                resolved_at: Instant::now(),
            },
        );
        Ok(adapter)
    }

    /// Force-resolve the adapter for `project_root`, replacing any cached
    /// entry. Used by refresh endpoints / reload tools.
    pub fn refresh<F>(
        &self,
        project_root: &Path,
        factory: F,
    ) -> Result<Arc<dyn Adapter>, AdapterError>
    where
        F: FnOnce() -> Result<Box<dyn Adapter>, AdapterError>,
    {
        let adapter: Arc<dyn Adapter> = Arc::from(factory()?);
        let mut cache = self.cache.lock().unwrap();
        cache.insert(
            project_root.to_path_buf(),
            CachedAdapter {
                adapter: adapter.clone(),
                resolved_at: Instant::now(),
            },
        );
        Ok(adapter)
    }

    /// Drop the cached adapter for `project_root`, if any.
    pub fn invalidate(&self, project_root: &Path) {
        let mut cache = self.cache.lock().unwrap();
        cache.remove(project_root);
    }

    /// Drop every cached adapter.
    pub fn clear(&self) {
        let mut cache = self.cache.lock().unwrap();
        cache.clear();
    }

    fn lookup_fresh(&self, project_root: &Path) -> Option<Arc<dyn Adapter>> {
        let cache = self.cache.lock().unwrap();
        let entry = cache.get(project_root)?;
        if entry.resolved_at.elapsed() < self.ttl {
            Some(entry.adapter.clone())
        } else {
            None
        }
    }
}

impl Default for AdapterCache {
    fn default() -> Self {
        Self::new(DEFAULT_TTL)
    }
}

/// Convenience: resolve `config` into an adapter via [`AdapterRegistry::create`].
///
/// This exists so callers passing through the cache do not have to wrap the
/// registry call themselves; the cache's `factory` closure can just call
/// `resolve_config(&cfg)`.
pub fn resolve_config(config: &AdapterConfig) -> Result<Box<dyn Adapter>, AdapterError> {
    AdapterRegistry::create(config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    fn build_markdown() -> Result<Box<dyn Adapter>, AdapterError> {
        AdapterRegistry::create(&AdapterConfig {
            adapter: "markdown".into(),
            settings: serde_json::json!({ "directory": "specs" }),
            schema_id: None,
        })
    }

    #[test]
    fn second_get_hits_cache() {
        let cache = AdapterCache::new(Duration::from_secs(60));
        let calls = AtomicUsize::new(0);
        let root = PathBuf::from("/tmp/project-a");

        let a = cache
            .get_or_resolve(&root, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();
        let b = cache
            .get_or_resolve(&root, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();

        assert!(Arc::ptr_eq(&a, &b), "cache must return the same Arc");
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn invalidate_forces_reresolve() {
        let cache = AdapterCache::new(Duration::from_secs(60));
        let calls = AtomicUsize::new(0);
        let root = PathBuf::from("/tmp/project-b");

        let _ = cache
            .get_or_resolve(&root, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();
        cache.invalidate(&root);
        let _ = cache
            .get_or_resolve(&root, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();

        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn refresh_replaces_cached_entry() {
        let cache = AdapterCache::new(Duration::from_secs(60));
        let calls = AtomicUsize::new(0);
        let root = PathBuf::from("/tmp/project-c");

        let a = cache
            .get_or_resolve(&root, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();
        let b = cache
            .refresh(&root, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();

        assert!(!Arc::ptr_eq(&a, &b), "refresh must replace the cached Arc");
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn ttl_expiry_triggers_reresolve() {
        let cache = AdapterCache::new(Duration::from_millis(50));
        let calls = AtomicUsize::new(0);
        let root = PathBuf::from("/tmp/project-d");

        let _ = cache
            .get_or_resolve(&root, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();
        std::thread::sleep(Duration::from_millis(80));
        let _ = cache
            .get_or_resolve(&root, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();

        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn clear_drops_all_entries() {
        let cache = AdapterCache::new(Duration::from_secs(60));
        let calls = AtomicUsize::new(0);
        let root_a = PathBuf::from("/tmp/project-e1");
        let root_b = PathBuf::from("/tmp/project-e2");

        let _ = cache
            .get_or_resolve(&root_a, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();
        let _ = cache
            .get_or_resolve(&root_b, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();
        cache.clear();
        let _ = cache
            .get_or_resolve(&root_a, || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();

        assert_eq!(calls.load(Ordering::SeqCst), 3);
    }

    #[test]
    fn different_roots_resolve_independently() {
        let cache = AdapterCache::new(Duration::from_secs(60));
        let calls = AtomicUsize::new(0);

        let _ = cache
            .get_or_resolve(Path::new("/tmp/proj-x"), || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();
        let _ = cache
            .get_or_resolve(Path::new("/tmp/proj-y"), || {
                calls.fetch_add(1, Ordering::SeqCst);
                build_markdown()
            })
            .unwrap();

        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }
}
