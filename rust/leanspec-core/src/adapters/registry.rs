//! Adapter registry — factory that resolves [`AdapterConfig`] into concrete
//! [`Adapter`] implementations and loads configuration from disk.
//!
//! When additional adapters (GitHub, ADO, Jira, Linear) land, wire them up
//! in [`AdapterRegistry::create`]; the rest of the system keeps using
//! [`AdapterRegistry`] unchanged.

use std::path::Path;

use super::markdown::MarkdownAdapter;
use super::{Adapter, AdapterConfig, AdapterError};

/// Factory for [`Adapter`] instances.
pub struct AdapterRegistry;

impl AdapterRegistry {
    /// Instantiate an adapter from the provided configuration.
    pub fn create(config: &AdapterConfig) -> Result<Box<dyn Adapter>, AdapterError> {
        match config.adapter.as_str() {
            "markdown" => {
                let dir = config
                    .settings
                    .get("directory")
                    .and_then(|v| v.as_str())
                    .unwrap_or("specs");
                Ok(Box::new(MarkdownAdapter::new(dir)))
            }
            other => Err(AdapterError::ConfigError(format!(
                "unknown adapter '{other}' — only 'markdown' is built-in; \
                 register additional adapters via your plugin registry"
            ))),
        }
    }

    /// The built-in default: markdown adapter rooted at `specs/`.
    pub fn default_adapter() -> Box<dyn Adapter> {
        Box::new(MarkdownAdapter::new("specs"))
    }

    /// Load adapter configuration from a YAML file.
    ///
    /// A missing file falls back to [`AdapterConfig::default`]. A
    /// present-but-malformed file surfaces a [`AdapterError::ConfigError`].
    pub fn load_config(path: &Path) -> Result<AdapterConfig, AdapterError> {
        if !path.exists() {
            return Ok(AdapterConfig::default());
        }

        let content = std::fs::read_to_string(path)?;

        let value: serde_yaml::Value = serde_yaml::from_str(&content).map_err(|err| {
            AdapterError::ConfigError(format!(
                "Failed to parse YAML in {}: {}",
                path.display(),
                err
            ))
        })?;

        let mapping = match value.as_mapping() {
            Some(m) => m,
            None => return Ok(AdapterConfig::default()),
        };

        // Support both `adapter:` (new) and `provider:` (legacy) top-level key.
        let adapter_value = mapping
            .get(serde_yaml::Value::String("adapter".into()))
            .or_else(|| mapping.get(serde_yaml::Value::String("provider".into())));

        let adapter_name = match adapter_value.and_then(|v| v.as_str()) {
            Some(s) => s.to_string(),
            None => return Ok(AdapterConfig::default()),
        };

        // Collect all remaining YAML keys as the settings object.
        let mut settings = serde_json::Map::new();
        for (k, v) in mapping.iter() {
            if let Some(key_str) = k.as_str() {
                if key_str != "adapter" && key_str != "provider" {
                    if let Ok(json_val) = serde_json::to_value(v) {
                        settings.insert(key_str.to_string(), json_val);
                    }
                }
            }
        }

        Ok(AdapterConfig {
            adapter: adapter_name,
            settings: serde_json::Value::Object(settings),
        })
    }

    /// Resolve an adapter from the project's default configuration locations,
    /// falling back to [`default_adapter`](Self::default_adapter) if none is
    /// present.
    pub fn from_project() -> Result<Box<dyn Adapter>, AdapterError> {
        let config_paths = [
            "leanspec.adapter.yaml",
            ".lean-spec/adapter.yaml",
            // Legacy locations, still honoured so existing projects keep working.
            "leanspec.provider.yaml",
            ".lean-spec/provider.yaml",
        ];

        for path in &config_paths {
            let path = Path::new(path);
            if path.exists() {
                let config = Self::load_config(path)?;
                return Self::create(&config);
            }
        }

        Ok(Self::default_adapter())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn create_markdown_adapter() {
        let cfg = AdapterConfig {
            adapter: "markdown".into(),
            settings: serde_json::json!({ "directory": "specs" }),
        };
        let adapter = AdapterRegistry::create(&cfg).unwrap();
        assert_eq!(adapter.capabilities().name, "markdown");
    }

    #[test]
    fn create_unknown_adapter_is_error() {
        let cfg = AdapterConfig {
            adapter: "nonexistent".into(),
            settings: serde_json::Value::Null,
        };
        assert!(matches!(
            AdapterRegistry::create(&cfg).unwrap_err(),
            AdapterError::ConfigError(_)
        ));
    }

    #[test]
    fn default_is_markdown() {
        let adapter = AdapterRegistry::default_adapter();
        assert_eq!(adapter.capabilities().name, "markdown");
    }

    #[test]
    fn missing_config_returns_default() {
        let cfg = AdapterRegistry::load_config(Path::new("/definitely/not/here.yaml")).unwrap();
        assert_eq!(cfg.adapter, "markdown");
    }

    #[test]
    fn load_adapter_yaml() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("adapter.yaml");
        std::fs::write(&p, "adapter: markdown\ndirectory: foo\n").unwrap();
        let cfg = AdapterRegistry::load_config(&p).unwrap();
        assert_eq!(cfg.adapter, "markdown");
        assert_eq!(
            cfg.settings.get("directory").and_then(|v| v.as_str()),
            Some("foo")
        );
    }

    #[test]
    fn load_legacy_provider_yaml() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("provider.yaml");
        std::fs::write(&p, "provider: markdown\ndirectory: bar\n").unwrap();
        let cfg = AdapterRegistry::load_config(&p).unwrap();
        assert_eq!(cfg.adapter, "markdown");
        assert_eq!(
            cfg.settings.get("directory").and_then(|v| v.as_str()),
            Some("bar")
        );
    }

    #[test]
    fn non_adapter_config_returns_default() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("config.yaml");
        std::fs::write(&p, "specs_dir: foo\nmax_tokens: 4000\n").unwrap();
        let cfg = AdapterRegistry::load_config(&p).unwrap();
        assert_eq!(cfg.adapter, "markdown");
    }
}
