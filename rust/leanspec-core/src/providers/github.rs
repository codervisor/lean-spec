//! GitHub Issues provider — use GitHub Issues/Projects as spec backend.
//!
//! This provider maps LeanSpec concepts to GitHub primitives:
//!
//! | LeanSpec       | GitHub                           |
//! |---------------|----------------------------------|
//! | Spec ID       | Issue number                     |
//! | Status        | Open/Closed + labels (e.g., `spec:draft`) |
//! | Priority      | Labels (e.g., `priority:high`)   |
//! | Tags          | Labels                           |
//! | Dependencies  | Issue references in body         |
//! | Assignee      | Issue assignees                  |
//! | Parent/Epic   | Milestone or Project             |
//! | Content       | Issue body (markdown)            |
//!
//! ## Configuration
//!
//! ```yaml
//! provider: github
//! owner: myuser
//! repo: myproject
//! label_prefix: "spec:"
//! ```
//!
//! ## Status
//!
//! This is a stub implementation. The actual GitHub API integration will be
//! implemented in a future phase. See spec 381 for the roadmap.

use crate::search::{SearchOptions, SearchResult};
use crate::spec_ops::DependencyGraph;
use crate::types::{SpecFilterOptions, SpecInfo};

use super::{
    CreateSpecRequest, ProviderCapabilities, ProviderError, SpecProvider, UpdateSpecRequest,
};

/// Spec provider backed by GitHub Issues.
///
/// Maps GitHub Issues to LeanSpec specs using label conventions for status,
/// priority, and tags.
pub struct GitHubProvider {
    #[allow(dead_code)]
    owner: String,
    #[allow(dead_code)]
    repo: String,
    #[allow(dead_code)]
    label_prefix: String,
}

impl GitHubProvider {
    /// Create a new GitHub provider.
    pub fn new(owner: &str, repo: &str, label_prefix: &str) -> Self {
        Self {
            owner: owner.to_string(),
            repo: repo.to_string(),
            label_prefix: label_prefix.to_string(),
        }
    }

    fn not_implemented(&self, operation: &str) -> ProviderError {
        ProviderError::NotSupported {
            provider: self.name().to_string(),
            operation: format!(
                "{} (GitHub provider not yet implemented — see spec 381)",
                operation
            ),
        }
    }
}

impl SpecProvider for GitHubProvider {
    fn name(&self) -> &str {
        "github"
    }

    fn capabilities(&self) -> ProviderCapabilities {
        // All capabilities are false until the GitHub API integration is
        // implemented. See spec 381 phase 2 for the roadmap.
        ProviderCapabilities {
            create: false,
            update: false,
            delete: false,
            search: false,
            dependencies: false,
            custom_fields: false,
            webhooks: false,
            bidirectional_sync: false,
        }
    }

    fn list(&self, _filters: &SpecFilterOptions) -> Result<Vec<SpecInfo>, ProviderError> {
        Err(self.not_implemented("list"))
    }

    fn get(&self, id: &str) -> Result<SpecInfo, ProviderError> {
        Err(self.not_implemented(&format!("get({})", id)))
    }

    fn create(&self, _request: &CreateSpecRequest) -> Result<SpecInfo, ProviderError> {
        Err(self.not_implemented("create"))
    }

    fn update(&self, id: &str, _request: &UpdateSpecRequest) -> Result<SpecInfo, ProviderError> {
        Err(self.not_implemented(&format!("update({})", id)))
    }

    fn search(
        &self,
        _query: &str,
        _options: &SearchOptions,
    ) -> Result<Vec<SearchResult>, ProviderError> {
        Err(self.not_implemented("search"))
    }

    fn delete(&self, _id: &str) -> Result<(), ProviderError> {
        Err(self.not_implemented("delete"))
    }

    fn dependencies(&self, _id: &str) -> Result<DependencyGraph, ProviderError> {
        Err(ProviderError::NotSupported {
            provider: self.name().to_string(),
            operation: "dependencies (GitHub Issues don't natively track spec dependencies)"
                .to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_github_provider_name() {
        let provider = GitHubProvider::new("myuser", "myrepo", "spec:");
        assert_eq!(provider.name(), "github");
    }

    #[test]
    fn test_github_provider_capabilities_all_false_until_implemented() {
        let provider = GitHubProvider::new("myuser", "myrepo", "spec:");
        let caps = provider.capabilities();
        assert!(!caps.create);
        assert!(!caps.update);
        assert!(!caps.delete);
        assert!(!caps.search);
        assert!(!caps.dependencies);
        assert!(!caps.webhooks);
    }

    #[test]
    fn test_github_provider_returns_not_supported() {
        let provider = GitHubProvider::new("myuser", "myrepo", "spec:");

        let result = provider.list(&SpecFilterOptions::default());
        assert!(matches!(result, Err(ProviderError::NotSupported { .. })));

        let result = provider.get("42");
        assert!(matches!(result, Err(ProviderError::NotSupported { .. })));
    }

    #[test]
    fn test_github_provider_dependencies_not_supported() {
        let provider = GitHubProvider::new("myuser", "myrepo", "spec:");
        let result = provider.dependencies("42");
        assert!(matches!(result, Err(ProviderError::NotSupported { .. })));
    }
}
