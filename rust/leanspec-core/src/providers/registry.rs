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
    /// Looks for `provider` key in the config. If not found, returns
    /// the default markdown provider config.
    pub fn load_config(path: &Path) -> Result<ProviderConfig, ProviderError> {
        if !path.exists() {
            return Ok(ProviderConfig::default());
        }

        let content = std::fs::read_to_string(path)?;

        // Try to parse as provider config first
        match serde_yaml::from_str::<ProviderConfig>(&content) {
            Ok(config) => Ok(config),
            Err(_) => {
                // If the config file exists but doesn't have provider config,
                // fall back to default (markdown).
                Ok(ProviderConfig::default())
            }
        }
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
}
