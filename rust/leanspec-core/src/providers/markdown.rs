//! Markdown provider — the default spec backend.
//!
//! Wraps the existing `SpecLoader` and `SpecWriter` to implement the
//! `SpecProvider` trait. This preserves full backwards compatibility:
//! existing projects with `specs/` directories work exactly as before.

use crate::search::{search_specs_with_options, SearchOptions, SearchResult};
use crate::spec_ops::{DependencyGraph, SpecLoader};
use crate::types::{SpecFilterOptions, SpecInfo};
use std::path::{Path, PathBuf};

use super::{
    CreateSpecRequest, ProviderCapabilities, ProviderError, SpecProvider, UpdateSpecRequest,
};

/// Spec provider backed by local markdown files in a `specs/` directory.
///
/// This is the default provider and preserves the original LeanSpec behavior:
/// specs live as `specs/NNN-name/README.md` files with YAML frontmatter.
pub struct MarkdownProvider {
    specs_dir: PathBuf,
}

impl MarkdownProvider {
    /// Create a new markdown provider for the given specs directory.
    pub fn new<P: AsRef<Path>>(specs_dir: P) -> Self {
        Self {
            specs_dir: specs_dir.as_ref().to_path_buf(),
        }
    }

    /// Get the underlying specs directory path.
    pub fn specs_dir(&self) -> &Path {
        &self.specs_dir
    }

    /// Determine the next available spec number.
    fn next_spec_number(&self) -> Result<u32, ProviderError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let specs = loader
            .load_all_metadata()
            .map_err(|e| ProviderError::IoError(std::io::Error::other(e.to_string())))?;

        let max_num = specs.iter().filter_map(|s| s.number()).max().unwrap_or(0);
        Ok(max_num + 1)
    }
}

