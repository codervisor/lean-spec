//! Spec reader - loads specs from filesystem
//!
//! Reads spec directories and parses README.md files with frontmatter.

use std::fs;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::specs::frontmatter::{extract_title, parse_frontmatter};

/// A full spec with all content
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Spec {
    pub id: String,
    pub project_id: String,
    pub spec_number: Option<i32>,
    pub spec_name: String,
    pub title: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub tags: Vec<String>,
    pub assignee: Option<String>,
    pub content_md: String,
    pub content_html: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub file_path: String,
    pub github_url: Option<String>,
    pub synced_at: DateTime<Utc>,
    /// Dependencies from frontmatter
    pub depends_on: Vec<String>,
    /// Computed list of specs that depend on this one
    #[serde(default)]
    pub required_by: Vec<String>,
}

/// Lightweight spec without full content (for list views)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LightweightSpec {
    pub id: String,
    pub project_id: String,
    pub spec_number: Option<i32>,
    pub spec_name: String,
    pub title: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub tags: Vec<String>,
    pub assignee: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub file_path: String,
    pub github_url: Option<String>,
    pub depends_on: Vec<String>,
    #[serde(default)]
    pub required_by: Vec<String>,
    #[serde(default)]
    pub sub_specs_count: i32,
}

impl From<&Spec> for LightweightSpec {
    fn from(spec: &Spec) -> Self {
        LightweightSpec {
            id: spec.id.clone(),
            project_id: spec.project_id.clone(),
            spec_number: spec.spec_number,
            spec_name: spec.spec_name.clone(),
            title: spec.title.clone(),
            status: spec.status.clone(),
            priority: spec.priority.clone(),
            tags: spec.tags.clone(),
            assignee: spec.assignee.clone(),
            created_at: spec.created_at,
            updated_at: spec.updated_at,
            completed_at: spec.completed_at,
            file_path: spec.file_path.clone(),
            github_url: spec.github_url.clone(),
            depends_on: spec.depends_on.clone(),
            required_by: spec.required_by.clone(),
            sub_specs_count: 0,
        }
    }
}

/// Spec reader for loading specs from filesystem
pub struct SpecReader {
    specs_dir: PathBuf,
    project_id: String,
}

impl SpecReader {
    /// Create a new spec reader for a specs directory
    pub fn new(specs_dir: impl AsRef<Path>, project_id: &str) -> Self {
        Self {
            specs_dir: specs_dir.as_ref().to_path_buf(),
            project_id: project_id.to_string(),
        }
    }

    /// Load all specs from the specs directory
    pub fn load_all(&self) -> Vec<Spec> {
        let mut specs = Vec::new();

        if !self.specs_dir.exists() {
            return specs;
        }

        // Load regular specs
        self.load_specs_from_dir(&self.specs_dir, false, &mut specs);

        // Load archived specs
        let archived_dir = self.specs_dir.join("archived");
        if archived_dir.exists() {
            self.load_specs_from_dir(&archived_dir, true, &mut specs);
        }

        // Sort by spec number
        specs.sort_by(|a, b| a.spec_number.cmp(&b.spec_number));

        // Build required_by relationships
        self.build_required_by(&mut specs);

        specs
    }

    /// Load specs from a directory
    fn load_specs_from_dir(&self, dir: &Path, is_archived: bool, specs: &mut Vec<Spec>) {
        let entries = match fs::read_dir(dir) {
            Ok(entries) => entries,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let dir_name = match path.file_name().and_then(|n| n.to_str()) {
                Some(name) => name,
                None => continue,
            };

            // Skip archived directory when not in archived mode
            if dir_name == "archived" && !is_archived {
                continue;
            }

            // Check if directory name matches spec pattern (digits followed by dash)
            if !dir_name
                .chars()
                .next()
                .map(|c| c.is_ascii_digit())
                .unwrap_or(false)
            {
                continue;
            }

            if let Some(spec) = self.load_spec_from_dir(&path, dir_name, is_archived) {
                specs.push(spec);
            }
        }
    }

