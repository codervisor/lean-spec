//! Insights generation for spec analysis

use crate::types::{SpecInfo, SpecPriority, SpecStatus};
use crate::utils::SpecStats;

/// Generated insights about specs
#[derive(Debug, Clone, Default)]
pub struct Insights {
    /// List of insight messages
    pub messages: Vec<InsightMessage>,
}

/// An insight message with severity
#[derive(Debug, Clone)]
pub struct InsightMessage {
    pub severity: InsightSeverity,
    pub message: String,
    pub related_specs: Vec<String>,
}

/// Severity of an insight
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InsightSeverity {
    Info,
    Suggestion,
    Warning,
    Critical,
}

impl std::fmt::Display for InsightSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            InsightSeverity::Info => write!(f, "ℹ️"),
            InsightSeverity::Suggestion => write!(f, "💡"),
            InsightSeverity::Warning => write!(f, "⚠️"),
            InsightSeverity::Critical => write!(f, "🚨"),
        }
    }
}

impl Insights {
    /// Generate insights from specs and stats
    pub fn generate(specs: &[SpecInfo], stats: &SpecStats) -> Self {
        let mut insights = Self::default();

        // Check for high priority specs that are still planned
        insights.check_high_priority_planned(specs);

        // Check for in-progress specs without assignees
        insights.check_in_progress_no_assignee(specs);

        // Check for old planned specs
        insights.check_stale_planned(specs);

        // Check for completion rate
        insights.check_completion_rate(stats);

        // Check for dependency issues
        insights.check_dependency_issues(specs);

        // Check for large specs
        insights.check_large_specs(specs);

        insights
    }

    fn check_high_priority_planned(&mut self, specs: &[SpecInfo]) {
        let high_priority_planned: Vec<_> = specs
            .iter()
            .filter(|s| {
                s.frontmatter.status == SpecStatus::Planned
                    && matches!(
                        s.frontmatter.priority,
                        Some(SpecPriority::High) | Some(SpecPriority::Critical)
                    )
            })
            .map(|s| s.path.clone())
            .collect();

        if !high_priority_planned.is_empty() {
            self.messages.push(InsightMessage {
                severity: InsightSeverity::Warning,
                message: format!(
                    "{} high/critical priority spec(s) still in planned status",
                    high_priority_planned.len()
                ),
                related_specs: high_priority_planned,
            });
        }
    }

    fn check_in_progress_no_assignee(&mut self, specs: &[SpecInfo]) {
        let no_assignee: Vec<_> = specs
            .iter()
            .filter(|s| {
                s.frontmatter.status == SpecStatus::InProgress && s.frontmatter.assignee.is_none()
            })
            .map(|s| s.path.clone())
            .collect();

        if !no_assignee.is_empty() {
            self.messages.push(InsightMessage {
                severity: InsightSeverity::Suggestion,
                message: format!(
                    "{} in-progress spec(s) without an assignee",
                    no_assignee.len()
                ),
                related_specs: no_assignee,
            });
        }
    }

    fn check_stale_planned(&mut self, specs: &[SpecInfo]) {
        use chrono::{NaiveDate, Utc};

        let today = Utc::now().date_naive();
        let stale_threshold_days = 30;

        let stale: Vec<_> = specs
            .iter()
            .filter(|s| {
                if s.frontmatter.status != SpecStatus::Planned {
                    return false;
                }

                if let Ok(created) = NaiveDate::parse_from_str(&s.frontmatter.created, "%Y-%m-%d") {
                    let days_old = (today - created).num_days();
                    days_old > stale_threshold_days
                } else {
                    false
                }
            })
            .map(|s| s.path.clone())
            .collect();

        if !stale.is_empty() {
            self.messages.push(InsightMessage {
                severity: InsightSeverity::Info,
                message: format!(
                    "{} spec(s) have been in planned status for over {} days",
                    stale.len(),
                    stale_threshold_days
                ),
                related_specs: stale,
            });
        }
    }

    fn check_completion_rate(&mut self, stats: &SpecStats) {
        let completion = stats.completion_percentage();

        if completion < 10.0 && stats.total > 10 {
            self.messages.push(InsightMessage {
                severity: InsightSeverity::Suggestion,
                message: format!(
                    "Completion rate is {:.1}%. Consider focusing on completing existing specs before adding new ones.",
                    completion
                ),
                related_specs: Vec::new(),
            });
        }
    }