impl SpecProvider for MarkdownProvider {
    fn name(&self) -> &str {
        "markdown"
    }

    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities::full()
    }

    fn list(&self, filters: &SpecFilterOptions) -> Result<Vec<SpecInfo>, ProviderError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let specs = loader.load_all().map_err(|e| ProviderError::ParseError {
            path: self.specs_dir.display().to_string(),
            reason: e.to_string(),
        })?;

        Ok(specs.into_iter().filter(|s| filters.matches(s)).collect())
    }

    fn get(&self, id: &str) -> Result<SpecInfo, ProviderError> {
        let loader = SpecLoader::new(&self.specs_dir);
        loader
            .load(id)
            .map_err(|e| ProviderError::ParseError {
                path: id.to_string(),
                reason: e.to_string(),
            })?
            .ok_or_else(|| ProviderError::NotFound(id.to_string()))
    }

    fn create(&self, request: &CreateSpecRequest) -> Result<SpecInfo, ProviderError> {
        let number = self.next_spec_number()?;
        let dir_name = format!("{:03}-{}", number, request.name);

        // Build frontmatter YAML
        let mut frontmatter_lines = vec![
            "---".to_string(),
            format!("status: {}", request.status),
            format!(
                "created: '{}'",
                chrono::Utc::now().format("%Y-%m-%d")
            ),
        ];

        if let Some(priority) = &request.priority {
            frontmatter_lines.push(format!("priority: {}", priority));
        }

        if !request.tags.is_empty() {
            frontmatter_lines.push(format!(
                "tags: [{}]",
                request.tags.join(", ")
            ));
        }

        if !request.depends_on.is_empty() {
            frontmatter_lines.push("depends_on:".to_string());
            for dep in &request.depends_on {
                frontmatter_lines.push(format!("  - \"{}\"", dep));
            }
        }

        if let Some(parent) = &request.parent {
            frontmatter_lines.push(format!("parent: \"{}\"", parent));
        }

        if let Some(assignee) = &request.assignee {
            frontmatter_lines.push(format!("assignee: \"{}\"", assignee));
        }

        frontmatter_lines.push("---".to_string());

        let template = format!(
            "{}\n\n# {}\n\n{}",
            frontmatter_lines.join("\n"),
            request.title,
            if request.content.is_empty() {
                "## Overview\n\n## Design\n\n## Plan\n\n## Test\n".to_string()
            } else {
                request.content.clone()
            }
        );

        let loader = SpecLoader::new(&self.specs_dir);
        loader
            .create_spec(&dir_name, &request.title, &template)
            .map_err(|e| ProviderError::IoError(std::io::Error::other(e.to_string())))
    }

    fn update(&self, id: &str, request: &UpdateSpecRequest) -> Result<SpecInfo, ProviderError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let spec = loader
            .load(id)
            .map_err(|e| ProviderError::ParseError {
                path: id.to_string(),
                reason: e.to_string(),
            })?
            .ok_or_else(|| ProviderError::NotFound(id.to_string()))?;

        // Build the updated frontmatter
        let mut fm = spec.frontmatter.clone();

        if let Some(status) = &request.status {
            fm.status = *status;
        }
        if let Some(priority) = &request.priority {
            fm.priority = Some(*priority);
        }
        if let Some(tags) = &request.tags {
            fm.tags = tags.clone();
        }
        if let Some(assignee) = &request.assignee {
            fm.assignee = Some(assignee.clone());
        }
        if let Some(parent) = &request.parent {
            fm.parent = Some(parent.clone());
        }
        if let Some(depends_on) = &request.depends_on {
            fm.depends_on = depends_on.clone();
        }

        // Serialize frontmatter and rebuild content
        let frontmatter_yaml =
            serde_yaml::to_string(&fm).map_err(|e| ProviderError::ParseError {
                path: id.to_string(),
                reason: e.to_string(),
            })?;

        let body = request.content.as_deref().unwrap_or(&spec.content);

        let new_content = format!("---\n{}---\n\n{}", frontmatter_yaml, body);

        loader
            .update_spec(&spec.path, &new_content)
            .map_err(|e| ProviderError::IoError(std::io::Error::other(e.to_string())))?;

        // Reload and return the updated spec
        self.get(id)
    }

    fn search(
        &self,
        query: &str,
        options: &SearchOptions,
    ) -> Result<Vec<SearchResult>, ProviderError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let specs = loader.load_all().map_err(|e| ProviderError::ParseError {
            path: self.specs_dir.display().to_string(),
            reason: e.to_string(),
        })?;

        Ok(search_specs_with_options(&specs, query, options.clone()))
    }

    fn dependencies(&self, id: &str) -> Result<DependencyGraph, ProviderError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let specs = loader.load_all().map_err(|e| ProviderError::ParseError {
            path: self.specs_dir.display().to_string(),
            reason: e.to_string(),
        })?;

        // Verify the requested spec exists
        if !specs.iter().any(|s| s.path == id) {
            return Err(ProviderError::NotFound(id.to_string()));
        }

        Ok(DependencyGraph::new(&specs))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::SpecStatus;
    use tempfile::TempDir;

    fn create_test_spec(dir: &Path, name: &str, status: &str) {
        let spec_dir = dir.join(name);
        std::fs::create_dir_all(&spec_dir).unwrap();
        let content = format!(
            "---\nstatus: {}\ncreated: '2025-01-01'\n---\n\n# Test Spec {}\n\nContent.\n",
            status, name
        );
        std::fs::write(spec_dir.join("README.md"), content).unwrap();
    }

    #[test]
    fn test_markdown_provider_name() {
        let tmp = TempDir::new().unwrap();
        let provider = MarkdownProvider::new(tmp.path());
        assert_eq!(provider.name(), "markdown");
    }

    #[test]
    fn test_markdown_provider_capabilities() {
        let tmp = TempDir::new().unwrap();
        let provider = MarkdownProvider::new(tmp.path());
        let caps = provider.capabilities();
        assert!(caps.create);
        assert!(caps.update);
        assert!(caps.delete);
        assert!(caps.search);
        assert!(caps.dependencies);
    }

    #[test]
    fn test_markdown_provider_list() {
        let tmp = TempDir::new().unwrap();
        let specs_dir = tmp.path().join("specs");
        std::fs::create_dir_all(&specs_dir).unwrap();
        create_test_spec(&specs_dir, "001-first", "planned");
        create_test_spec(&specs_dir, "002-second", "in-progress");

        let provider = MarkdownProvider::new(&specs_dir);
        let specs = provider.list(&SpecFilterOptions::default()).unwrap();

        assert_eq!(specs.len(), 2);
        assert_eq!(specs[0].path, "001-first");
        assert_eq!(specs[1].path, "002-second");
    }

    #[test]
    fn test_markdown_provider_list_with_filter() {
        let tmp = TempDir::new().unwrap();
        let specs_dir = tmp.path().join("specs");
        std::fs::create_dir_all(&specs_dir).unwrap();
        create_test_spec(&specs_dir, "001-first", "planned");
        create_test_spec(&specs_dir, "002-second", "in-progress");

        let provider = MarkdownProvider::new(&specs_dir);
        let filters = SpecFilterOptions {
            status: Some(vec![SpecStatus::InProgress]),
            ..Default::default()
        };
        let specs = provider.list(&filters).unwrap();

        assert_eq!(specs.len(), 1);
        assert_eq!(specs[0].path, "002-second");
    }

    #[test]
    fn test_markdown_provider_get() {
        let tmp = TempDir::new().unwrap();
        let specs_dir = tmp.path().join("specs");
        std::fs::create_dir_all(&specs_dir).unwrap();
        create_test_spec(&specs_dir, "001-my-feature", "draft");

        let provider = MarkdownProvider::new(&specs_dir);
        let spec = provider.get("001-my-feature").unwrap();

        assert_eq!(spec.path, "001-my-feature");
        assert_eq!(spec.frontmatter.status, SpecStatus::Draft);
    }

    #[test]
    fn test_markdown_provider_get_not_found() {
        let tmp = TempDir::new().unwrap();
        let specs_dir = tmp.path().join("specs");
        std::fs::create_dir_all(&specs_dir).unwrap();

        let provider = MarkdownProvider::new(&specs_dir);
        let result = provider.get("nonexistent");

        assert!(matches!(result, Err(ProviderError::NotFound(_))));
    }

    #[test]
    fn test_markdown_provider_create() {
        let tmp = TempDir::new().unwrap();
        let specs_dir = tmp.path().join("specs");
        std::fs::create_dir_all(&specs_dir).unwrap();

        let provider = MarkdownProvider::new(&specs_dir);
        let request = CreateSpecRequest {
            name: "new-feature".to_string(),
            title: "New Feature".to_string(),
            status: SpecStatus::Draft,
            priority: None,
            tags: vec!["test".to_string()],
            content: String::new(),
            assignee: None,
            parent: None,
            depends_on: vec![],
            custom: Default::default(),
        };

        let spec = provider.create(&request).unwrap();
        assert!(spec.path.contains("new-feature"));
        assert_eq!(spec.frontmatter.status, SpecStatus::Draft);
    }

    #[test]
    fn test_markdown_provider_search() {
        let tmp = TempDir::new().unwrap();
        let specs_dir = tmp.path().join("specs");
        std::fs::create_dir_all(&specs_dir).unwrap();
        create_test_spec(&specs_dir, "001-auth-system", "planned");
        create_test_spec(&specs_dir, "002-cli-tool", "in-progress");

        let provider = MarkdownProvider::new(&specs_dir);
        let results = provider
            .search("auth", &SearchOptions::new().with_limit(10))
            .unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].path, "001-auth-system");
    }
}
