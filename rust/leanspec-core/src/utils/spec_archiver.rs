//! Spec archiving utilities
//!
//! Handles archiving specs by setting status (status-only approach).
//! Legacy support: Specs in archived/ folder are still recognized and can be migrated.

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

    #[error("Spec is not archived")]
    NotArchived,

    #[error("Target already exists: {0}")]
    TargetExists(String),

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

    /// Check if a spec is in the legacy archived/ folder
    fn is_in_archived_folder(spec_dir: &Path) -> bool {
        spec_dir
            .parent()
            .and_then(|parent| parent.file_name())
            .map(|name| name == "archived")
            .unwrap_or(false)
    }

    /// Archive a spec by setting status to archived (no file move)
    pub fn archive(&self, spec_path: &str) -> Result<(), ArchiveError> {
        // Load the spec
        let loader = SpecLoader::new(&self.specs_dir);
        let spec = loader
            .load(spec_path)?
            .ok_or_else(|| ArchiveError::NotFound(spec_path.to_string()))?;

        // Check if already archived (by status or folder location)
        let spec_dir = spec.file_path.parent().ok_or(ArchiveError::InvalidPath)?;
        let is_in_folder = Self::is_in_archived_folder(spec_dir);

        if spec.frontmatter.status == SpecStatus::Archived || is_in_folder {
            return Err(ArchiveError::AlreadyArchived);
        }

        // Update status to archived (no file move in new behavior)
        let writer = SpecWriter::new(&self.specs_dir);
        let updates = MetadataUpdate::new().with_status(SpecStatus::Archived);
        writer.update_metadata(&spec.path, updates)?;

        Ok(())
    }

    /// Unarchive a spec by setting status (and moving out of archived/ folder if needed)
    pub fn unarchive(&self, spec_path: &str) -> Result<(), ArchiveError> {
        // Load the spec
        let loader = SpecLoader::new(&self.specs_dir);
        let spec = loader
            .load(spec_path)?
            .ok_or_else(|| ArchiveError::NotFound(spec_path.to_string()))?;

        // Get the spec directory
        let spec_dir = spec.file_path.parent().ok_or(ArchiveError::InvalidPath)?;
        let is_in_folder = Self::is_in_archived_folder(spec_dir);

        // Check if actually archived
        if spec.frontmatter.status != SpecStatus::Archived && !is_in_folder {
            return Err(ArchiveError::NotArchived);
        }

        // If in legacy archived/ folder, move it out first
        if is_in_folder {
            let spec_dir_name = spec_dir
                .file_name()
                .and_then(|n| n.to_str())
                .ok_or(ArchiveError::InvalidPath)?;

            let target_dir = self.specs_dir.join(spec_dir_name);

            // Check if target already exists
            if target_dir.exists() {
                return Err(ArchiveError::TargetExists(target_dir.display().to_string()));
            }

            // Move the directory out of archived/
            fs::rename(spec_dir, &target_dir)?;

            // Update status at new location
            let writer = SpecWriter::new(&self.specs_dir);
            let updates = MetadataUpdate::new().with_status(SpecStatus::Complete);
            writer.update_metadata(spec_dir_name, updates)?;
        } else {
            // Just update status (new behavior)
            let writer = SpecWriter::new(&self.specs_dir);
            let updates = MetadataUpdate::new().with_status(SpecStatus::Complete);
            writer.update_metadata(&spec.path, updates)?;
        }

        Ok(())
    }

    /// Migrate all specs from archived/ folder to status-based archiving
    /// Returns the number of specs migrated
    pub fn migrate_archived(&self) -> Result<Vec<String>, ArchiveError> {
        let archived_dir = self.specs_dir.join("archived");
        if !archived_dir.exists() {
            return Ok(vec![]);
        }

        let mut migrated = vec![];

        // Find all spec directories in archived/
        for entry in fs::read_dir(&archived_dir)? {
            let entry = entry?;
            let path = entry.path();

            if !path.is_dir() {
                continue;
            }

            let spec_name = path
                .file_name()
                .and_then(|n| n.to_str())
                .ok_or(ArchiveError::InvalidPath)?
                .to_string();

            // Skip if target already exists
            let target_dir = self.specs_dir.join(&spec_name);
            if target_dir.exists() {
                eprintln!(
                    "⚠️  Skipping {}: target already exists at {}",
                    spec_name,
                    target_dir.display()
                );
                continue;
            }

            // Move the directory out of archived/
            fs::rename(&path, &target_dir)?;

            // Update status to archived
            let writer = SpecWriter::new(&self.specs_dir);
            let updates = MetadataUpdate::new().with_status(SpecStatus::Archived);
            writer.update_metadata(&spec_name, updates)?;

            migrated.push(spec_name);
        }

        // Try to remove empty archived/ directory
        if archived_dir.exists() {
            if let Ok(mut entries) = fs::read_dir(&archived_dir) {
                if entries.next().is_none() {
                    let _ = fs::remove_dir(&archived_dir);
                }
            }
        }

        Ok(migrated)
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

        // Check that spec was NOT moved (status-only archiving)
        assert!(specs_dir.join("001-test-spec").exists());
        assert!(!specs_dir.join("archived").exists());

        // Check that status was updated
        let loader = SpecLoader::new(specs_dir);
        let spec = loader.load("001-test-spec").unwrap().unwrap();
        assert_eq!(spec.frontmatter.status, SpecStatus::Archived);
    }

    #[test]
    fn test_archive_already_archived_by_status() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();
        create_test_spec(specs_dir, "001-test-spec", "archived");

        let archiver = SpecArchiver::new(specs_dir);
        let result = archiver.archive("001-test-spec");
        assert!(matches!(result, Err(ArchiveError::AlreadyArchived)));
    }

    #[test]
    fn test_archive_already_archived_by_folder() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();

        // Create archived directory and spec (legacy location)
        let archived_dir = specs_dir.join("archived");
        fs::create_dir_all(&archived_dir).unwrap();
        create_test_spec(&archived_dir, "001-test-spec", "complete");

        let archiver = SpecArchiver::new(specs_dir);
        let result = archiver.archive("archived/001-test-spec");
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

        // Check that spec was NOT moved (status-only)
        assert!(specs_dir.join("001-test-spec").exists());

        // Check that status was updated to complete
        let loader = SpecLoader::new(specs_dir);
        let spec = loader.load("001-test-spec").unwrap().unwrap();
        assert_eq!(spec.frontmatter.status, SpecStatus::Complete);
    }

    #[test]
    fn test_unarchive_from_legacy_folder() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();

        // Create an archived spec in legacy folder
        let archived_dir = specs_dir.join("archived");
        fs::create_dir_all(&archived_dir).unwrap();
        create_test_spec(&archived_dir, "001-test-spec", "complete");

        let archiver = SpecArchiver::new(specs_dir);
        let result = archiver.unarchive("archived/001-test-spec");
        assert!(result.is_ok());

        // Check that spec was moved back
        assert!(specs_dir.join("001-test-spec").exists());
        assert!(!archived_dir.join("001-test-spec").exists());

        // Check that status was updated
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

    #[test]
    fn test_migrate_archived() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path();

        // Create specs in archived/ folder
        let archived_dir = specs_dir.join("archived");
        fs::create_dir_all(&archived_dir).unwrap();
        create_test_spec(&archived_dir, "001-spec-a", "complete");
        create_test_spec(&archived_dir, "002-spec-b", "complete");

        let archiver = SpecArchiver::new(specs_dir);
        let migrated = archiver.migrate_archived().unwrap();

        assert_eq!(migrated.len(), 2);
        assert!(migrated.contains(&"001-spec-a".to_string()));
        assert!(migrated.contains(&"002-spec-b".to_string()));

        // Check specs were moved and status updated
        assert!(specs_dir.join("001-spec-a").exists());
        assert!(specs_dir.join("002-spec-b").exists());
        assert!(!archived_dir.exists()); // Should be removed

        let loader = SpecLoader::new(specs_dir);
        let spec = loader.load("001-spec-a").unwrap().unwrap();
        assert_eq!(spec.frontmatter.status, SpecStatus::Archived);
    }
}
