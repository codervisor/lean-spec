//! Project discovery utilities for finding LeanSpec projects

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

/// Errors that can occur during project discovery
#[derive(Debug, Error)]
pub enum DiscoveryError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Path does not exist: {0}")]
    PathNotFound(PathBuf),

    #[error("Access denied: {0}")]
    PermissionDenied(String),
}

/// A discovered LeanSpec project
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredProject {
    /// Absolute path to the project directory
    pub path: PathBuf,
    /// Project name (from package.json or directory name)
    pub name: String,
    /// Whether this project has a .lean-spec directory
    pub has_lean_spec: bool,
    /// Path to specs directory
    pub specs_dir: Option<PathBuf>,
}

/// Project discovery configuration
pub struct ProjectDiscovery {
    /// Maximum depth to scan (default: 5)
    max_depth: usize,
    /// Directories to skip
    ignore_dirs: Vec<String>,
}

impl Default for ProjectDiscovery {
    fn default() -> Self {
        Self {
            max_depth: 5,
            ignore_dirs: vec![
                ".git".to_string(),
                "node_modules".to_string(),
                "target".to_string(),
                ".next".to_string(),
                "dist".to_string(),
                "build".to_string(),
                ".svn".to_string(),
                ".hg".to_string(),
                "vendor".to_string(),
                "__pycache__".to_string(),
            ],
        }
    }
}

impl ProjectDiscovery {
    /// Create a new project discovery with default settings
    pub fn new() -> Self {
        Self::default()
    }

    /// Set maximum scan depth
    pub fn with_max_depth(mut self, max_depth: usize) -> Self {
        self.max_depth = max_depth;
        self
    }

    /// Add a directory to ignore
    pub fn with_ignore_dir(mut self, dir: String) -> Self {
        self.ignore_dirs.push(dir);
        self
    }

    /// Discover LeanSpec projects starting from a path
    pub fn discover<P: AsRef<Path>>(
        &self,
        start_path: P,
    ) -> Result<Vec<DiscoveredProject>, DiscoveryError> {
        let start_path = start_path.as_ref();

        if !start_path.exists() {
            return Err(DiscoveryError::PathNotFound(start_path.to_path_buf()));
        }

        let mut projects = Vec::new();
        self.scan_directory(start_path, 0, &mut projects)?;

        Ok(projects)
    }

    /// Recursively scan a directory for LeanSpec projects
    fn scan_directory(
        &self,
        path: &Path,
        depth: usize,
        projects: &mut Vec<DiscoveredProject>,
    ) -> Result<(), DiscoveryError> {
        // Stop if max depth reached
        if depth > self.max_depth {
            return Ok(());
        }

        // Check if this directory is a LeanSpec project
        let lean_spec_dir = path.join(".lean-spec");
        if lean_spec_dir.exists() && lean_spec_dir.is_dir() {
            let name = self.extract_project_name(path)?;
            let specs_dir = self.find_specs_dir(path);

            projects.push(DiscoveredProject {
                path: path.to_path_buf(),
                name,
                has_lean_spec: true,
                specs_dir,
            });

            // Don't scan nested projects
            return Ok(());
        }

        // Scan subdirectories
        match fs::read_dir(path) {
            Ok(entries) => {
                for entry in entries {
                    let entry = match entry {
                        Ok(e) => e,
                        Err(_) => continue, // Skip entries we can't read
                    };

                    let entry_path = entry.path();

                    // Skip if not a directory
                    if !entry_path.is_dir() {
                        continue;
                    }

                    // Skip ignored directories
                    if self.is_ignored(&entry_path) {
                        continue;
                    }

                    // Recursively scan subdirectory
                    if let Err(e) = self.scan_directory(&entry_path, depth + 1, projects) {
                        // Log error but continue scanning
                        eprintln!("Error scanning {}: {}", entry_path.display(), e);
                    }
                }
            }
            Err(e) => {
                // Return permission denied error only if it's the start directory
                if depth == 0 {
                    return Err(DiscoveryError::PermissionDenied(e.to_string()));
                }
                // Otherwise, just skip this directory
            }
        }

        Ok(())
    }

    /// Check if a directory should be ignored
    fn is_ignored(&self, path: &Path) -> bool {
        if let Some(name) = path.file_name() {
            if let Some(name_str) = name.to_str() {
                // Skip hidden directories (starting with .)
                if name_str.starts_with('.') {
                    return true;
                }

                // Skip ignored directories
                if self.ignore_dirs.contains(&name_str.to_string()) {
                    return true;
                }
            }
        }

        false
    }

    /// Extract project name from directory
    fn extract_project_name(&self, path: &Path) -> Result<String, DiscoveryError> {
        // Try to read package.json
        let package_json_path = path.join("package.json");
        if package_json_path.exists() {
            if let Ok(content) = fs::read_to_string(&package_json_path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(name) = json.get("name").and_then(|n| n.as_str()) {
                        return Ok(name.to_string());
                    }
                }
            }
        }