    /// Load a single spec from a directory
    fn load_spec_from_dir(
        &self,
        spec_dir: &Path,
        spec_name: &str,
        is_archived: bool,
    ) -> Option<Spec> {
        let readme_path = spec_dir.join("README.md");
        let content = fs::read_to_string(&readme_path).ok()?;

        let (frontmatter, body) = parse_frontmatter(&content);

        // Must have status in frontmatter
        if frontmatter.status.is_none() {
            return None;
        }

        // Extract spec number from directory name
        let spec_number = spec_name
            .split('-')
            .next()
            .and_then(|s| s.parse::<i32>().ok());

        let title = extract_title(&body);
        let id = format!("fs-{}", spec_name);

        // Build file path - legacy support for archived/ folder
        let file_path = if is_archived {
            format!("specs/archived/{}/README.md", spec_name)
        } else {
            format!("specs/{}/README.md", spec_name)
        };

        // Log deprecation warning for specs in archived/ folder
        if is_archived {
            eprintln!(
                "⚠️  DEPRECATED: Spec '{}' is in archived/ folder. Run 'lean-spec migrate-archived' to migrate.",
                spec_name
            );
        }

        // Override status to archived if in archived/ folder (legacy compat)
        let status = if is_archived {
            "archived".to_string()
        } else {
            frontmatter.status_or_default().to_string()
        };

        // TODO: Implement sub-specs tracking feature
        // Sub-specs are additional .md files in a spec directory beyond README.md
        // This would allow specs to be broken into multiple documents
        // Track in a future spec once the use case is validated

        Some(Spec {
            id,
            project_id: self.project_id.clone(),
            spec_number,
            spec_name: spec_name.to_string(),
            title,
            status,
            priority: frontmatter.priority.clone(),
            tags: frontmatter.tags.clone(),
            assignee: frontmatter.assignee.clone(),
            content_md: content,
            content_html: None,
            created_at: frontmatter.get_created(),
            updated_at: frontmatter.get_updated(),
            completed_at: frontmatter.completed_at.as_ref().and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            }),
            file_path,
            github_url: None,
            synced_at: Utc::now(),
            depends_on: frontmatter.depends_on.clone(),
            required_by: Vec::new(), // Populated later
        })
    }

    /// Count sub-spec files in a directory
    ///
    /// Currently unused but may be useful for future sub-spec tracking features.
    #[allow(dead_code)]
    fn count_sub_specs(&self, spec_dir: &Path) -> i32 {
        let mut count = 0;
        if let Ok(entries) = fs::read_dir(spec_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        if name.ends_with(".md") && name != "README.md" {
                            count += 1;
                        }
                    }
                }
            }
        }
        count
    }

    /// Build required_by relationships (reverse of depends_on)
    fn build_required_by(&self, specs: &mut Vec<Spec>) {
        // Build a map of spec_name -> depends_on
        let dependency_map: std::collections::HashMap<String, Vec<String>> = specs
            .iter()
            .map(|s| (s.spec_name.clone(), s.depends_on.clone()))
            .collect();

        // For each spec, find all specs that depend on it
        for spec in specs.iter_mut() {
            let mut required_by = Vec::new();
            for (name, deps) in &dependency_map {
                if name == &spec.spec_name {
                    continue;
                }
                // Check if any dependency matches this spec
                for dep in deps {
                    if dependency_matches(dep, &spec.spec_name, spec.spec_number) {
                        required_by.push(name.clone());
                        break;
                    }
                }
            }
            spec.required_by = required_by;
        }
    }

    /// Load a single spec by ID or number
    pub fn load_spec(&self, spec_id: &str) -> Option<Spec> {
        let specs = self.load_all();

        // Try to parse as number first
        if let Ok(num) = spec_id.parse::<i32>() {
            return specs.into_iter().find(|s| s.spec_number == Some(num));
        }

        // Try to find by spec_name (could be partial like "035" or full like "035-my-spec")
        specs.into_iter().find(|s| {
            s.spec_name == spec_id
                || s.spec_name.starts_with(&format!("{}-", spec_id))
                || s.id == spec_id
                || s.id == format!("fs-{}", spec_id)
        })
    }

    /// Get specs by status
    pub fn get_by_status(&self, status: &str) -> Vec<Spec> {
        self.load_all()
            .into_iter()
            .filter(|s| s.status == status)
            .collect()
    }

    /// Search specs by query
    pub fn search(&self, query: &str) -> Vec<Spec> {
        let lower_query = query.to_lowercase();
        self.load_all()
            .into_iter()
            .filter(|s| {
                s.spec_name.to_lowercase().contains(&lower_query)
                    || s.title
                        .as_deref()
                        .unwrap_or("")
                        .to_lowercase()
                        .contains(&lower_query)
                    || s.content_md.to_lowercase().contains(&lower_query)
                    || s.tags
                        .iter()
                        .any(|t| t.to_lowercase().contains(&lower_query))
            })
            .collect()
    }

    /// Get all unique tags
    pub fn get_all_tags(&self) -> Vec<String> {
        let mut tags: std::collections::HashSet<String> = std::collections::HashSet::new();
        for spec in self.load_all() {
            for tag in spec.tags {
                tags.insert(tag);
            }
        }
        let mut result: Vec<String> = tags.into_iter().collect();
        result.sort();
        result
    }
}

