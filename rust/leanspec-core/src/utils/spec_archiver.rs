//! Spec archiving utilities
//!
//! Handles moving specs to and from the archived/ directory

use crate::types::SpecStatus;
use crate::utils::{LoadError, MetadataUpdate, SpecLoader, SpecWriter, WriteError};
use std::fs;
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

    #[error("Target already exists: {0}")]
    TargetExists(String),

    #[error("Invalid spec path")]
    InvalidPath,

    #[error("Load error: {0}")]
    LoadError(#[from] LoadError),

    #[error("Write error: {0}")]
    WriteError(#[from] WriteError),
}

/// Spec archiver for moving specs to/from archived directory
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

    /// Archive a spec by moving it to the archived/ directory
    pub fn archive(&self, spec_path: &str) -> Result<(), ArchiveError> {
        // Load the spec
        let loader = SpecLoader::new(&self.specs_dir);
        let spec = loader
            .load(spec_path)?
            .ok_or_else(|| ArchiveError::NotFound(spec_path.to_string()))?;

        // Check if already archived
        if spec.path.starts_with("archived/") {
            return Err(ArchiveError::AlreadyArchived);
        }

        let archived_dir = self.specs_dir.join("archived");

        // Ensure archived directory exists
        if !archived_dir.exists() {
            fs::create_dir_all(&archived_dir)?;
        }

        // Get the spec directory
        let spec_dir = spec.file_path.parent().ok_or(ArchiveError::InvalidPath)?;
        let spec_dir_name = spec_dir
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or(ArchiveError::InvalidPath)?;

        let target_dir = archived_dir.join(spec_dir_name);

        // Check if target already exists
        if target_dir.exists() {
            return Err(ArchiveError::TargetExists(target_dir.display().to_string()));
        }

        // Move the directory first to avoid race condition
        fs::rename(spec_dir, &target_dir)?;

        // Now update status to archived in the file at the new location
        // Update metadata using SpecWriter on the new path
        // We need to pass the path relative to specs_dir
        let relative_path = format!("archived/{}", spec_dir_name);
        let writer = SpecWriter::new(&self.specs_dir);
        let updates = MetadataUpdate::new().with_status(SpecStatus::Archived);
        writer.update_metadata(&relative_path, updates)?;

        Ok(())
    }

    /// Unarchive a spec by moving it from archived/ to the root directory
    pub fn unarchive(&self, spec_path: &str) -> Result<(), ArchiveError> {
        // Load the spec
        let loader = SpecLoader::new(&self.specs_dir);
        let spec = loader
            .load(spec_path)?
            .ok_or_else(|| ArchiveError::NotFound(spec_path.to_string()))?;

        // Check if actually archived
        if !spec.path.starts_with("archived/") {
            return Err(ArchiveError::InvalidPath);
        }

        // Get the spec directory
        let spec_dir = spec.file_path.parent().ok_or(ArchiveError::InvalidPath)?;
        let spec_dir_name = spec_dir
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or(ArchiveError::InvalidPath)?;

        let target_dir = self.specs_dir.join(spec_dir_name);

        // Check if target already exists
        if target_dir.exists() {
            return Err(ArchiveError::TargetExists(target_dir.display().to_string()));
        }

        // Move the directory
        fs::rename(spec_dir, &target_dir)?;

        // Update status - typically we'd set it back to planned or whatever it was before
        let writer = SpecWriter::new(&self.specs_dir);
        let updates = MetadataUpdate::new().with_status(SpecStatus::Planned);
        writer.update_metadata(spec_dir_name, updates)?;

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
---

# Test Spec

This is a test spec.
"#;
        fs::write(&readme_path, content).unwrap();
        readme_path
    }

    #[test]
    fn test_archive_spec() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();
        create_test_spec(specs_dir, "001-test-spec");

        let archiver = SpecArchiver::new(specs_dir);
        let result = archiver.archive("001-test-spec");
        assert!(result.is_ok());

        // Check that spec was moved
        assert!(!specs_dir.join("001-test-spec").exists());
        assert!(specs_dir.join("archived").join("001-test-spec").exists());

        // Check that spec can be loaded from archived location
        let loader = SpecLoader::new(specs_dir);
        let spec = loader.load("archived/001-test-spec").unwrap().unwrap();
        assert_eq!(spec.frontmatter.status, SpecStatus::Archived);
    }

    #[test]
    fn test_archive_already_archived() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();

        // Create archived directory and spec
        let archived_dir = specs_dir.join("archived");
        fs::create_dir_all(&archived_dir).unwrap();
        create_test_spec(&archived_dir, "001-test-spec");

        let archiver = SpecArchiver::new(specs_dir);
        let result = archiver.archive("archived/001-test-spec");
        assert!(matches!(result, Err(ArchiveError::AlreadyArchived)));
    }

    #[test]
    fn test_unarchive_spec() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();

        // Create an archived spec
        let archived_dir = specs_dir.join("archived");
        fs::create_dir_all(&archived_dir).unwrap();
        create_test_spec(&archived_dir, "001-test-spec");

        let archiver = SpecArchiver::new(specs_dir);
        let result = archiver.unarchive("archived/001-test-spec");
        assert!(result.is_ok());

        // Check that spec was moved back
        assert!(specs_dir.join("001-test-spec").exists());
        assert!(!archived_dir.join("001-test-spec").exists());

        // Check that status was updated
        let loader = SpecLoader::new(specs_dir);
        let spec = loader.load("001-test-spec").unwrap().unwrap();
        assert_eq!(spec.frontmatter.status, SpecStatus::Planned);
    }
}
