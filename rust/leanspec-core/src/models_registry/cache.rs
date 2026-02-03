//! Local cache for models.dev registry

use crate::error::{CoreError, CoreResult};
use crate::models_registry::types::ModelRegistry;
use crate::models_registry::DEFAULT_CACHE_TTL_SECS;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

/// Metadata stored alongside cached registry
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct CacheMetadata {
    /// When the cache was last updated
    cached_at: u64,
    /// TTL in seconds
    ttl_secs: u64,
}

/// Local file cache for the models registry
pub struct ModelCache {
    cache_path: PathBuf,
    metadata_path: PathBuf,
    ttl: Duration,
}

impl ModelCache {
    /// Create a new cache using the default cache directory
    pub fn new() -> CoreResult<Self> {
        let cache_dir = Self::resolve_cache_dir()?;
        std::fs::create_dir_all(&cache_dir)
            .map_err(|e| CoreError::ConfigError(format!("Failed to create cache dir: {}", e)))?;

        Ok(Self {
            cache_path: cache_dir.join("models-registry.json"),
            metadata_path: cache_dir.join("models-registry.meta.json"),
            ttl: Duration::from_secs(DEFAULT_CACHE_TTL_SECS),
        })
    }

    /// Create a cache with custom paths (for testing)
    pub fn with_paths(cache_path: PathBuf, metadata_path: PathBuf) -> Self {
        Self {
            cache_path,
            metadata_path,
            ttl: Duration::from_secs(DEFAULT_CACHE_TTL_SECS),
        }
    }

    /// Set custom TTL
    pub fn with_ttl(mut self, ttl: Duration) -> Self {
        self.ttl = ttl;
        self
    }

    /// Resolve the cache directory path
    fn resolve_cache_dir() -> CoreResult<PathBuf> {
        // Try XDG cache dir first
        if let Ok(xdg_cache) = std::env::var("XDG_CACHE_HOME") {
            return Ok(PathBuf::from(xdg_cache).join("leanspec"));
        }

        // Fall back to home directory
        if let Ok(home) = std::env::var("HOME") {
            return Ok(PathBuf::from(home).join(".cache").join("leanspec"));
        }

        // Windows fallback
        if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
            return Ok(PathBuf::from(localappdata).join("leanspec").join("cache"));
        }