/// Check if a dependency string matches a spec
fn dependency_matches(dep: &str, spec_name: &str, spec_number: Option<i32>) -> bool {
    // Direct match
    if dep == spec_name {
        return true;
    }

    // Match by number prefix (e.g., "035" matches "035-my-spec")
    if let Some(num) = spec_number {
        let dep_trimmed = dep.trim();
        if let Some(dep_num_str) = dep_trimmed.split('-').next() {
            if let Ok(dep_num) = dep_num_str.parse::<i32>() {
                return dep_num == num;
            }
        }
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_spec(dir: &Path, name: &str, frontmatter: &str, content: &str) {
        let spec_dir = dir.join(name);
        fs::create_dir_all(&spec_dir).unwrap();
        let readme = spec_dir.join("README.md");
        let full_content = format!("---\n{}\n---\n\n{}", frontmatter, content);
        fs::write(readme, full_content).unwrap();
    }

    #[test]
    fn test_load_specs() {
        let temp = TempDir::new().unwrap();
        let specs_dir = temp.path().join("specs");
        fs::create_dir_all(&specs_dir).unwrap();

        create_test_spec(
            &specs_dir,
            "001-first-spec",
            "status: planned\npriority: high\ntags:\n  - test",
            "# First Spec\n\nContent here.",
        );

        create_test_spec(
            &specs_dir,
            "002-second-spec",
            "status: in-progress\ndepends_on:\n  - 001-first-spec",
            "# Second Spec\n\nMore content.",
        );

        let reader = SpecReader::new(&specs_dir, "test-project");
        let specs = reader.load_all();

        assert_eq!(specs.len(), 2);
        assert_eq!(specs[0].spec_number, Some(1));
        assert_eq!(specs[0].status, "planned");
        assert_eq!(specs[0].title, Some("First Spec".to_string()));
        assert_eq!(specs[0].tags, vec!["test"]);

        assert_eq!(specs[1].spec_number, Some(2));
        assert_eq!(specs[1].status, "in-progress");
        assert_eq!(specs[1].depends_on, vec!["001-first-spec"]);

        // Check required_by is computed correctly
        assert!(specs[0]
            .required_by
            .contains(&"002-second-spec".to_string()));
    }

    #[test]
    fn test_search_specs() {
        let temp = TempDir::new().unwrap();
        let specs_dir = temp.path().join("specs");
        fs::create_dir_all(&specs_dir).unwrap();

        create_test_spec(
            &specs_dir,
            "001-test-spec",
            "status: planned",
            "# Test Spec\n\nSearchable content about rust.",
        );

        create_test_spec(
            &specs_dir,
            "002-other-spec",
            "status: complete",
            "# Other Spec\n\nDifferent content.",
        );

        let reader = SpecReader::new(&specs_dir, "test-project");

        let results = reader.search("rust");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].spec_name, "001-test-spec");

        let results = reader.search("content");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_dependency_matches() {
        assert!(dependency_matches(
            "001-first-spec",
            "001-first-spec",
            Some(1)
        ));
        assert!(dependency_matches("001", "001-first-spec", Some(1)));
        assert!(dependency_matches("1", "001-first-spec", Some(1)));
        assert!(!dependency_matches("002", "001-first-spec", Some(1)));
    }
}
