//! Spec file loading and management

use crate::parsers::FrontmatterParser;
use crate::types::{LeanSpecConfig, SpecInfo, SpecStatus};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{OnceLock, RwLock};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;
use walkdir::WalkDir;

#[derive(Debug, Clone, Default)]
pub struct SpecRelationshipIndex {
    pub children_by_parent: HashMap<String, Vec<String>>,
    pub required_by: HashMap<String, Vec<String>>,
    pub parent_by_child: HashMap<String, String>,
}

#[derive(Debug, Clone, Default)]
pub struct SpecHierarchyNode {
    pub path: String,
    pub child_nodes: Vec<SpecHierarchyNode>,
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
    relationship_index: SpecRelationshipIndex,
    hierarchy_tree: Option<Vec<SpecHierarchyNode>>,
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
}

impl SpecLoader {
    /// Create a new spec loader for the given directory
    pub fn new<P: AsRef<Path>>(specs_dir: P) -> Self {
        Self {
            specs_dir: specs_dir.as_ref().to_path_buf(),
            config: None,
        }
    }

    /// Create a spec loader with configuration
    pub fn with_config<P: AsRef<Path>>(specs_dir: P, config: LeanSpecConfig) -> Self {
        Self {
            specs_dir: specs_dir.as_ref().to_path_buf(),
            config: Some(config),
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

        let cache = spec_cache()
            .read()
            .expect("spec cache lock poisoned while reading relationship index");
        let directory = cache
            .get(&self.specs_dir)
            .ok_or_else(|| LoadError::SpecsDirNotFound(self.specs_dir.clone()))?;

        Ok(directory.relationship_index.clone())
    }

    /// Load cached hierarchy tree from metadata.
    pub fn load_hierarchy_tree(&self) -> Result<Vec<SpecHierarchyNode>, LoadError> {
        self.load_all_metadata()?;

        let mut cache = spec_cache()
            .write()
            .expect("spec cache lock poisoned while building hierarchy tree");
        let directory = cache.entry(self.specs_dir.clone()).or_default();

        if let Some(tree) = &directory.hierarchy_tree {
            return Ok(tree.clone());
        }

        let all_paths: HashSet<String> = directory
            .entries
            .values()
            .filter_map(|entry| entry.metadata.as_ref())
            .map(|spec| spec.path.clone())
            .collect();

        let mut roots: Vec<String> = all_paths
            .iter()
            .filter(|path| {
                directory
                    .relationship_index
                    .parent_by_child
                    .get(*path)
                    .map(|parent| !all_paths.contains(parent))
                    .unwrap_or(true)
            })
            .cloned()
            .collect();
        roots.sort();

        let tree: Vec<SpecHierarchyNode> = roots
            .into_iter()
            .map(|root| {
                build_hierarchy_node(&root, &directory.relationship_index.children_by_parent)
            })
            .collect();

        directory.hierarchy_tree = Some(tree.clone());
        Ok(tree)
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

        let mut cold_preloaded: HashMap<PathBuf, Result<Option<SpecInfo>, LoadError>> =
            HashMap::new();
        if directory.entries.is_empty() && readme_paths.len() > 1 {
            let workers = thread::available_parallelism()
                .map(|p| p.get())
                .unwrap_or(4)
                .min(readme_paths.len())
                .max(1);
            let chunk_size = (readme_paths.len() + workers - 1) / workers;

            let specs_dir = self.specs_dir.clone();
            let config = self.config.clone();
            let mut handles = Vec::new();

            for chunk in readme_paths.chunks(chunk_size) {
                let paths = chunk.to_vec();
                let specs_dir = specs_dir.clone();
                let config = config.clone();

                handles.push(thread::spawn(move || {
                    let mut out = Vec::with_capacity(paths.len());
                    for path in paths {
                        let loaded = Self::load_spec_from_path_with_config(
                            &specs_dir,
                            config.clone(),
                            &path,
                            false,
                            include_content,
                        );
                        out.push((path, loaded));
                    }
                    out
                }));
            }

            for handle in handles {
                let loaded_paths = handle.join().map_err(|_| LoadError::ParseError {
                    path: self.specs_dir.display().to_string(),
                    reason: "Cold-cache worker thread panicked".to_string(),
                })?;

                for (path, loaded) in loaded_paths {
                    cold_preloaded.insert(path, loaded);
                }
            }
        }

        let mut changed = false;
        let mut changed_paths: HashSet<String> = HashSet::new();
        let seen_paths: HashSet<PathBuf> = readme_paths.iter().cloned().collect();

        // Remove deleted files from cache and relationship index.
        let removed_paths: Vec<PathBuf> = directory
            .entries
            .keys()
            .filter(|path| !seen_paths.contains(*path))
            .cloned()
            .collect();
        for removed_path in removed_paths {
            if let Some(removed_entry) = directory.entries.remove(&removed_path) {
                apply_relationship_delta(
                    &mut directory.relationship_index,
                    removed_entry.metadata.as_ref(),
                    None,
                );
                collect_changed_paths(&mut changed_paths, removed_entry.metadata.as_ref(), None);
                changed = true;
            }
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
                let previous_metadata = cache_entry.metadata.clone();
                let loaded = if let Some(preloaded) = cold_preloaded.remove(&readme_path) {
                    preloaded?
                } else {
                    self.load_spec_from_path(&readme_path, false, include_content)?
                };
                cache_entry.modified_at = modified_at;

                if include_content {
                    cache_entry.full = loaded;
                    cache_entry.metadata = cache_entry.full.as_ref().map(as_metadata_only_spec);
                } else {
                    cache_entry.metadata = loaded;
                    cache_entry.full = None;
                }

                apply_relationship_delta(
                    &mut directory.relationship_index,
                    previous_metadata.as_ref(),
                    cache_entry.metadata.as_ref(),
                );
                collect_changed_paths(
                    &mut changed_paths,
                    previous_metadata.as_ref(),
                    cache_entry.metadata.as_ref(),
                );

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
            if let Some(existing_tree) = directory.hierarchy_tree.as_mut() {
                let all_paths: HashSet<String> = directory
                    .entries
                    .values()
                    .filter_map(|entry| entry.metadata.as_ref())
                    .map(|spec| spec.path.clone())
                    .collect();

                refresh_hierarchy_roots(
                    existing_tree,
                    &changed_paths,
                    &directory.relationship_index,
                    &all_paths,
                );
            }
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
        Self::load_spec_from_path_with_config(
            &self.specs_dir,
            self.config.clone(),
            path,
            allow_archived,
            include_content,
        )
    }

    fn load_spec_from_path_with_config(
        specs_dir: &Path,
        config: Option<LeanSpecConfig>,
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
        if spec_dir == specs_dir {
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
        let parser = if let Some(config) = config {
            FrontmatterParser::with_config(config)
        } else {
            FrontmatterParser::new()
        };

        let (mut frontmatter, body) = match parser.parse(&content) {
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
        let is_sub_spec = spec_dir.parent().map(|p| p != specs_dir).unwrap_or(false);

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

            let is_readme = path.is_file()
                && path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .map(|name| name.eq_ignore_ascii_case("README.md"))
                    .unwrap_or(false);
            let path_parent = path.parent().map(Path::to_path_buf);

            let to_remove: Vec<PathBuf> = directory
                .entries
                .keys()
                .filter(|entry_path| {
                    if path == *entry_path {
                        return true;
                    }
                    if path.is_dir() && entry_path.starts_with(path) {
                        return true;
                    }
                    if is_readme {
                        if let Some(parent) = path_parent.as_ref() {
                            return entry_path.parent() == Some(parent.as_path());
                        }
                    }
                    false
                })
                .cloned()
                .collect();

            if !to_remove.is_empty() {
                for entry_path in to_remove {
                    if let Some(removed_entry) = directory.entries.remove(&entry_path) {
                        apply_relationship_delta(
                            &mut directory.relationship_index,
                            removed_entry.metadata.as_ref(),
                            None,
                        );
                    }
                }

                directory.version += 1;
                directory.hierarchy_tree = None;
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

fn build_hierarchy_node(
    path: &str,
    children_by_parent: &HashMap<String, Vec<String>>,
) -> SpecHierarchyNode {
    let mut child_nodes: Vec<SpecHierarchyNode> = children_by_parent
        .get(path)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|child| build_hierarchy_node(&child, children_by_parent))
        .collect();
    child_nodes.sort_by(|a, b| a.path.cmp(&b.path));

    SpecHierarchyNode {
        path: path.to_string(),
        child_nodes,
    }
}

fn apply_relationship_delta(
    index: &mut SpecRelationshipIndex,
    old_spec: Option<&SpecInfo>,
    new_spec: Option<&SpecInfo>,
) {
    if let Some(old_spec) = old_spec {
        if let Some(old_parent) = old_spec.frontmatter.parent.as_ref() {
            remove_map_vec_value(
                &mut index.children_by_parent,
                old_parent,
                old_spec.path.as_str(),
            );
        }
        index.parent_by_child.remove(&old_spec.path);

        for dep in &old_spec.frontmatter.depends_on {
            if dep != &old_spec.path {
                remove_map_vec_value(&mut index.required_by, dep, old_spec.path.as_str());
            }
        }
    }

    if let Some(new_spec) = new_spec {
        if let Some(new_parent) = new_spec.frontmatter.parent.as_ref() {
            add_map_vec_value(
                &mut index.children_by_parent,
                new_parent,
                new_spec.path.as_str(),
            );
            index
                .parent_by_child
                .insert(new_spec.path.clone(), new_parent.clone());
        } else {
            index.parent_by_child.remove(&new_spec.path);
        }

        for dep in &new_spec.frontmatter.depends_on {
            if dep != &new_spec.path {
                add_map_vec_value(&mut index.required_by, dep, new_spec.path.as_str());
            }
        }
    }
}

fn collect_changed_paths(
    changed_paths: &mut HashSet<String>,
    old_spec: Option<&SpecInfo>,
    new_spec: Option<&SpecInfo>,
) {
    if let Some(old_spec) = old_spec {
        changed_paths.insert(old_spec.path.clone());
        if let Some(parent) = old_spec.frontmatter.parent.as_ref() {
            changed_paths.insert(parent.clone());
        }
    }

    if let Some(new_spec) = new_spec {
        changed_paths.insert(new_spec.path.clone());
        if let Some(parent) = new_spec.frontmatter.parent.as_ref() {
            changed_paths.insert(parent.clone());
        }
    }
}

fn refresh_hierarchy_roots(
    roots: &mut Vec<SpecHierarchyNode>,
    changed_paths: &HashSet<String>,
    relationship_index: &SpecRelationshipIndex,
    all_paths: &HashSet<String>,
) {
    if changed_paths.is_empty() {
        return;
    }

    let affected_roots: HashSet<String> = changed_paths
        .iter()
        .map(|path| find_root_path(path, all_paths, &relationship_index.parent_by_child))
        .collect();

    for root in affected_roots {
        roots.retain(|node| node.path != root);

        if all_paths.contains(&root) && !relationship_index.parent_by_child.contains_key(&root) {
            roots.push(build_hierarchy_node(
                &root,
                &relationship_index.children_by_parent,
            ));
        }
    }

    roots.sort_by(|a, b| a.path.cmp(&b.path));
}

fn find_root_path(
    path: &str,
    all_paths: &HashSet<String>,
    parent_by_child: &HashMap<String, String>,
) -> String {
    let mut current = path.to_string();

    while let Some(parent) = parent_by_child.get(&current) {
        if !all_paths.contains(parent) {
            break;
        }
        current = parent.clone();
    }

    current
}

fn add_map_vec_value(map: &mut HashMap<String, Vec<String>>, key: &str, value: &str) {
    let values = map.entry(key.to_string()).or_default();
    if !values.iter().any(|existing| existing == value) {
        values.push(value.to_string());
        values.sort();
    }
}

fn remove_map_vec_value(map: &mut HashMap<String, Vec<String>>, key: &str, value: &str) {
    let mut should_remove = false;
    if let Some(values) = map.get_mut(key) {
        values.retain(|existing| existing != value);
        should_remove = values.is_empty();
    }
    if should_remove {
        map.remove(key);
    }
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
