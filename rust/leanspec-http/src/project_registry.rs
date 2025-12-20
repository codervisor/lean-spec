//! Project registry for multi-project support
//!
//! Manages the collection of registered LeanSpec projects.

use crate::config::projects_path;
use crate::error::ServerError;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

fn default_timestamp() -> DateTime<Utc> {
    Utc::now()
}

/// A registered LeanSpec project
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    /// Unique identifier for the project
    pub id: String,

    /// Display name
    pub name: String,

    /// Root path of the project
    pub path: PathBuf,

    /// Specs directory within the project
    pub specs_dir: PathBuf,

    /// Whether this is a favorite project
    #[serde(default)]
    pub favorite: bool,

    /// Optional color for UI display
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,

    /// Last time this project was accessed
    #[serde(default = "default_timestamp")]
    pub last_accessed: DateTime<Utc>,

    /// When the project was added
    #[serde(default = "default_timestamp")]
    pub added_at: DateTime<Utc>,
}

impl Project {
    /// Create a new project from a path
    pub fn from_path(path: &Path) -> Result<Self, ServerError> {
        // Validate the path exists
        if !path.exists() {
            return Err(ServerError::RegistryError(format!(
                "Path does not exist: {}",
                path.display()
            )));
        }

        // Determine project name from path
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "Unnamed Project".to_string());

        // Find specs directory
        let specs_dir = find_specs_dir(path)?;

        let now = Utc::now();

        Ok(Self {
            id: Uuid::new_v4().to_string(),
            name,
            path: path.to_path_buf(),
            specs_dir,
            favorite: false,
            color: None,
            last_accessed: now,
            added_at: now,
        })
    }

    /// Check if the project still exists on disk
    pub fn exists(&self) -> bool {
        self.path.exists() && self.specs_dir.exists()
    }

    /// Validate the project structure
    pub fn validate(&self) -> Result<(), String> {
        if !self.path.exists() {
            return Err(format!(
                "Project path does not exist: {}",
                self.path.display()
            ));
        }
        if !self.specs_dir.exists() {
            return Err(format!(
                "Specs directory does not exist: {}",
                self.specs_dir.display()
            ));
        }
        Ok(())
    }
}

/// Find the specs directory in a project
fn find_specs_dir(project_path: &Path) -> Result<PathBuf, ServerError> {
    // Check common locations
    let candidates = ["specs", ".lean-spec/specs", "doc/specs", "docs/specs"];

    for candidate in candidates {
        let path = project_path.join(candidate);
        if path.exists() && path.is_dir() {
            return Ok(path);
        }
    }

    // Check for .lean-spec/config.yaml or config.json to get custom specs_dir
    let config_json = project_path.join(".lean-spec/config.json");
    let config_yaml = project_path.join(".lean-spec/config.yaml");

    if config_json.exists() {
        if let Ok(content) = fs::read_to_string(&config_json) {
            if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(specs_dir) = config.get("specs_dir").and_then(|v| v.as_str()) {
                    let path = project_path.join(specs_dir);
                    if path.exists() {
                        return Ok(path);
                    }
                }
            }
        }
    }

    if config_yaml.exists() {
        if let Ok(content) = fs::read_to_string(&config_yaml) {
            if let Ok(config) = serde_yaml::from_str::<serde_yaml::Value>(&content) {
                if let Some(specs_dir) = config.get("specs_dir").and_then(|v| v.as_str()) {
                    let path = project_path.join(specs_dir);
                    if path.exists() {
                        return Ok(path);
                    }
                }
            }
        }
    }

    // Default to "specs" even if it doesn't exist (will be created)
    Ok(project_path.join("specs"))
}

/// Registry file format
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProjectsFile {
    /// List of registered projects
    pub projects: Vec<Project>,

    /// Currently active project ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_project_id: Option<String>,
}

/// Project registry - manages the collection of projects
#[derive(Debug)]
pub struct ProjectRegistry {
    projects: HashMap<String, Project>,
    current_project_id: Option<String>,
    file_path: PathBuf,
}