        Err(CoreError::ConfigError(
            "Could not determine cache directory".to_string(),
        ))
    }

    /// Load the cached registry
    pub fn load(&self) -> CoreResult<Option<ModelRegistry>> {
        if !self.cache_path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(&self.cache_path)
            .map_err(|e| CoreError::ConfigError(format!("Failed to read cache: {}", e)))?;

        let registry: ModelRegistry = serde_json::from_str(&content)
            .map_err(|e| CoreError::ConfigError(format!("Failed to parse cache: {}", e)))?;

        Ok(Some(registry))
    }

    /// Save the registry to cache
    pub fn save(&self, registry: &ModelRegistry) -> CoreResult<()> {
        // Save registry
        let content = serde_json::to_string_pretty(registry)
            .map_err(|e| CoreError::ConfigError(format!("Failed to serialize registry: {}", e)))?;
        std::fs::write(&self.cache_path, content)
            .map_err(|e| CoreError::ConfigError(format!("Failed to write cache: {}", e)))?;

        // Save metadata
        let metadata = CacheMetadata {
            cached_at: SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            ttl_secs: self.ttl.as_secs(),
        };
        let metadata_content = serde_json::to_string(&metadata)
            .map_err(|e| CoreError::ConfigError(format!("Failed to serialize metadata: {}", e)))?;
        std::fs::write(&self.metadata_path, metadata_content)
            .map_err(|e| CoreError::ConfigError(format!("Failed to write metadata: {}", e)))?;

        Ok(())
    }

    /// Check if the cache is stale (beyond TTL)
    pub fn is_stale(&self) -> CoreResult<bool> {
        if !self.metadata_path.exists() {
            return Ok(true);
        }

        let content = std::fs::read_to_string(&self.metadata_path)
            .map_err(|e| CoreError::ConfigError(format!("Failed to read metadata: {}", e)))?;

        let metadata: CacheMetadata = serde_json::from_str(&content)
            .map_err(|e| CoreError::ConfigError(format!("Failed to parse metadata: {}", e)))?;

        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let age = now.saturating_sub(metadata.cached_at);
        Ok(age > metadata.ttl_secs)
    }

    /// Clear the cache
    pub fn clear(&self) -> CoreResult<()> {
        if self.cache_path.exists() {
            std::fs::remove_file(&self.cache_path)
                .map_err(|e| CoreError::ConfigError(format!("Failed to remove cache: {}", e)))?;
        }
        if self.metadata_path.exists() {
            std::fs::remove_file(&self.metadata_path)
                .map_err(|e| CoreError::ConfigError(format!("Failed to remove metadata: {}", e)))?;
        }
        Ok(())
    }

    /// Get cache age in seconds
    pub fn age_secs(&self) -> CoreResult<Option<u64>> {
        if !self.metadata_path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(&self.metadata_path)
            .map_err(|e| CoreError::ConfigError(format!("Failed to read metadata: {}", e)))?;

        let metadata: CacheMetadata = serde_json::from_str(&content)
            .map_err(|e| CoreError::ConfigError(format!("Failed to parse metadata: {}", e)))?;

        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Ok(Some(now.saturating_sub(metadata.cached_at)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models_registry::types::{Model, Provider};
    use std::collections::HashMap;
    use tempfile::tempdir;

    fn sample_registry() -> ModelRegistry {
        let mut providers = HashMap::new();
        let mut models = HashMap::new();
        models.insert(
            "gpt-4o".to_string(),
            Model {
                id: "gpt-4o".to_string(),
                name: "GPT-4o".to_string(),
                family: None,
                attachment: None,
                reasoning: None,
                tool_call: Some(true),
                structured_output: None,
                temperature: None,
                knowledge: None,
                release_date: None,
                last_updated: None,
                modalities: None,
                open_weights: None,
                cost: None,
                limit: None,
            },
        );
        providers.insert(
            "openai".to_string(),
            Provider {
                id: "openai".to_string(),
                name: "OpenAI".to_string(),
                env: vec!["OPENAI_API_KEY".to_string()],
                npm: Some("@ai-sdk/openai".to_string()),
                api: None,
                doc: None,
                models,
            },
        );
        ModelRegistry { providers }
    }

    #[test]
    fn test_cache_save_and_load() {
        let dir = tempdir().unwrap();
        let cache_path = dir.path().join("registry.json");
        let meta_path = dir.path().join("registry.meta.json");

        let cache = ModelCache::with_paths(cache_path.clone(), meta_path.clone());
        let registry = sample_registry();

        // Save
        cache.save(&registry).unwrap();
        assert!(cache_path.exists());
        assert!(meta_path.exists());

        // Load
        let loaded = cache.load().unwrap();
        assert!(loaded.is_some());
        let loaded = loaded.unwrap();
        assert!(loaded.providers.contains_key("openai"));
    }

    #[test]
    fn test_cache_stale_check() {
        let dir = tempdir().unwrap();
        let cache_path = dir.path().join("registry.json");
        let meta_path = dir.path().join("registry.meta.json");

        let cache = ModelCache::with_paths(cache_path, meta_path).with_ttl(Duration::from_secs(1));
        let registry = sample_registry();

        // Save and immediately check - should not be stale
        cache.save(&registry).unwrap();
        assert!(!cache.is_stale().unwrap());

        // Wait and check - should be stale
        std::thread::sleep(Duration::from_secs(2));
        assert!(cache.is_stale().unwrap());
    }

    #[test]
    fn test_cache_clear() {
        let dir = tempdir().unwrap();
        let cache_path = dir.path().join("registry.json");
        let meta_path = dir.path().join("registry.meta.json");

        let cache = ModelCache::with_paths(cache_path.clone(), meta_path.clone());
        let registry = sample_registry();

        cache.save(&registry).unwrap();
        assert!(cache_path.exists());

        cache.clear().unwrap();
        assert!(!cache_path.exists());
        assert!(!meta_path.exists());
    }
}
