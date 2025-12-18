//! Spec file loading and management

use crate::parsers::FrontmatterParser;
use crate::types::{SpecInfo, LeanSpecConfig};
use std::path::{Path, PathBuf};
use thiserror::Error;
use walkdir::WalkDir;

/// Errors that can occur during spec loading
#[derive(Debug, Error)]
pub enum LoadError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Failed to parse spec at {path}: {reason}")]
    ParseError { path: String, reason: String },
    
    #[error("Specs directory not found: {0}")]
    SpecsDirNotFound(PathBuf),
}

/// Spec loader for reading specs from the file system
pub struct SpecLoader {
    specs_dir: PathBuf,
    #[allow(dead_code)]
    config: Option<LeanSpecConfig>,
    parser: FrontmatterParser,
}

impl SpecLoader {
    /// Create a new spec loader for the given directory
    pub fn new<P: AsRef<Path>>(specs_dir: P) -> Self {
        Self {
            specs_dir: specs_dir.as_ref().to_path_buf(),
            config: None,
            parser: FrontmatterParser::new(),
        }
    }
    
    /// Create a spec loader with configuration
    pub fn with_config<P: AsRef<Path>>(specs_dir: P, config: LeanSpecConfig) -> Self {
        let parser = FrontmatterParser::with_config(config.clone());
        Self {
            specs_dir: specs_dir.as_ref().to_path_buf(),
            config: Some(config),
            parser,
        }
    }
    
    /// Load all specs from the directory
    pub fn load_all(&self) -> Result<Vec<SpecInfo>, LoadError> {
        if !self.specs_dir.exists() {
            return Err(LoadError::SpecsDirNotFound(self.specs_dir.clone()));
        }
        
        let mut specs = Vec::new();
        
        for entry in WalkDir::new(&self.specs_dir)
            .max_depth(3)  // Allow sub-specs
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            
            // Only process README.md files
            if path.file_name().map(|n| n == "README.md").unwrap_or(false) {
                if let Some(spec) = self.load_spec_from_path(path)? {
                    specs.push(spec);
                }
            }
        }
        
        // Sort by spec number/path
        specs.sort_by(|a, b| {
            let a_num = a.number().unwrap_or(u32::MAX);
            let b_num = b.number().unwrap_or(u32::MAX);
            a_num.cmp(&b_num).then_with(|| a.path.cmp(&b.path))
        });
        
