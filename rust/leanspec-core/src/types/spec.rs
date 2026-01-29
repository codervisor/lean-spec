//! Spec types and frontmatter structures

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Status of a spec
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SpecStatus {
    Planned,
    #[serde(rename = "in-progress")]
    InProgress,
    Complete,
    Archived,
}

impl std::fmt::Display for SpecStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SpecStatus::Planned => write!(f, "planned"),
            SpecStatus::InProgress => write!(f, "in-progress"),
            SpecStatus::Complete => write!(f, "complete"),
            SpecStatus::Archived => write!(f, "archived"),
        }
    }
}

impl std::str::FromStr for SpecStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "planned" => Ok(SpecStatus::Planned),
            "in-progress" | "in_progress" | "inprogress" => Ok(SpecStatus::InProgress),
            "complete" | "completed" => Ok(SpecStatus::Complete),
            "archived" => Ok(SpecStatus::Archived),
            _ => Err(format!(
                "Invalid status: {}. Valid values: planned, in-progress, complete, archived",
                s
            )),
        }
    }
}

/// Priority of a spec
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SpecPriority {
    Low,
    Medium,
    High,
    Critical,
}

impl std::fmt::Display for SpecPriority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SpecPriority::Low => write!(f, "low"),
            SpecPriority::Medium => write!(f, "medium"),
            SpecPriority::High => write!(f, "high"),
            SpecPriority::Critical => write!(f, "critical"),
        }
    }
}

impl std::str::FromStr for SpecPriority {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "low" => Ok(SpecPriority::Low),
            "medium" | "med" => Ok(SpecPriority::Medium),
            "high" => Ok(SpecPriority::High),
            "critical" | "urgent" => Ok(SpecPriority::Critical),
            _ => Err(format!(
                "Invalid priority: {}. Valid values: low, medium, high, critical",
                s
            )),
        }
    }
}

/// A status transition record for tracking spec lifecycle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusTransition {
    pub status: SpecStatus,
    pub at: DateTime<Utc>,
}

/// Frontmatter parsed from a spec markdown file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpecFrontmatter {
    pub status: SpecStatus,
    pub created: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<SpecPriority>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub depends_on: Vec<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub assignee: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reviewer: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub issue: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pr: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub epic: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub breaking: Option<bool>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub due: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed: Option<String>,

    // Timestamp fields for velocity tracking
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<DateTime<Utc>>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub transitions: Vec<StatusTransition>,

    /// Custom fields from config (stored as key-value pairs)
    #[serde(flatten)]
    pub custom: std::collections::HashMap<String, serde_yaml::Value>,
}

impl SpecFrontmatter {
    /// Get the status emoji for display
    pub fn status_emoji(&self) -> &'static str {
        match self.status {
            SpecStatus::Planned => "📅",
            SpecStatus::InProgress => "⏳",
            SpecStatus::Complete => "✅",
            SpecStatus::Archived => "📦",
        }
    }

    /// Get the status label for display
    pub fn status_label(&self) -> &'static str {
        match self.status {
            SpecStatus::Planned => "Planned",
            SpecStatus::InProgress => "In Progress",
            SpecStatus::Complete => "Complete",
            SpecStatus::Archived => "Archived",
        }
    }
}

/// Complete spec information including parsed content
#[derive(Debug, Clone)]
pub struct SpecInfo {
    /// Unique identifier (directory name, e.g., "170-cli-mcp-core-rust-migration")
    pub path: String,

    /// Title extracted from the markdown H1 heading
    pub title: String,

    /// Parsed frontmatter metadata
    pub frontmatter: SpecFrontmatter,

    /// Raw markdown content (without frontmatter)
    pub content: String,

    /// Full file path
    pub file_path: std::path::PathBuf,

    /// Whether this is a sub-spec
    pub is_sub_spec: bool,

    /// Parent spec path if this is a sub-spec
    pub parent_spec: Option<String>,
}

impl SpecInfo {
    /// Get the spec number from the path (e.g., "170" from "170-cli-mcp")
    pub fn number(&self) -> Option<u32> {
        self.path.split('-').next()?.parse().ok()
    }

    /// Get the spec name without the number prefix
    pub fn name(&self) -> &str {
        self.path
            .split_once('-')
            .map(|(_, name)| name)
            .unwrap_or(&self.path)
    }
}

/// Filter options for listing specs
#[derive(Debug, Clone, Default)]
pub struct SpecFilterOptions {
    pub status: Option<Vec<SpecStatus>>,
    pub tags: Option<Vec<String>>,
    pub priority: Option<Vec<SpecPriority>>,
    pub assignee: Option<String>,
    pub search: Option<String>,
}

impl SpecFilterOptions {
    /// Check if a spec matches the filter criteria
    pub fn matches(&self, spec: &SpecInfo) -> bool {
        // Status filter
        if let Some(statuses) = &self.status {
            if !statuses.contains(&spec.frontmatter.status) {
                return false;
            }
        }

        // Tags filter (spec must have ALL specified tags)
        if let Some(tags) = &self.tags {
            if tags.iter().any(|tag| !spec.frontmatter.tags.contains(tag)) {
                return false;
            }
        }

        // Priority filter
        if let Some(priorities) = &self.priority {
            match &spec.frontmatter.priority {
                Some(p) if priorities.contains(p) => {}
                _ => return false,
            }
        }

        // Assignee filter
        if let Some(assignee) = &self.assignee {
            match &spec.frontmatter.assignee {
                Some(a) if a == assignee => {}
                _ => return false,
            }
        }

        // Search filter (matches title, path, or content)
        if let Some(search) = &self.search {
            let search_lower = search.to_lowercase();
            let matches = spec.title.to_lowercase().contains(&search_lower)
                || spec.path.to_lowercase().contains(&search_lower)
                || spec.content.to_lowercase().contains(&search_lower);
            if !matches {
                return false;
            }
        }

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spec_status_from_str() {
        assert_eq!(
            "planned".parse::<SpecStatus>().unwrap(),
            SpecStatus::Planned
        );
        assert_eq!(
            "in-progress".parse::<SpecStatus>().unwrap(),
            SpecStatus::InProgress
        );
        assert_eq!(
            "complete".parse::<SpecStatus>().unwrap(),
            SpecStatus::Complete
        );
        assert_eq!(
            "archived".parse::<SpecStatus>().unwrap(),
            SpecStatus::Archived
        );
        assert!("invalid".parse::<SpecStatus>().is_err());
    }

    #[test]
    fn test_spec_priority_from_str() {
        assert_eq!("low".parse::<SpecPriority>().unwrap(), SpecPriority::Low);
        assert_eq!(
            "medium".parse::<SpecPriority>().unwrap(),
            SpecPriority::Medium
        );
        assert_eq!("high".parse::<SpecPriority>().unwrap(), SpecPriority::High);
        assert_eq!(
            "critical".parse::<SpecPriority>().unwrap(),
            SpecPriority::Critical
        );
        assert!("invalid".parse::<SpecPriority>().is_err());
    }

    #[test]
    fn test_status_display() {
        assert_eq!(SpecStatus::Planned.to_string(), "planned");
        assert_eq!(SpecStatus::InProgress.to_string(), "in-progress");
    }
}