    fn check_dependency_issues(&mut self, specs: &[SpecInfo]) {
        // Check for missing dependencies
        let all_paths: std::collections::HashSet<_> = specs.iter().map(|s| &s.path).collect();

        let mut missing_deps = Vec::new();
        for spec in specs {
            for dep in &spec.frontmatter.depends_on {
                if !all_paths.contains(dep) {
                    missing_deps.push((spec.path.clone(), dep.clone()));
                }
            }
        }

        if !missing_deps.is_empty() {
            self.messages.push(InsightMessage {
                severity: InsightSeverity::Warning,
                message: format!(
                    "{} spec(s) reference non-existent dependencies",
                    missing_deps.len()
                ),
                related_specs: missing_deps.iter().map(|(s, _)| s.clone()).collect(),
            });
        }

        // Check for blocked specs (depends on incomplete specs)
        let complete_paths: std::collections::HashSet<_> = specs
            .iter()
            .filter(|s| s.frontmatter.status == SpecStatus::Complete)
            .map(|s| &s.path)
            .collect();

        let blocked: Vec<_> = specs
            .iter()
            .filter(|s| {
                s.frontmatter.status == SpecStatus::InProgress
                    && s.frontmatter
                        .depends_on
                        .iter()
                        .any(|dep| all_paths.contains(dep) && !complete_paths.contains(dep))
            })
            .map(|s| s.path.clone())
            .collect();

        if !blocked.is_empty() {
            self.messages.push(InsightMessage {
                severity: InsightSeverity::Warning,
                message: format!(
                    "{} in-progress spec(s) depend on incomplete specs",
                    blocked.len()
                ),
                related_specs: blocked,
            });
        }
    }

    fn check_large_specs(&mut self, specs: &[SpecInfo]) {
        let large: Vec<_> = specs
            .iter()
            .filter(|s| s.content.lines().count() > 300)
            .map(|s| s.path.clone())
            .collect();

        if !large.is_empty() {
            self.messages.push(InsightMessage {
                severity: InsightSeverity::Suggestion,
                message: format!(
                    "{} spec(s) exceed 300 lines. Consider splitting for better context economy.",
                    large.len()
                ),
                related_specs: large,
            });
        }
    }

    /// Get critical insights
    pub fn critical(&self) -> Vec<&InsightMessage> {
        self.messages
            .iter()
            .filter(|m| m.severity == InsightSeverity::Critical)
            .collect()
    }

    /// Get warnings
    pub fn warnings(&self) -> Vec<&InsightMessage> {
        self.messages
            .iter()
            .filter(|m| m.severity == InsightSeverity::Warning)
            .collect()
    }

    /// Check if there are any issues
    pub fn has_issues(&self) -> bool {
        self.messages.iter().any(|m| {
            matches!(
                m.severity,
                InsightSeverity::Warning | InsightSeverity::Critical
            )
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::SpecFrontmatter;
    use std::path::PathBuf;

    fn create_spec(
        path: &str,
        status: SpecStatus,
        priority: Option<SpecPriority>,
        assignee: Option<&str>,
    ) -> SpecInfo {
        SpecInfo {
            path: path.to_string(),
            title: path.to_string(),
            frontmatter: SpecFrontmatter {
                status,
                created: "2025-01-01".to_string(),
                priority,
                tags: Vec::new(),
                depends_on: Vec::new(),
                assignee: assignee.map(String::from),
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
            content: "# Test\n\nContent".to_string(),
            file_path: PathBuf::from(format!("specs/{}/README.md", path)),
            is_sub_spec: false,
            parent_spec: None,
        }
    }

    #[test]
    fn test_high_priority_planned() {
        let specs = vec![create_spec(
            "001-urgent",
            SpecStatus::Planned,
            Some(SpecPriority::Critical),
            None,
        )];

        let stats = SpecStats::compute(&specs);
        let insights = Insights::generate(&specs, &stats);

        assert!(!insights.warnings().is_empty());
    }

    #[test]
    fn test_in_progress_no_assignee() {
        let specs = vec![create_spec(
            "001-feature",
            SpecStatus::InProgress,
            None,
            None,
        )];

        let stats = SpecStats::compute(&specs);
        let insights = Insights::generate(&specs, &stats);

        assert!(insights
            .messages
            .iter()
            .any(|m| m.message.contains("assignee")));
    }
}