        Ok(specs)
    }
    
    /// Load a single spec by path/name
    pub fn load(&self, spec_path: &str) -> Result<Option<SpecInfo>, LoadError> {
        // Try direct path first
        let readme_path = self.specs_dir.join(spec_path).join("README.md");
        if readme_path.exists() {
            return self.load_spec_from_path(&readme_path);
        }
        
        // Try fuzzy matching
        for entry in WalkDir::new(&self.specs_dir)
            .max_depth(2)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_dir() {
                let dir_name = entry.file_name().to_string_lossy();
                if dir_name.contains(spec_path) || spec_path.contains(&*dir_name) {
                    let readme_path = entry.path().join("README.md");
                    if readme_path.exists() {
                        return self.load_spec_from_path(&readme_path);
                    }
                }
            }
        }
        
        Ok(None)
    }
    
    /// Load a spec from a README.md file path
    fn load_spec_from_path(&self, path: &Path) -> Result<Option<SpecInfo>, LoadError> {
        let content = std::fs::read_to_string(path)?;
        
        // Get spec directory name
        let spec_dir = path.parent().ok_or_else(|| LoadError::ParseError {
            path: path.display().to_string(),
            reason: "Could not determine spec directory".to_string(),
        })?;
        
        let spec_path = spec_dir
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        
        // Skip archived specs directory and specs inside it
        if spec_path == "archived" {
            return Ok(None);
        }
        
        // Check if this spec is inside the archived directory
        if let Some(parent) = spec_dir.parent() {
            if parent.file_name().map(|n| n == "archived").unwrap_or(false) {
                return Ok(None);
            }
        }
        
        // Skip top-level README.md (specs/README.md) - not a spec
        if spec_dir == self.specs_dir {
            return Ok(None);
        }
        
        // Skip directories that don't look like specs (should start with numbers)
        if !spec_path.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) {
            return Ok(None);
        }
        
        // Parse frontmatter
        let (frontmatter, body) = match self.parser.parse(&content) {
            Ok(result) => result,
            Err(e) => {
                return Err(LoadError::ParseError {
                    path: path.display().to_string(),
                    reason: e.to_string(),
                });
            }
        };
        
        // Extract title from content
        let title = body
            .lines()
            .find(|l| l.starts_with("# "))
            .map(|l| l.trim_start_matches("# ").to_string())
            .unwrap_or_else(|| spec_path.clone());
        
        // Determine if sub-spec
        let is_sub_spec = spec_dir
            .parent()
            .map(|p| p != self.specs_dir)
            .unwrap_or(false);
        
        let parent_spec = if is_sub_spec {
            spec_dir.parent()
                .and_then(|p| p.file_name())
                .map(|n| n.to_string_lossy().to_string())
        } else {
            None
        };
        
        Ok(Some(SpecInfo {
            path: spec_path,
            title,
            frontmatter,
            content: body,
            file_path: path.to_path_buf(),
            is_sub_spec,
            parent_spec,
        }))
    }
    
    /// Create a new spec file
    pub fn create_spec(
        &self,
        name: &str,
        _title: &str,
        template_content: &str,
    ) -> Result<SpecInfo, LoadError> {
        let spec_dir = self.specs_dir.join(name);
        std::fs::create_dir_all(&spec_dir)?;
        
        let readme_path = spec_dir.join("README.md");
        std::fs::write(&readme_path, template_content)?;
        
        self.load_spec_from_path(&readme_path)?
            .ok_or_else(|| LoadError::ParseError {
                path: readme_path.display().to_string(),
                reason: "Failed to load created spec".to_string(),
            })
    }
    
    /// Update a spec's content
    pub fn update_spec(
        &self,
        spec_path: &str,
        new_content: &str,
    ) -> Result<(), LoadError> {
        let readme_path = self.specs_dir.join(spec_path).join("README.md");
        std::fs::write(&readme_path, new_content)?;
        Ok(())
    }
    
    /// Get the specs directory path
    pub fn specs_dir(&self) -> &Path {
        &self.specs_dir
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    
    fn create_test_spec(dir: &Path, name: &str, status: &str) {
        let spec_dir = dir.join(name);
        std::fs::create_dir_all(&spec_dir).unwrap();
        
        let content = format!(r#"---
status: {}
created: '2025-01-01'
---

# Test Spec {}

Content for {}.
"#, status, name, name);
        
        std::fs::write(spec_dir.join("README.md"), content).unwrap();
    }
    
    #[test]
    fn test_load_all_specs() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path().join("specs");
        std::fs::create_dir_all(&specs_dir).unwrap();
        
        create_test_spec(&specs_dir, "001-first", "planned");
        create_test_spec(&specs_dir, "002-second", "in-progress");
        
        let loader = SpecLoader::new(&specs_dir);
        let specs = loader.load_all().unwrap();
        
        assert_eq!(specs.len(), 2);
        assert_eq!(specs[0].path, "001-first");
        assert_eq!(specs[1].path, "002-second");
    }
    
    #[test]
    fn test_load_single_spec() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path().join("specs");
        std::fs::create_dir_all(&specs_dir).unwrap();
        
        create_test_spec(&specs_dir, "001-test", "planned");
        
        let loader = SpecLoader::new(&specs_dir);
        let spec = loader.load("001-test").unwrap().unwrap();
        
        assert_eq!(spec.path, "001-test");
    }
    
    #[test]
    fn test_fuzzy_load() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path().join("specs");
        std::fs::create_dir_all(&specs_dir).unwrap();
        
        create_test_spec(&specs_dir, "001-my-feature", "planned");
        
        let loader = SpecLoader::new(&specs_dir);
        
        // Should find by partial match
        let spec = loader.load("my-feature").unwrap();
        assert!(spec.is_some());
        
        // Should find by number
        let spec = loader.load("001").unwrap();
        assert!(spec.is_some());
    }
}