impl ProjectRegistry {
    /// Create a new registry, loading from disk if available
    pub fn new() -> Result<Self, ServerError> {
        let file_path = projects_path();
        let mut registry = Self {
            projects: HashMap::new(),
            current_project_id: None,
            file_path,
        };

        registry.load()?;
        Ok(registry)
    }

    /// Load projects from disk
    pub fn load(&mut self) -> Result<(), ServerError> {
        if !self.file_path.exists() {
            return Ok(());
        }

        let content = fs::read_to_string(&self.file_path)
            .map_err(|e| ServerError::RegistryError(format!("Failed to read projects: {}", e)))?;

        let file: ProjectsFile = serde_json::from_str(&content)
            .map_err(|e| ServerError::RegistryError(format!("Failed to parse projects: {}", e)))?;

        self.projects = file
            .projects
            .into_iter()
            .map(|p| (p.id.clone(), p))
            .collect();

        self.current_project_id = file.current_project_id;

        Ok(())
    }

    /// Save projects to disk
    pub fn save(&self) -> Result<(), ServerError> {
        // Ensure directory exists
        if let Some(parent) = self.file_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| ServerError::RegistryError(format!("Failed to create dir: {}", e)))?;
        }

        let file = ProjectsFile {
            projects: self.projects.values().cloned().collect(),
            current_project_id: self.current_project_id.clone(),
        };

        let content = serde_json::to_string_pretty(&file)
            .map_err(|e| ServerError::RegistryError(format!("Failed to serialize: {}", e)))?;

        fs::write(&self.file_path, content)
            .map_err(|e| ServerError::RegistryError(format!("Failed to write: {}", e)))?;

        Ok(())
    }

    /// Get all projects
    pub fn all(&self) -> Vec<&Project> {
        let mut projects: Vec<_> = self.projects.values().collect();
        projects.sort_by(|a, b| b.last_accessed.cmp(&a.last_accessed));
        projects
    }

    /// Get a project by ID
    pub fn get(&self, id: &str) -> Option<&Project> {
        self.projects.get(id)
    }

    /// Get the current project
    pub fn current(&self) -> Option<&Project> {
        self.current_project_id
            .as_ref()
            .and_then(|id| self.projects.get(id))
    }

    /// Get the current project ID
    pub fn current_id(&self) -> Option<&str> {
        self.current_project_id.as_deref()
    }

    /// Set the current project
    pub fn set_current(&mut self, id: &str) -> Result<&Project, ServerError> {
        if !self.projects.contains_key(id) {
            return Err(ServerError::RegistryError(format!(
                "Project not found: {}",
                id
            )));
        }

        // Update last_accessed
        if let Some(project) = self.projects.get_mut(id) {
            project.last_accessed = Utc::now();
        }

        self.current_project_id = Some(id.to_string());
        self.save()?;

        self.projects
            .get(id)
            .ok_or_else(|| ServerError::RegistryError("Project not found".to_string()))
    }

    /// Add a new project
    pub fn add(&mut self, path: &Path) -> Result<Project, ServerError> {
        // Check if project already exists
        for project in self.projects.values() {
            if project.path == path {
                return Err(ServerError::RegistryError(
                    "Project already registered".to_string(),
                ));
            }
        }

        let project = Project::from_path(path)?;
        let id = project.id.clone();

        self.projects.insert(id.clone(), project.clone());
        self.current_project_id = Some(id);
        self.save()?;

        Ok(project)
    }

    /// Remove a project
    pub fn remove(&mut self, id: &str) -> Result<(), ServerError> {
        if self.projects.remove(id).is_none() {
            return Err(ServerError::RegistryError("Project not found".to_string()));
        }

        // Clear current if it was the removed project
        if self.current_project_id.as_deref() == Some(id) {
            self.current_project_id = None;
        }

        self.save()
    }

    /// Update a project
    pub fn update(&mut self, id: &str, updates: ProjectUpdate) -> Result<&Project, ServerError> {
        let project = self
            .projects
            .get_mut(id)
            .ok_or_else(|| ServerError::RegistryError("Project not found".to_string()))?;

        if let Some(name) = updates.name {
            project.name = name;
        }
        if let Some(favorite) = updates.favorite {
            project.favorite = favorite;
        }
        if let Some(color) = updates.color {
            project.color = Some(color);
        }

        self.save()?;

        self.projects
            .get(id)
            .ok_or_else(|| ServerError::RegistryError("Project not found".to_string()))
    }

    /// Toggle favorite status
    pub fn toggle_favorite(&mut self, id: &str) -> Result<bool, ServerError> {
        let project = self
            .projects
            .get_mut(id)
            .ok_or_else(|| ServerError::RegistryError("Project not found".to_string()))?;

        project.favorite = !project.favorite;
        let is_favorite = project.favorite;

        self.save()?;

        Ok(is_favorite)
    }

    /// Get favorite projects
    pub fn favorites(&self) -> Vec<&Project> {
        self.projects.values().filter(|p| p.favorite).collect()
    }

    /// Get recent projects (not favorites, sorted by last_accessed)
    pub fn recent(&self, limit: usize) -> Vec<&Project> {
        let mut projects: Vec<_> = self.projects.values().filter(|p| !p.favorite).collect();
        projects.sort_by(|a, b| b.last_accessed.cmp(&a.last_accessed));
        projects.into_iter().take(limit).collect()
    }

    /// Refresh the registry - remove projects that no longer exist
    pub fn refresh(&mut self) -> Result<usize, ServerError> {
        let invalid_ids: Vec<String> = self
            .projects
            .iter()
            .filter(|(_, p)| !p.exists())
            .map(|(id, _)| id.clone())
            .collect();

        let removed = invalid_ids.len();

        for id in invalid_ids {
            self.projects.remove(&id);
            if self.current_project_id.as_deref() == Some(&id) {
                self.current_project_id = None;
            }
        }

        if removed > 0 {
            self.save()?;
        }

        Ok(removed)
    }
}

