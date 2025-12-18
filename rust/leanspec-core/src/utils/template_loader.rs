//! Template loader for spec creation

use crate::types::LeanSpecConfig;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TemplateError {
    #[error("Templates directory not found: {0}")]
    TemplatesDirMissing(PathBuf),

    #[error("Template not found. Tried: {0:?}")]
    NotFound(Vec<PathBuf>),

    #[error("Failed to read template at {path}: {reason}")]
    ReadError { path: PathBuf, reason: String },

    #[error("Template directory missing README.md: {0}")]
    MissingReadme(PathBuf),
}

pub struct TemplateLoader {
    templates_dir: PathBuf,
    config: Option<LeanSpecConfig>,
}

impl TemplateLoader {
    pub fn new<P: AsRef<Path>>(project_root: P) -> Self {
        Self {
            templates_dir: project_root.as_ref().join(".lean-spec").join("templates"),
            config: None,
        }
    }

    pub fn with_config<P: AsRef<Path>>(project_root: P, config: LeanSpecConfig) -> Self {
        Self {
            templates_dir: project_root.as_ref().join(".lean-spec").join("templates"),
            config: Some(config),
        }
    }

    pub fn templates_dir(&self) -> &Path {
        &self.templates_dir
    }

    pub fn load(&self, template_name: Option<&str>) -> Result<String, TemplateError> {
        if !self.templates_dir.exists() {
            return Err(TemplateError::TemplatesDirMissing(self.templates_dir.clone()));
        }

        let mut tried = Vec::new();

        // Build candidate list with de-duplication
        let mut candidates: Vec<String> = Vec::new();
        let mut seen = HashSet::new();

        if let Some(name) = template_name {
            if seen.insert(name.to_string()) {
                candidates.push(name.to_string());
            }
        } else if let Some(config) = &self.config {
            if let Some(default) = &config.default_template {
                if seen.insert(default.clone()) {
                    candidates.push(default.clone());
                }
            }
        }

        for fallback in ["spec-template.md", "README.md"] {
            if seen.insert(fallback.to_string()) {
                candidates.push(fallback.to_string());
            }
        }

        for candidate in candidates {
            let path = self.templates_dir.join(&candidate);
            tried.push(path.clone());

            if path.exists() {
                return self.read_template(&path);
            }
        }

        Err(TemplateError::NotFound(tried))
    }

    fn read_template(&self, path: &Path) -> Result<String, TemplateError> {
        if path.is_dir() {
            let readme = path.join("README.md");
            if !readme.exists() {
                return Err(TemplateError::MissingReadme(path.to_path_buf()));
            }
            fs::read_to_string(&readme).map_err(|e| TemplateError::ReadError {
                path: readme,
                reason: e.to_string(),
            })
        } else {
            fs::read_to_string(path).map_err(|e| TemplateError::ReadError {
                path: path.to_path_buf(),
                reason: e.to_string(),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn loads_file_template() {
        let temp = TempDir::new().unwrap();
        let templates_dir = temp.path().join(".lean-spec/templates");
        fs::create_dir_all(&templates_dir).unwrap();
        let template_path = templates_dir.join("spec-template.md");
        fs::write(&template_path, "# Test {name}").unwrap();

        let loader = TemplateLoader::new(temp.path());
        let content = loader.load(None).unwrap();
        assert!(content.contains("Test"));
    }

    #[test]
    fn falls_back_to_readme() {
        let temp = TempDir::new().unwrap();
        let template_dir = temp.path().join(".lean-spec/templates/custom");
        fs::create_dir_all(&template_dir).unwrap();
        fs::write(template_dir.join("README.md"), "# Readme Template").unwrap();

        let loader = TemplateLoader::new(temp.path());
        let content = loader.load(Some("custom"));
        assert!(content.is_ok());
    }

    #[test]
    fn returns_missing_dir_error() {
        let temp = TempDir::new().unwrap();
        let loader = TemplateLoader::new(temp.path());
        let err = loader.load(None).unwrap_err();
        matches!(err, TemplateError::TemplatesDirMissing(_));
    }
}
