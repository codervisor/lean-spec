//! Spec statistics computation

use crate::types::{SpecInfo, SpecPriority, SpecStatus};
use std::collections::HashMap;

/// Statistics about specs
#[derive(Debug, Clone, Default)]
pub struct SpecStats {
    /// Total number of specs
    pub total: usize,

    /// Count by status
    pub by_status: HashMap<SpecStatus, usize>,

    /// Count by priority
    pub by_priority: HashMap<SpecPriority, usize>,

    /// Specs without priority
    pub no_priority: usize,

    /// Count by tag
    pub by_tag: HashMap<String, usize>,

    /// Count by assignee
    pub by_assignee: HashMap<String, usize>,

    /// Unassigned specs
    pub unassigned: usize,

    /// Sub-spec count
    pub sub_specs: usize,

    /// Specs with dependencies
    pub with_dependencies: usize,

    /// Total dependency links
    pub total_dependencies: usize,
}

impl SpecStats {
    /// Compute statistics from a list of specs
    pub fn compute(specs: &[SpecInfo]) -> Self {
        let mut stats = Self {
            total: specs.len(),
            ..Default::default()
        };

        for spec in specs {
            // Count by status
            *stats.by_status.entry(spec.frontmatter.status).or_insert(0) += 1;

            // Count by priority
            if let Some(priority) = spec.frontmatter.priority {
                *stats.by_priority.entry(priority).or_insert(0) += 1;
            } else {
                stats.no_priority += 1;
            }

            // Count by tags
            for tag in &spec.frontmatter.tags {
                *stats.by_tag.entry(tag.clone()).or_insert(0) += 1;
            }

            // Count by assignee
            if let Some(assignee) = &spec.frontmatter.assignee {
                *stats.by_assignee.entry(assignee.clone()).or_insert(0) += 1;
            } else {
                stats.unassigned += 1;
            }

            // Count sub-specs
            if spec.is_sub_spec {
                stats.sub_specs += 1;
            }

            // Count dependencies
            if !spec.frontmatter.depends_on.is_empty() {
                stats.with_dependencies += 1;
                stats.total_dependencies += spec.frontmatter.depends_on.len();
            }
        }

        stats
    }

    /// Get completion percentage
    pub fn completion_percentage(&self) -> f64 {
        if self.total == 0 {
            return 0.0;
        }

        let complete = self
            .by_status
            .get(&SpecStatus::Complete)
            .copied()
            .unwrap_or(0);
        (complete as f64 / self.total as f64) * 100.0
    }

    /// Get active specs (planned + in-progress)
    pub fn active_count(&self) -> usize {
        let planned = self
            .by_status
            .get(&SpecStatus::Planned)
            .copied()
            .unwrap_or(0);
        let in_progress = self
            .by_status
            .get(&SpecStatus::InProgress)
            .copied()
            .unwrap_or(0);
        planned + in_progress
    }

    /// Get top tags by count
    pub fn top_tags(&self, limit: usize) -> Vec<(&String, &usize)> {
        let mut tags: Vec<_> = self.by_tag.iter().collect();
        tags.sort_by(|a, b| b.1.cmp(a.1));
        tags.into_iter().take(limit).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::SpecFrontmatter;
    use std::path::PathBuf;

    fn create_spec(
        status: SpecStatus,
        priority: Option<SpecPriority>,
        tags: Vec<&str>,
    ) -> SpecInfo {
        SpecInfo {
            path: "test".to_string(),
            title: "Test".to_string(),
            frontmatter: SpecFrontmatter {
                status,
                created: "2025-01-01".to_string(),
                priority,
                tags: tags.iter().map(|s| s.to_string()).collect(),
                depends_on: Vec::new(),
                parent: None,
                assignee: None,
                reviewer: None,
                issue: None,
                pr: None,
                epic: None,
                breaking: None,
                due: None,
                updated: None,
                completed: None,
                created_at: None,
                updated_at: None,
                completed_at: None,
                transitions: Vec::new(),
                custom: std::collections::HashMap::new(),
            },
            content: "".to_string(),
            file_path: PathBuf::from("test/README.md"),
            is_sub_spec: false,
            parent_spec: None,
        }
    }

    #[test]
    fn test_compute_stats() {
        let specs = vec![
            create_spec(
                SpecStatus::Planned,
                Some(SpecPriority::High),
                vec!["feature"],
            ),
            create_spec(
                SpecStatus::InProgress,
                Some(SpecPriority::Medium),
                vec!["feature", "cli"],
            ),
            create_spec(SpecStatus::Complete, Some(SpecPriority::Low), vec!["docs"]),
        ];

        let stats = SpecStats::compute(&specs);

        assert_eq!(stats.total, 3);
        assert_eq!(stats.by_status.get(&SpecStatus::Planned), Some(&1));
        assert_eq!(stats.by_status.get(&SpecStatus::InProgress), Some(&1));
        assert_eq!(stats.by_status.get(&SpecStatus::Complete), Some(&1));
        assert_eq!(stats.by_tag.get("feature"), Some(&2));
    }

    #[test]
    fn test_completion_percentage() {
        let specs = vec![
            create_spec(SpecStatus::Planned, None, vec![]),
            create_spec(SpecStatus::Complete, None, vec![]),
            create_spec(SpecStatus::Complete, None, vec![]),
            create_spec(SpecStatus::Complete, None, vec![]),
        ];

        let stats = SpecStats::compute(&specs);

        assert_eq!(stats.completion_percentage(), 75.0);
    }
}
