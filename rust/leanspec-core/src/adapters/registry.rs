//! Adapter registry — factory that resolves [`AdapterConfig`] into concrete
//! [`Adapter`] implementations and loads configuration from disk.
//!
//! When additional adapters (GitHub, ADO, Jira, Linear) land, they get wired
//! up here; the rest of the system keeps using [`AdapterRegistry`].

use std::path::Path;

use super::markdown::MarkdownAdapter;
use super::{Adapter, AdapterConfig, AdapterError};

/// Factory for [`Adapter`] instances.
pub struct AdapterRegistry;

impl AdapterRegistry {
    /// Instantiate an adapter from the provided configuration.
    pub fn create(config: &AdapterConfig) -> Result<Box<dyn Adapter>, AdapterError> {
        match config {
            AdapterConfig::Markdown { directory } => Ok(Box::new(MarkdownAdapter::new(directory))),
        }
    }

    /// The built-in default: markdown adapter rooted at `specs/`.
    pub fn default_adapter() -> Box<dyn Adapter> {
        Box::new(MarkdownAdapter::new("specs"))
    }

    /// Load adapter configuration from a YAML file.
    ///
    /// A missing file falls back to the default ([`AdapterConfig::default`]).
    /// Present-but-malformed files surface a [`AdapterError::ConfigError`]
    /// rather than being silently ignored.
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

        // Allow either `adapter:` (new) or `provider:` (legacy) top-level key
        // to identify the backend. Any file missing both falls back to default
        // so a generic `.lean-spec/config.yaml` isn't mistaken for adapter
        // config.
        let has_adapter_key = value
            .as_mapping()
            .and_then(|m| {
                m.get(serde_yaml::Value::String("adapter".into()))
                    .or_else(|| m.get(serde_yaml::Value::String("provider".into())))
            })
            .is_some();

        if !has_adapter_key {
            return Ok(AdapterConfig::default());
        }

        // If the file uses the legacy `provider:` key, rewrite to `adapter:`
        // before deserialising.
        let normalized = if content.contains("provider:") && !content.contains("adapter:") {
            content.replacen("provider:", "adapter:", 1)
        } else {
            content
        };

        serde_yaml::from_str::<AdapterConfig>(&normalized).map_err(|err| {
            AdapterError::ConfigError(format!(
                "Failed to parse adapter configuration in {}: {}",
                path.display(),
                err
            ))
        })
    }

    /// Resolve an adapter from the project's default configuration locations,
    /// falling back to [`default_adapter`](Self::default_adapter) if none is
    /// present.
    pub fn from_project() -> Result<Box<dyn Adapter>, AdapterError> {
        let config_paths = [
            "leanspec.adapter.yaml",
            ".lean-spec/adapter.yaml",
            // Legacy locations, still honoured so existing projects keep working
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
        let config = AdapterConfig::Markdown {
            directory: "specs".into(),
        };
        let adapter = AdapterRegistry::create(&config).unwrap();
        assert_eq!(adapter.capabilities().name, "markdown");
    }

    #[test]
    fn default_is_markdown() {
        let adapter = AdapterRegistry::default_adapter();
        assert_eq!(adapter.capabilities().name, "markdown");
    }

    #[test]
    fn missing_config_returns_default() {
        let cfg = AdapterRegistry::load_config(Path::new("/definitely/not/here.yaml")).unwrap();
        assert!(matches!(cfg, AdapterConfig::Markdown { .. }));
    }

    #[test]
    fn load_adapter_yaml() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("adapter.yaml");
        std::fs::write(&p, "adapter: markdown\ndirectory: foo\n").unwrap();
        let cfg = AdapterRegistry::load_config(&p).unwrap();
        match cfg {
            AdapterConfig::Markdown { directory } => assert_eq!(directory, "foo"),
        }
    }

    #[test]
    fn load_legacy_provider_yaml() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("provider.yaml");
        std::fs::write(&p, "provider: markdown\ndirectory: bar\n").unwrap();
        let cfg = AdapterRegistry::load_config(&p).unwrap();
        match cfg {
            AdapterConfig::Markdown { directory } => assert_eq!(directory, "bar"),
        }
    }

    #[test]
    fn non_adapter_config_returns_default() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("config.yaml");
        std::fs::write(&p, "specs_dir: foo\nmax_tokens: 4000\n").unwrap();
        let cfg = AdapterRegistry::load_config(&p).unwrap();
        match cfg {
            AdapterConfig::Markdown { directory } => assert_eq!(directory, "specs"),
        }
    }

    #[test]
    fn invalid_yaml_is_config_error() {
        let tmp = TempDir::new().unwrap();
        let p = tmp.path().join("adapter.yaml");
        std::fs::write(&p, "adapter: markdown\n  bad indent").unwrap();
        let res = AdapterRegistry::load_config(&p);
        assert!(matches!(res, Err(AdapterError::ConfigError(_))));
    }
}
