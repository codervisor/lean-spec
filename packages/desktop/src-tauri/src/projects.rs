use std::{collections::VecDeque, fs, path::{Path, PathBuf}};

use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use dirs::home_dir;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use hex::encode;
use walkdir::WalkDir;

const CONFIG_DIR: &str = ".lean-spec";
const PROJECTS_JSON: &str = "projects.json";
const PROJECTS_YAML: &str = "projects.yaml";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopProject {
    pub id: String,
    pub name: String,
    pub path: String,
    pub specs_dir: String,
    pub last_accessed: String,
    pub favorite: bool,
    pub color: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectsFile {
    #[serde(default)]
    projects: Vec<DesktopProject>,
    #[serde(default)]
    recent_projects: Vec<String>,
}

pub struct ProjectStore {
    path_json: PathBuf,
    path_yaml: PathBuf,
    data: RwLock<ProjectsFile>,
}

impl ProjectStore {
    pub fn load() -> Self {
        let dir = home_dir().map(|dir| dir.join(CONFIG_DIR)).unwrap_or_else(|| PathBuf::from("."));
        let json = dir.join(PROJECTS_JSON);
        let yaml = dir.join(PROJECTS_YAML);

        let data = read_projects(&json, &yaml).unwrap_or_default();
        Self {
            path_json: json,
            path_yaml: yaml,
            data: RwLock::new(data),
        }
    }

    pub fn all(&self) -> Vec<DesktopProject> {
        self.data.read().projects.clone()
    }

    pub fn find(&self, project_id: &str) -> Option<DesktopProject> {
        self.data
            .read()
            .projects
            .iter()
            .find(|project| project.id == project_id)
            .cloned()
    }

    pub fn refresh(&self) -> Vec<DesktopProject> {
        if let Ok(latest) = read_projects(&self.path_json, &self.path_yaml) {
            let mut guard = self.data.write();
            *guard = latest;
        }
        self.all()
    }

    pub fn set_active(&self, project_id: &str) -> Option<DesktopProject> {
        let mut guard = self.data.write();
        if let Some(project) = guard.projects.iter_mut().find(|project| project.id == project_id) {
            project.last_accessed = Utc::now().to_rfc3339();
            guard.recent_projects.retain(|id| id != project_id);
            guard.recent_projects.insert(0, project_id.to_string());
            let snapshot = project.clone();
            let _ = write_projects(&self.path_json, &guard);
            return Some(snapshot);
        }
        None
    }

    pub fn add_project(&self, project_path: &Path) -> Result<DesktopProject> {
        let candidate = validate_project(project_path)?;
        let mut guard = self.data.write();

        if let Some(existing) = guard.projects.iter_mut().find(|project| project.id == candidate.id) {
            existing.last_accessed = Utc::now().to_rfc3339();
            let snapshot = existing.clone();
            let _ = write_projects(&self.path_json, &guard);
            return Ok(snapshot);
        }

        guard.projects.push(candidate.clone());
        guard.recent_projects.retain(|id| id != &candidate.id);
        guard.recent_projects.insert(0, candidate.id.clone());
        let _ = write_projects(&self.path_json, &guard);
        Ok(candidate)
    }
}

impl Default for ProjectStore {
    fn default() -> Self {
        Self::load()
    }
}

fn read_projects(json_path: &Path, yaml_path: &Path) -> Result<ProjectsFile> {
    if let Ok(content) = fs::read_to_string(json_path) {
        return serde_json::from_str(&content).map_err(Into::into);
    }

    if let Ok(content) = fs::read_to_string(yaml_path) {
        return serde_yaml::from_str(&content).map_err(Into::into);
    }

    Ok(ProjectsFile::default())
}

fn write_projects(path: &Path, data: &ProjectsFile) -> Result<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }

    let json = serde_json::to_string_pretty(data)?;
    fs::write(path, json)?;
    Ok(())
}

fn validate_project(path: &Path) -> Result<DesktopProject> {
    let metadata = fs::metadata(path).with_context(|| format!("{path:?} is not accessible"))?;
    if !metadata.is_dir() {
        return Err(anyhow!("{path:?} is not a directory"));
    }

    let normalized = dunce::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let specs_dir = detect_specs_dir(&normalized)?;
    let name = infer_name(&normalized);
    let description = infer_description(&normalized);

    let id = hash_path(&normalized);
    Ok(DesktopProject {
        id,
        name,
        path: normalized.display().to_string(),
        specs_dir: specs_dir.display().to_string(),
        last_accessed: Utc::now().to_rfc3339(),
        favorite: false,
        color: None,
        description,
    })
}

fn detect_specs_dir(root: &Path) -> Result<PathBuf> {
    let specs = root.join("specs");
    if specs.exists() {
        return Ok(specs);
    }

    let nested = root.join(".lean-spec").join("specs");
    if nested.exists() {
        return Ok(nested);
    }

    Err(anyhow!("No specs directory found for {root:?}"))
}

fn infer_name(root: &Path) -> String {
    root.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "LeanSpec Project".into())
}

fn infer_description(root: &Path) -> Option<String> {
    let descriptors = ["leanspec.yaml", "leanspec.yml", "lean-spec.yaml", "lean-spec.yml"];
    for file in descriptors {
        let path = root.join(file);
        if !path.exists() {
            continue;
        }
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(value) = serde_yaml::from_str::<Value>(&content) {
                if let Some(description) = value.get("description").and_then(|value| value.as_str()) {
                    return Some(description.to_string());
                }
            }
        }
    }
    None
}

fn hash_path(path: &Path) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.display().to_string().as_bytes());
    hex::encode(hasher.finalize())[0..12].to_string()
}

pub fn discover_projects(root: &Path, limit: usize) -> Vec<PathBuf> {
    let mut found = Vec::new();
    let mut queue = VecDeque::new();
    queue.push_back((root.to_path_buf(), 0));

    while let Some((dir, depth)) = queue.pop_front() {
        if depth > 3 {
            continue;
        }

        if let Ok(metadata) = detect_specs_dir(&dir) {
            found.push(metadata);
            if found.len() >= limit {
                break;
            }
            continue;
        }

        for entry in WalkDir::new(&dir).min_depth(1).max_depth(1) {
            if let Ok(entry) = entry {
                if entry.file_type().is_dir() {
                    queue.push_back((entry.into_path(), depth + 1));
                }
            }
        }
    }

    found
}
