//! Spec file loading and management

use crate::parsers::FrontmatterParser;
use crate::types::{LeanSpecConfig, SpecInfo, SpecStatus};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{OnceLock, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;
use walkdir::WalkDir;

#[derive(Debug, Clone, Default)]
pub struct SpecRelationshipIndex {
    pub children_by_parent: HashMap<String, Vec<String>>,
    pub required_by: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone)]
struct CachedSpecEntry {
    modified_at: SystemTime,
    metadata: Option<SpecInfo>,
    full: Option<SpecInfo>,
}

impl Default for CachedSpecEntry {
    fn default() -> Self {
        Self {
            modified_at: UNIX_EPOCH,
            metadata: None,
            full: None,
        }
    }
}

#[derive(Debug, Clone, Default)]
struct CachedDirectory {
    entries: HashMap<PathBuf, CachedSpecEntry>,
    version: u64,
    relationship_index: Option<(u64, SpecRelationshipIndex)>,
}

static SPEC_CACHE: OnceLock<RwLock<HashMap<PathBuf, CachedDirectory>>> = OnceLock::new();

fn spec_cache() -> &'static RwLock<HashMap<PathBuf, CachedDirectory>> {
    SPEC_CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}

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
        self.load_all_internal(true)
    }

    /// Load all specs metadata without markdown body content.
    ///
    /// This is significantly faster for list/board/tree views because it avoids
    /// storing full body content in memory.
    pub fn load_all_metadata(&self) -> Result<Vec<SpecInfo>, LoadError> {
        self.load_all_internal(false)
    }

    /// Load cached relationship indices (children and required_by).
    pub fn load_relationship_index(&self) -> Result<SpecRelationshipIndex, LoadError> {
        self.load_all_metadata()?;

        let mut cache = spec_cache()
            .write()
            .expect("spec cache lock poisoned while building relationship index");
        let directory = cache.entry(self.specs_dir.clone()).or_default();

        if let Some((cached_version, index)) = &directory.relationship_index {
            if *cached_version == directory.version {
                return Ok(index.clone());
            }
        }

        let mut children_by_parent: HashMap<String, Vec<String>> = HashMap::new();
        let mut required_by: HashMap<String, Vec<String>> = HashMap::new();

        for spec in directory
            .entries
            .values()
            .filter_map(|entry| entry.metadata.as_ref())
        {
            if let Some(parent) = spec.frontmatter.parent.as_ref() {
                children_by_parent
                    .entry(parent.clone())
                    .or_default()
                    .push(spec.path.clone());
            }

            for dep in &spec.frontmatter.depends_on {
                if dep != &spec.path {
                    required_by
                        .entry(dep.clone())
                        .or_default()
                        .push(spec.path.clone());
                }
            }
        }

        for values in children_by_parent.values_mut() {
            values.sort();
        }
        for values in required_by.values_mut() {
            values.sort();
        }

        let index = SpecRelationshipIndex {
            children_by_parent,
            required_by,
        };
        directory.relationship_index = Some((directory.version, index.clone()));

        Ok(index)
    }

    fn load_all_internal(&self, include_content: bool) -> Result<Vec<SpecInfo>, LoadError> {
        if !self.specs_dir.exists() {
            return Err(LoadError::SpecsDirNotFound(self.specs_dir.clone()));
        }

        let readme_paths: Vec<PathBuf> = WalkDir::new(&self.specs_dir)
            .max_depth(3) // Allow sub-specs
            .into_iter()
            .filter_map(|e| e.ok())
            .filter_map(|entry| {
                let path = entry.path();
                if path.file_name().map(|n| n == "README.md").unwrap_or(false) {
                    Some(path.to_path_buf())
                } else {
                    None
                }
            })
            .collect();

        let mut specs = Vec::new();
        let mut cache = spec_cache()
            .write()
            .expect("spec cache lock poisoned while loading specs");
        let directory = cache.entry(self.specs_dir.clone()).or_default();

        let mut changed = false;
        let seen_paths: HashSet<PathBuf> = readme_paths.iter().cloned().collect();

        // Remove deleted files from cache
        let previous_len = directory.entries.len();
        directory
            .entries
            .retain(|path, _| seen_paths.contains(path));
        if directory.entries.len() != previous_len {
            changed = true;
        }

        for readme_path in readme_paths {
            let modified_at = std::fs::metadata(&readme_path)
                .and_then(|m| m.modified())
                .unwrap_or(UNIX_EPOCH);

            let cache_entry = directory.entries.entry(readme_path.clone()).or_default();

            let has_requested_variant = if include_content {
                cache_entry.full.is_some()
            } else {
                cache_entry.metadata.is_some()
            };

            let needs_reload = cache_entry.modified_at != modified_at || !has_requested_variant;

            if needs_reload {
                let loaded = self.load_spec_from_path(&readme_path, false, include_content)?;
                cache_entry.modified_at = modified_at;

                if include_content {
                    cache_entry.full = loaded;
                    cache_entry.metadata = cache_entry.full.as_ref().map(as_metadata_only_spec);
                } else {
                    cache_entry.metadata = loaded;
                    cache_entry.full = None;
                }

                changed = true;
            }

            let spec = if include_content {
                cache_entry
                    .full
                    .clone()
                    .or_else(|| cache_entry.metadata.clone())
            } else {
                cache_entry.metadata.clone()
            };

            if let Some(spec) = spec {
                specs.push(spec);
            }
        }

        if changed {
            directory.version += 1;
            directory.relationship_index = None;
        }

        // Sort by spec number/path
        specs.sort_by(|a, b| {
            let a_num = a.number().unwrap_or(u32::MAX);
            let b_num = b.number().unwrap_or(u32::MAX);
            a_num.cmp(&b_num).then_with(|| a.path.cmp(&b.path))
        });

        // Normalize parent references: if a stored `parent` value is a partial/fuzzy
        // name that doesn't exactly match any spec path, try to resolve it so all
        // downstream comparisons use the canonical full-path.
        let full_paths: std::collections::HashSet<String> =
            specs.iter().map(|s| s.path.clone()).collect();
        let needs_resolve: Vec<usize> = specs
            .iter()
            .enumerate()
            .filter_map(|(i, s)| {
                s.frontmatter
                    .parent
                    .as_deref()
                    .filter(|p| !full_paths.contains(*p))
                    .map(|_| i)
            })
            .collect();
        for i in needs_resolve {
            let partial = specs[i].frontmatter.parent.clone().unwrap();
            // Find the first spec whose full path contains the partial string
            if let Some(resolved) = full_paths
                .iter()
                .find(|p| p.contains(partial.as_str()) || partial.contains(p.as_str()))
            {
                specs[i].frontmatter.parent = Some(resolved.clone());
            }
        }

        Ok(specs)
    }

    /// Load a single spec by path/name
    pub fn load(&self, spec_path: &str) -> Result<Option<SpecInfo>, LoadError> {
        let allow_archived = spec_path.starts_with("archived/");
        // Try direct path first
        let readme_path = self.specs_dir.join(spec_path).join("README.md");
        if readme_path.exists() {
            return self.load_spec_from_path(&readme_path, allow_archived, true);
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
                        return self.load_spec_from_path(&readme_path, allow_archived, true);
                    }
                }
            }
        }

        Ok(None)
    }

    /// Load a spec by exact path/name only (no fuzzy matching)
    /// This is safer for destructive operations like archiving
    pub fn load_exact(&self, spec_path: &str) -> Result<Option<SpecInfo>, LoadError> {
        let allow_archived = spec_path.starts_with("archived/");

        // Try direct path first
        let readme_path = self.specs_dir.join(spec_path).join("README.md");
        if readme_path.exists() {
            return self.load_spec_from_path(&readme_path, allow_archived, true);
        }

        // Try with just the number prefix - but only if it's a number
        // Support both "001" format and "1" format
        if spec_path.chars().all(|c| c.is_ascii_digit()) {
            let target_num = spec_path.parse::<u32>().ok();
            for entry in WalkDir::new(&self.specs_dir)
                .max_depth(2)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if !entry.file_type().is_dir() {
                    continue;
                }

                let Some(dir_name) = entry.path().file_name().and_then(|n| n.to_str()) else {
                    continue;
                };

                let Some(prefix) = dir_name.split('-').next() else {
                    continue;
                };

                let Ok(current_num) = prefix.parse::<u32>() else {
                    continue;
                };

                if Some(current_num) == target_num {
                    let readme = entry.path().join("README.md");
                    if readme.exists() {
                        return self.load_spec_from_path(&readme, allow_archived, true);
                    }
                }
            }
        }

        Ok(None)
    }

    /// Load a spec from a README.md file path
    fn load_spec_from_path(
        &self,
        path: &Path,
        allow_archived: bool,
        include_content: bool,
    ) -> Result<Option<SpecInfo>, LoadError> {
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

        // Skip archived specs directory itself
        if spec_path == "archived" {
            return Ok(None);
        }

        // Check if this spec is inside the archived directory (legacy behavior)
        let is_in_archived_folder = spec_dir
            .parent()
            .and_then(|p| p.file_name())
            .map(|n| n == "archived")
            .unwrap_or(false);

        if is_in_archived_folder && !allow_archived {
            return Ok(None);
        }

        // Log deprecation warning for archived folder usage
        if is_in_archived_folder {
            eprintln!(
                "⚠️  DEPRECATED: Spec '{}' is in archived/ folder. \
                 Run 'lean-spec migrate-archived' to migrate to status-based archiving.",
                spec_path
            );
        }

        // Skip top-level README.md (specs/README.md) - not a spec
        if spec_dir == self.specs_dir {
            return Ok(None);
        }

        // Skip directories that don't look like specs (should start with numbers)
        if !spec_path
            .chars()
            .next()
            .map(|c| c.is_ascii_digit())
            .unwrap_or(false)
        {
            return Ok(None);
        }

        // Parse frontmatter
        let (mut frontmatter, body) = match self.parser.parse(&content) {
            Ok(result) => result,
            Err(e) => {
                return Err(LoadError::ParseError {
                    path: path.display().to_string(),
                    reason: e.to_string(),
                });
            }
        };

        // Override status to archived if spec is in archived/ folder (legacy compat)
        if is_in_archived_folder {
            frontmatter.status = SpecStatus::Archived;
        }

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
            spec_dir
                .parent()
                .and_then(|p| p.file_name())
                .map(|n| n.to_string_lossy().to_string())
        } else {
            None
        };

        Ok(Some(SpecInfo {
            path: spec_path,
            title,
            frontmatter,
            content: if include_content { body } else { String::new() },
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

        self.load_spec_from_path(&readme_path, false, true)?
            .ok_or_else(|| LoadError::ParseError {
                path: readme_path.display().to_string(),
                reason: "Failed to load created spec".to_string(),
            })
    }

    /// Update a spec's content
    pub fn update_spec(&self, spec_path: &str, new_content: &str) -> Result<(), LoadError> {
        let readme_path = self.specs_dir.join(spec_path).join("README.md");
        std::fs::write(&readme_path, new_content)?;
        Ok(())
    }

    /// Get the specs directory path
    pub fn specs_dir(&self) -> &Path {
        &self.specs_dir
    }

    /// Invalidate cached spec entries for a changed path.
    ///
    /// Returns true when any cache entry was invalidated.
    pub fn invalidate_cached_path<P: AsRef<Path>>(path: P) -> bool {
        let path = path.as_ref();
        let mut cache = spec_cache()
            .write()
            .expect("spec cache lock poisoned while invalidating path");

        let mut changed = false;

        for (specs_dir, directory) in cache.iter_mut() {
            if !path.starts_with(specs_dir) {
                continue;
            }

            let mut removed_any = false;
            let previous_len = directory.entries.len();

            directory.entries.retain(|entry_path, _| {
                if path == entry_path {
                    removed_any = true;
                    return false;
                }

                if path.is_dir() && entry_path.starts_with(path) {
                    removed_any = true;
                    return false;
                }

                if path.is_file() {
                    let is_readme = path
                        .file_name()
                        .and_then(|name| name.to_str())
                        .map(|name| name.eq_ignore_ascii_case("README.md"))
                        .unwrap_or(false);

                    if is_readme {
                        let path_parent = path.parent();
                        let entry_parent = entry_path.parent();
                        if path_parent.is_some() && path_parent == entry_parent {
                            removed_any = true;
                            return false;
                        }
                    }
                }

                true
            });

            if removed_any || directory.entries.len() != previous_len {
                directory.version += 1;
                directory.relationship_index = None;
                changed = true;
            }
        }

        changed
    }

    /// Invalidate all cache entries for a specs directory.
    ///
    /// Returns true when a cached directory existed and was removed.
    pub fn invalidate_cached_specs_dir<P: AsRef<Path>>(specs_dir: P) -> bool {
        let specs_dir = specs_dir.as_ref();
        let mut cache = spec_cache()
            .write()
            .expect("spec cache lock poisoned while invalidating directory");

        cache.remove(specs_dir).is_some()
    }
}

fn as_metadata_only_spec(spec: &SpecInfo) -> SpecInfo {
    let mut metadata = spec.clone();
    metadata.content.clear();
    metadata
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_spec(dir: &Path, name: &str, status: &str) {
        let spec_dir = dir.join(name);
        std::fs::create_dir_all(&spec_dir).unwrap();

        let content = format!(
            r#"---
status: {}
created: '2025-01-01'
---

# Test Spec {}

Content for {}.
"#,
            status, name, name
        );

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
    fn test_load_all_metadata_strips_content() {
        let temp_dir = TempDir::new().unwrap();
        let specs_dir = temp_dir.path().join("specs");
        std::fs::create_dir_all(&specs_dir).unwrap();

        create_test_spec(&specs_dir, "001-meta", "planned");

        let loader = SpecLoader::new(&specs_dir);
        let specs = loader.load_all_metadata().unwrap();

        assert_eq!(specs.len(), 1);
        assert!(specs[0].content.is_empty());
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
