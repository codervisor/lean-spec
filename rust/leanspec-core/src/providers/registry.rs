//! Provider registry — factory for creating providers from configuration.
//!
//! The registry resolves a `ProviderConfig` into a concrete `SpecProvider`
//! implementation. It also handles loading provider configuration from the
//! project's config file.

use std::path::Path;

use super::ado::AdoProvider;
use super::github::GitHubProvider;
use super::markdown::MarkdownProvider;
use super::{ProviderConfig, ProviderError, SpecProvider};

/// Factory for creating spec providers from configuration.
pub struct ProviderRegistry;

impl ProviderRegistry {
    /// Create a provider from a configuration.
    pub fn create(config: &ProviderConfig) -> Result<Box<dyn SpecProvider>, ProviderError> {
        match config {
            ProviderConfig::Markdown { directory } => {
                Ok(Box::new(MarkdownProvider::new(directory)))
            }
            ProviderConfig::GitHub {
                owner,
                repo,
                label_prefix,
                ..
            } => Ok(Box::new(GitHubProvider::new(owner, repo, label_prefix))),
            ProviderConfig::Ado {
                organization,
                project,
                work_item_type,
                ..
            } => Ok(Box::new(AdoProvider::new(
                organization,
                project,
                work_item_type,
            ))),
        }
    }

    /// Create the default provider (markdown, specs directory).
    pub fn default_provider() -> Box<dyn SpecProvider> {
        Box::new(MarkdownProvider::new("specs"))
    }

    /// Load provider configuration from a YAML file.
    ///
    /// Missing files fall back to the default markdown provider config.
    /// Invalid YAML or invalid provider configuration returns a `ConfigError`
    /// so misconfigurations are surfaced rather than silently ignored.
    pub fn load_config(path: &Path) -> Result<ProviderConfig, ProviderError> {
        if !path.exists() {
            return Ok(ProviderConfig::default());
        }

        let content = std::fs::read_to_string(path)?;

        // First validate it's valid YAML at all
        let value: serde_yaml::Value = serde_yaml::from_str(&content).map_err(|err| {
            ProviderError::ConfigError(format!(
                "Failed to parse YAML in {}: {}",
                path.display(),
                err
            ))
        })?;

        // If the file has no `provider` key, it's not a provider config — fall back
        let has_provider_key = value
            .as_mapping()
            .and_then(|m| m.get(serde_yaml::Value::String("provider".to_string())))
            .is_some();

        if !has_provider_key {
            return Ok(ProviderConfig::default());
        }

        // Parse as provider config, surfacing errors for typos / invalid values
        serde_yaml::from_str::<ProviderConfig>(&content).map_err(|err| {
            ProviderError::ConfigError(format!(
                "Failed to parse provider configuration in {}: {}",
                path.display(),
                err
            ))
        })
    }

    /// Load provider from the project's default config location.
    ///
    /// Checks these locations in order:
    /// 1. `leanspec.provider.yaml` (dedicated provider config)
    /// 2. `.lean-spec/provider.yaml` (in config directory)
    ///
    /// Falls back to the default markdown provider if no config is found.
    pub fn from_project() -> Result<Box<dyn SpecProvider>, ProviderError> {
        let config_paths = ["leanspec.provider.yaml", ".lean-spec/provider.yaml"];

        for path in &config_paths {
            let path = Path::new(path);
            if path.exists() {
                let config = Self::load_config(path)?;
                return Self::create(&config);
            }
        }

        // Default: markdown provider with "specs" directory
        Ok(Self::default_provider())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_create_markdown_provider() {
        let config = ProviderConfig::Markdown {
            directory: "specs".to_string(),
        };
        let provider = ProviderRegistry::create(&config).unwrap();
        assert_eq!(provider.name(), "markdown");
    }

    #[test]
    fn test_create_github_provider() {
        let config = ProviderConfig::GitHub {
            owner: "myuser".to_string(),
            repo: "myrepo".to_string(),
            label_prefix: "spec:".to_string(),
            token: None,
        };
        let provider = ProviderRegistry::create(&config).unwrap();
        assert_eq!(provider.name(), "github");
    }

    #[test]
    fn test_create_ado_provider() {
        let config = ProviderConfig::Ado {
            organization: "myorg".to_string(),
            project: "myproject".to_string(),
            work_item_type: "User Story".to_string(),
            token: None,
        };
        let provider = ProviderRegistry::create(&config).unwrap();
        assert_eq!(provider.name(), "ado");
    }

    #[test]
    fn test_default_provider_is_markdown() {
        let provider = ProviderRegistry::default_provider();
        assert_eq!(provider.name(), "markdown");
    }

    #[test]
    fn test_load_config_missing_file_returns_default() {
        let config = ProviderRegistry::load_config(Path::new("nonexistent.yaml")).unwrap();
        match config {
            ProviderConfig::Markdown { directory } => {
                assert_eq!(directory, "specs");
            }
            _ => panic!("Expected default Markdown config"),
        }
    }

    #[test]
    fn test_load_config_from_yaml() {
        let tmp = TempDir::new().unwrap();
        let config_path = tmp.path().join("provider.yaml");
        std::fs::write(
            &config_path,
            "provider: github\nowner: testuser\nrepo: testrepo\nlabel_prefix: \"spec:\"\n",
        )
        .unwrap();

        let config = ProviderRegistry::load_config(&config_path).unwrap();
        match config {
            ProviderConfig::GitHub { owner, repo, .. } => {
                assert_eq!(owner, "testuser");
                assert_eq!(repo, "testrepo");
            }
            _ => panic!("Expected GitHub config"),
        }
    }

    #[test]
    fn test_from_project_falls_back_to_default() {
        // When run from a directory without provider config, should return markdown
        let provider = ProviderRegistry::from_project().unwrap();
        assert_eq!(provider.name(), "markdown");
    }

    #[test]
    fn test_load_config_invalid_yaml_returns_error() {
        let tmp = TempDir::new().unwrap();
        let config_path = tmp.path().join("provider.yaml");
        std::fs::write(&config_path, "provider: github\n  bad indent").unwrap();

        let result = ProviderRegistry::load_config(&config_path);
        assert!(matches!(result, Err(ProviderError::ConfigError(_))));
    }

    #[test]
    fn test_load_config_no_provider_key_returns_default() {
        let tmp = TempDir::new().unwrap();
        let config_path = tmp.path().join("config.yaml");
        std::fs::write(&config_path, "specs_dir: my-specs\nmax_tokens: 4000\n").unwrap();

        let config = ProviderRegistry::load_config(&config_path).unwrap();
        match config {
            ProviderConfig::Markdown { directory } => {
                assert_eq!(directory, "specs");
            }
            _ => panic!("Expected default Markdown config when no provider key"),
        }
    }
}
