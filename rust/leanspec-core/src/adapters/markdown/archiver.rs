//! Spec archiving utilities
//!
//! Handles archiving specs by setting status to archived.

#![allow(dead_code)]

use super::loader::{LoadError, SpecLoader};
use super::types::SpecStatus;
use super::writer::{MetadataUpdate, SpecWriter, WriteError};
use std::path::{Path, PathBuf};
use thiserror::Error;

/// Errors that can occur during spec archiving
#[derive(Debug, Error)]
pub enum ArchiveError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Spec not found: {0}")]
    NotFound(String),

    #[error("Spec is already archived")]
    AlreadyArchived,

    #[error("Spec is not archived")]
    NotArchived,

    #[error("Invalid spec path")]
    InvalidPath,

    #[error("Load error: {0}")]
    LoadError(#[from] LoadError),

    #[error("Write error: {0}")]
    WriteError(#[from] WriteError),
}

/// Spec archiver for managing archived status
pub struct SpecArchiver {
    specs_dir: PathBuf,
}

impl SpecArchiver {
    /// Create a new spec archiver for the given directory
    pub fn new<P: AsRef<Path>>(specs_dir: P) -> Self {
        Self {
            specs_dir: specs_dir.as_ref().to_path_buf(),
        }
    }

    /// Archive a spec by setting status to archived
    pub fn archive(&self, spec_path: &str) -> Result<(), ArchiveError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let spec = loader
            .load(spec_path)?
            .ok_or_else(|| ArchiveError::NotFound(spec_path.to_string()))?;

        if spec.frontmatter.status == SpecStatus::Archived {
            return Err(ArchiveError::AlreadyArchived);
        }

        let writer = SpecWriter::new(&self.specs_dir);
        let updates = MetadataUpdate::new().with_status(SpecStatus::Archived);
        writer.update_metadata(&spec.path, updates)?;

        Ok(())
    }

    /// Unarchive a spec by setting status back to complete
    pub fn unarchive(&self, spec_path: &str) -> Result<(), ArchiveError> {
        let loader = SpecLoader::new(&self.specs_dir);
        let spec = loader
            .load(spec_path)?
            .ok_or_else(|| ArchiveError::NotFound(spec_path.to_string()))?;

        if spec.frontmatter.status != SpecStatus::Archived {
            return Err(ArchiveError::NotArchived);
        }

        let writer = SpecWriter::new(&self.specs_dir);
        let updates = MetadataUpdate::new().with_status(SpecStatus::Complete);
        writer.update_metadata(&spec.path, updates)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_spec(dir: &Path, name: &str, status: &str) -> PathBuf {
        let spec_dir = dir.join(name);
        fs::create_dir_all(&spec_dir).unwrap();

        let readme_path = spec_dir.join("README.md");
        let content = format!(
            r#"---
status: {}
created: 2025-01-01
priority: medium
tags:
- test
---

# Test Spec

This is a test spec.
"#,
            status
        );
        fs::write(&readme_path, content).unwrap();
        readme_path
    }

    #[test]
    fn test_archive_spec_status_only() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();
        create_test_spec(specs_dir, "001-test-spec", "planned");

        let archiver = SpecArchiver::new(specs_dir);
        let result = archiver.archive("001-test-spec");
        assert!(result.is_ok());

        // Check that spec still exists in place
        assert!(specs_dir.join("001-test-spec").exists());

        // Check that status was updated
        let loader = SpecLoader::new(specs_dir);
        let spec = loader.load("001-test-spec").unwrap().unwrap();
        assert_eq!(spec.frontmatter.status, SpecStatus::Archived);
    }

    #[test]
    fn test_archive_already_archived() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();
        create_test_spec(specs_dir, "001-test-spec", "archived");

        let archiver = SpecArchiver::new(specs_dir);
        let result = archiver.archive("001-test-spec");
        assert!(matches!(result, Err(ArchiveError::AlreadyArchived)));
    }

    #[test]
    fn test_unarchive_from_status() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();
        create_test_spec(specs_dir, "001-test-spec", "archived");

        let archiver = SpecArchiver::new(specs_dir);
        let result = archiver.unarchive("001-test-spec");
        assert!(result.is_ok());

        // Check that spec still exists in place
        assert!(specs_dir.join("001-test-spec").exists());

        // Check that status was updated to complete
        let loader = SpecLoader::new(specs_dir);
        let spec = loader.load("001-test-spec").unwrap().unwrap();
        assert_eq!(spec.frontmatter.status, SpecStatus::Complete);
    }

    #[test]
    fn test_unarchive_not_archived() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();
        create_test_spec(specs_dir, "001-test-spec", "in-progress");

        let archiver = SpecArchiver::new(specs_dir);
        let result = archiver.unarchive("001-test-spec");
        assert!(matches!(result, Err(ArchiveError::NotArchived)));
    }
}
