//! Frontmatter parsing for spec files
//!
//! Parses YAML frontmatter from markdown files using the gray-matter pattern.

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

/// Parsed frontmatter from a spec file
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Frontmatter {
    pub status: Option<String>,
    pub priority: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub assignee: Option<String>,
    pub created: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub completed_at: Option<String>,
    #[serde(default)]
    pub depends_on: Vec<String>,
    #[serde(default)]
    pub transitions: Vec<StatusTransition>,
    /// Catch-all for unknown fields
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

/// A status transition record
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusTransition {
    pub from: String,
    pub to: String,
    pub at: String,
}

impl Frontmatter {
    /// Get the status with a default of "planned"
    pub fn status_or_default(&self) -> &str {
        self.status.as_deref().unwrap_or("planned")
    }

    /// Get the priority with a default of "medium"
    /// 
    /// Currently unused but provided for consistency with status_or_default.
    /// May be used for filtering or sorting specs by priority in the future.
    #[allow(dead_code)]
    pub fn priority_or_default(&self) -> &str {
        self.priority.as_deref().unwrap_or("medium")
    }

    /// Get created timestamp, preferring created_at over created
    pub fn get_created(&self) -> Option<DateTime<Utc>> {
        self.created_at
            .as_ref()
            .or(self.created.as_ref())
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc))
    }

    /// Get updated timestamp
    pub fn get_updated(&self) -> Option<DateTime<Utc>> {
        self.updated_at
            .as_ref()
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc))
    }
}

/// Parse frontmatter from markdown content
/// 
/// Returns (frontmatter, content_without_frontmatter)
pub fn parse_frontmatter(content: &str) -> (Frontmatter, String) {
    // Check if content starts with frontmatter delimiter
    if !content.starts_with("---") {
        return (Frontmatter::default(), content.to_string());
    }

    // Find the closing delimiter
    let rest = &content[3..]; // Skip opening "---"
    
    // Skip any newline after opening ---
    let rest = rest.strip_prefix('\n').unwrap_or(rest);
    let rest = rest.strip_prefix("\r\n").unwrap_or(rest);
    
    if let Some(end_pos) = rest.find("\n---") {
        let yaml_content = &rest[..end_pos];
        let markdown_start = end_pos + 4; // Skip "\n---"
        let markdown_content = rest[markdown_start..].trim_start_matches(['\n', '\r']);
        
        match serde_yaml::from_str::<Frontmatter>(yaml_content) {
            Ok(frontmatter) => (frontmatter, markdown_content.to_string()),
            Err(e) => {
                eprintln!("Failed to parse frontmatter YAML: {}", e);
                (Frontmatter::default(), content.to_string())
            }
        }
    } else {
        // No closing delimiter found
        (Frontmatter::default(), content.to_string())
    }
}

/// Extract the title from markdown content (first H1 heading)
pub fn extract_title(content: &str) -> Option<String> {
    for line in content.lines() {
        let trimmed = line.trim();
        if let Some(title) = trimmed.strip_prefix("# ") {
            return Some(title.trim().to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_frontmatter_basic() {
        let content = r#"---
status: planned
priority: high
tags:
  - architecture
  - desktop
---

# My Spec Title

Some content here.
"#;
        let (fm, body) = parse_frontmatter(content);
        assert_eq!(fm.status, Some("planned".to_string()));
        assert_eq!(fm.priority, Some("high".to_string()));
        assert_eq!(fm.tags, vec!["architecture", "desktop"]);
        assert!(body.contains("# My Spec Title"));
        assert!(body.contains("Some content here."));
    }

    #[test]
    fn test_parse_frontmatter_with_depends_on() {
        let content = r#"---
status: in-progress
depends_on:
  - 001-init
  - 002-setup
---

# Spec with deps
"#;
        let (fm, _) = parse_frontmatter(content);
        assert_eq!(fm.status, Some("in-progress".to_string()));
        assert_eq!(fm.depends_on, vec!["001-init", "002-setup"]);
    }

    #[test]
    fn test_parse_frontmatter_no_frontmatter() {
        let content = "# Just a title\n\nNo frontmatter here.";
        let (fm, body) = parse_frontmatter(content);
        assert!(fm.status.is_none());
        assert_eq!(body, content);
    }

    #[test]
    fn test_extract_title() {
        let content = "Some preamble\n\n# The Title\n\nBody content";
        assert_eq!(extract_title(content), Some("The Title".to_string()));
    }

    #[test]
    fn test_extract_title_none() {
        let content = "No heading here\n\nJust paragraphs";
        assert_eq!(extract_title(content), None);
    }
}