        // Try to read Cargo.toml
        let cargo_toml_path = path.join("Cargo.toml");
        if cargo_toml_path.exists() {
            if let Ok(content) = fs::read_to_string(&cargo_toml_path) {
                // Simple TOML parsing for name field
                for line in content.lines() {
                    if line.trim().starts_with("name") {
                        if let Some(name) = line.split('=').nth(1) {
                            let name = name.trim().trim_matches('"').trim_matches('\'');
                            return Ok(name.to_string());
                        }
                    }
                }
            }
        }

        // Fall back to directory name
        Ok(path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string())
    }

    /// Find the specs directory in a project
    fn find_specs_dir(&self, project_path: &Path) -> Option<PathBuf> {
        // Try common locations
        let specs_dir = project_path.join("specs");
        if specs_dir.exists() && specs_dir.is_dir() {
            return Some(specs_dir);
        }

        let docs_specs = project_path.join("docs").join("specs");
        if docs_specs.exists() && docs_specs.is_dir() {
            return Some(docs_specs);
        }

        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_leanspec_project(dir: &Path, name: &str, with_package_json: bool) -> PathBuf {
        let project_dir = dir.join(name);
        fs::create_dir_all(&project_dir).unwrap();

        // Create .lean-spec directory
        fs::create_dir_all(project_dir.join(".lean-spec")).unwrap();

        // Create specs directory
        fs::create_dir_all(project_dir.join("specs")).unwrap();

        if with_package_json {
            let package_json = serde_json::json!({
                "name": name,
                "version": "1.0.0"
            });
            fs::write(
                project_dir.join("package.json"),
                serde_json::to_string_pretty(&package_json).unwrap(),
            )
            .unwrap();
        }

        project_dir
    }

    #[test]
    fn test_discover_single_project() {
        let temp_dir = TempDir::new().unwrap();
        create_leanspec_project(temp_dir.path(), "test-project", true);

        let discovery = ProjectDiscovery::new();
        let projects = discovery.discover(temp_dir.path()).unwrap();

        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "test-project");
        assert!(projects[0].has_lean_spec);
        assert!(projects[0].specs_dir.is_some());
    }

    #[test]
    fn test_discover_multiple_projects() {
        let temp_dir = TempDir::new().unwrap();
        create_leanspec_project(temp_dir.path(), "project-1", true);
        create_leanspec_project(temp_dir.path(), "project-2", true);

        let discovery = ProjectDiscovery::new();
        let projects = discovery.discover(temp_dir.path()).unwrap();

        assert_eq!(projects.len(), 2);
        assert!(projects.iter().any(|p| p.name == "project-1"));
        assert!(projects.iter().any(|p| p.name == "project-2"));
    }

    #[test]
    fn test_discover_nested_projects() {
        let temp_dir = TempDir::new().unwrap();
        let parent = create_leanspec_project(temp_dir.path(), "parent-project", true);

        // Create nested project (should be ignored)
        create_leanspec_project(&parent, "nested-project", true);

        let discovery = ProjectDiscovery::new();
        let projects = discovery.discover(temp_dir.path()).unwrap();

        // Should only find the parent project, not the nested one
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "parent-project");
    }

    #[test]
    fn test_ignore_patterns() {
        let temp_dir = TempDir::new().unwrap();

        // Create project in regular directory
        create_leanspec_project(temp_dir.path(), "regular-project", true);

        // Create project in node_modules (should be ignored)
        let node_modules = temp_dir.path().join("node_modules");
        fs::create_dir_all(&node_modules).unwrap();
        create_leanspec_project(&node_modules, "ignored-project", true);

        let discovery = ProjectDiscovery::new();
        let projects = discovery.discover(temp_dir.path()).unwrap();

        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "regular-project");
    }

    #[test]
    fn test_max_depth() {
        let temp_dir = TempDir::new().unwrap();

        // Create deeply nested structure
        let level1 = temp_dir.path().join("level1");
        let level2 = level1.join("level2");
        let level3 = level2.join("level3");
        fs::create_dir_all(&level3).unwrap();

        create_leanspec_project(&level3, "deep-project", true);

        // With max_depth=2, should not find the project
        let discovery = ProjectDiscovery::new().with_max_depth(2);
        let projects = discovery.discover(temp_dir.path()).unwrap();
        assert_eq!(projects.len(), 0);

        // With max_depth=5, should find it
        let discovery = ProjectDiscovery::new().with_max_depth(5);
        let projects = discovery.discover(temp_dir.path()).unwrap();
        assert_eq!(projects.len(), 1);
    }

    #[test]
    fn test_extract_name_without_package_json() {
        let temp_dir = TempDir::new().unwrap();
        let project_path = create_leanspec_project(temp_dir.path(), "no-package-json", false);

        let discovery = ProjectDiscovery::new();
        let name = discovery.extract_project_name(&project_path).unwrap();

        assert_eq!(name, "no-package-json");
    }
}
