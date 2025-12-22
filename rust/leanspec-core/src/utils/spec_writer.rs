//! Spec file writing and metadata updates

use crate::types::{SpecFrontmatter, SpecPriority, SpecStatus};
use crate::utils::{LoadError, SpecLoader};
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

/// Errors that can occur during spec writing
#[derive(Debug, Error)]
pub enum WriteError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Spec not found: {0}")]
    NotFound(String),

    #[error("Failed to serialize frontmatter: {0}")]
    SerializationError(String),

    #[error("Invalid frontmatter format: {0}")]
    InvalidFormat(String),

    #[error("Load error: {0}")]
    LoadError(#[from] LoadError),
}

/// Metadata updates for a spec
#[derive(Debug, Clone, Default)]
pub struct MetadataUpdate {
    pub status: Option<SpecStatus>,
    pub priority: Option<SpecPriority>,
    pub tags: Option<Vec<String>>,
    pub assignee: Option<String>,
}

impl MetadataUpdate {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_status(mut self, status: SpecStatus) -> Self {
        self.status = Some(status);
        self
    }

    pub fn with_priority(mut self, priority: SpecPriority) -> Self {
        self.priority = Some(priority);
        self
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = Some(tags);
        self
    }

    pub fn with_assignee(mut self, assignee: String) -> Self {
        self.assignee = Some(assignee);
        self
    }
}

/// Spec writer for updating spec metadata
pub struct SpecWriter {
    specs_dir: PathBuf,
}

impl SpecWriter {
    /// Create a new spec writer for the given directory
    pub fn new<P: AsRef<Path>>(specs_dir: P) -> Self {
        Self {
            specs_dir: specs_dir.as_ref().to_path_buf(),
        }
    }

    /// Update metadata for a spec
    pub fn update_metadata(
        &self,
        spec_path: &str,
        updates: MetadataUpdate,
    ) -> Result<SpecFrontmatter, WriteError> {
        // Load the spec
        let loader = SpecLoader::new(&self.specs_dir);
        let spec = loader
            .load(spec_path)?
            .ok_or_else(|| WriteError::NotFound(spec_path.to_string()))?;

        // Update frontmatter
        let mut frontmatter = spec.frontmatter.clone();

        if let Some(status) = updates.status {
            frontmatter.status = status;
        }

        if let Some(priority) = updates.priority {
            frontmatter.priority = Some(priority);
        }

        if let Some(tags) = updates.tags {
            frontmatter.tags = tags;
        }

        if let Some(assignee) = updates.assignee {
            if assignee.is_empty() {
                frontmatter.assignee = None;
            } else {
                frontmatter.assignee = Some(assignee);
            }
        }

        // Update timestamp
        frontmatter.updated_at = Some(Utc::now());

        // Rebuild the spec content with updated frontmatter
        let new_content = self.rebuild_spec_with_frontmatter(&spec.content, &frontmatter)?;

        // Atomic write to file
        self.atomic_write_file(&spec.file_path, &new_content)?;

        Ok(frontmatter)
    }

    /// Rebuild spec content with new frontmatter
    fn rebuild_spec_with_frontmatter(
        &self,
        original_content: &str,
        frontmatter: &SpecFrontmatter,
    ) -> Result<String, WriteError> {
        // The original_content is just the body (without frontmatter)
        // We don't need to parse it, just append it to the new frontmatter

        // Serialize frontmatter to YAML
        let yaml_str = serde_yaml::to_string(frontmatter)
            .map_err(|e| WriteError::SerializationError(e.to_string()))?;

        // Rebuild: frontmatter + body
        // Ensure body starts with a newline after the closing ---
        let body = original_content.trim_start_matches('\n');
        Ok(format!("---\n{}---\n{}", yaml_str, body))
    }

    /// Atomically write content to a file
    fn atomic_write_file(&self, path: &Path, content: &str) -> Result<(), WriteError> {
        // Write to temporary file first
        let temp_path = path.with_extension("tmp");
        fs::write(&temp_path, content)?;

        // Atomic rename
        fs::rename(&temp_path, path)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_spec(dir: &Path, name: &str) -> PathBuf {
        let spec_dir = dir.join(name);
        fs::create_dir_all(&spec_dir).unwrap();

        let readme_path = spec_dir.join("README.md");
        let content = r#"---
status: planned
created: 2025-01-01
priority: medium
tags:
- test
- example
assignee: tester
---

# Test Spec

This is a test spec for unit testing.

## Overview

Test content here.
"#;
        fs::write(&readme_path, content).unwrap();
        readme_path
    }

    #[test]
    fn test_update_metadata_status() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();
        create_test_spec(specs_dir, "001-test-spec");

        let writer = SpecWriter::new(specs_dir);
        let updates = MetadataUpdate::new().with_status(SpecStatus::InProgress);

        let result = writer.update_metadata("001-test-spec", updates);
        assert!(result.is_ok());

        let frontmatter = result.unwrap();
        assert_eq!(frontmatter.status, SpecStatus::InProgress);
        assert!(frontmatter.updated_at.is_some());
    }

    #[test]
    fn test_update_metadata_multiple_fields() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();
        create_test_spec(specs_dir, "002-test-spec");

        let writer = SpecWriter::new(specs_dir);
        let updates = MetadataUpdate::new()
            .with_status(SpecStatus::Complete)
            .with_priority(SpecPriority::High)
            .with_tags(vec!["updated".to_string(), "test".to_string()])
            .with_assignee("new-assignee".to_string());

        let result = writer.update_metadata("002-test-spec", updates);
        assert!(result.is_ok());

        let frontmatter = result.unwrap();
        assert_eq!(frontmatter.status, SpecStatus::Complete);
        assert_eq!(frontmatter.priority, Some(SpecPriority::High));
        assert_eq!(frontmatter.tags, vec!["updated", "test"]);
        assert_eq!(frontmatter.assignee, Some("new-assignee".to_string()));
    }

    #[test]
    fn test_update_preserves_content() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();
        let spec_path = create_test_spec(specs_dir, "003-test-spec");

        let writer = SpecWriter::new(specs_dir);
        let updates = MetadataUpdate::new().with_status(SpecStatus::InProgress);

        writer.update_metadata("003-test-spec", updates).unwrap();

        let new_content = fs::read_to_string(&spec_path).unwrap();

        // Check that body content is preserved
        assert!(new_content.contains("# Test Spec"));
        assert!(new_content.contains("This is a test spec for unit testing."));
        assert!(new_content.contains("## Overview"));
        assert!(new_content.contains("Test content here."));

        // Check that status was updated
        assert!(new_content.contains("status: in-progress"));
    }

    #[test]
    fn test_atomic_write() {
        let temp_dir = TempDir::new().unwrap();
        let test_file = temp_dir.path().join("test.txt");

        let writer = SpecWriter::new(temp_dir.path());
        let result = writer.atomic_write_file(&test_file, "test content");

        assert!(result.is_ok());
        assert!(test_file.exists());
        assert_eq!(fs::read_to_string(&test_file).unwrap(), "test content");

        // Verify temp file was cleaned up
        let temp_file = test_file.with_extension("tmp");
        assert!(!temp_file.exists());
    }
}