impl Default for ProjectRegistry {
    fn default() -> Self {
        Self {
            projects: HashMap::new(),
            current_project_id: None,
            file_path: projects_path(),
        }
    }
}

/// Project update payload
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProjectUpdate {
    pub name: Option<String>,
    pub favorite: Option<bool>,
    pub color: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_project(dir: &Path) {
        let specs_dir = dir.join("specs");
        fs::create_dir_all(&specs_dir).unwrap();

        // Create a minimal spec
        let spec_dir = specs_dir.join("001-test");
        fs::create_dir_all(&spec_dir).unwrap();
        fs::write(
            spec_dir.join("README.md"),
            "---\nstatus: planned\ncreated: '2025-01-01'\n---\n\n# Test Spec\n",
        )
        .unwrap();
    }

    #[test]
    fn test_project_from_path() {
        let temp = TempDir::new().unwrap();
        create_test_project(temp.path());

        let project = Project::from_path(temp.path()).unwrap();
        assert!(!project.id.is_empty());
        assert!(project.specs_dir.exists());
    }

    #[test]
    fn test_project_validation() {
        let temp = TempDir::new().unwrap();
        create_test_project(temp.path());

        let project = Project::from_path(temp.path()).unwrap();
        assert!(project.validate().is_ok());
        assert!(project.exists());
    }

    #[test]
    fn test_project_deserializes_without_added_at() {
        let json = r#"{
            "id": "legacy-id",
            "name": "Legacy Project",
            "path": "/tmp/legacy",
            "specsDir": "/tmp/legacy/specs",
            "favorite": false,
            "lastAccessed": "2024-01-01T00:00:00Z"
        }"#;

        let project: Project = serde_json::from_str(json).unwrap();
        assert_eq!(project.id, "legacy-id");
        assert!(project.added_at >= project.last_accessed);
    }
}
