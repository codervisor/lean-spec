//! Frontmatter parsing for spec markdown files

use crate::types::{LeanSpecConfig, SpecFrontmatter, SpecPriority, SpecStatus, StatusTransition};
use chrono::Utc;
use thiserror::Error;

/// Errors that can occur during frontmatter parsing
#[derive(Debug, Error)]
pub enum ParseError {
    #[error("No frontmatter found in content")]
    NoFrontmatter,

    #[error("Invalid frontmatter format: {0}")]
    InvalidFormat(String),

    #[error("Missing required field: {0}")]
    MissingField(String),

    #[error("Invalid field value: {field} = {value}")]
    InvalidValue { field: String, value: String },

    #[error("YAML parsing error: {0}")]
    YamlError(#[from] serde_yaml::Error),
}

/// Parser for spec frontmatter
pub struct FrontmatterParser {
    #[allow(dead_code)]
    config: Option<LeanSpecConfig>,
}

impl FrontmatterParser {
    /// Create a new frontmatter parser
    pub fn new() -> Self {
        Self { config: None }
    }

    /// Create a parser with custom configuration
    pub fn with_config(config: LeanSpecConfig) -> Self {
        Self {
            config: Some(config),
        }
    }

    /// Parse frontmatter from markdown content
    pub fn parse(&self, content: &str) -> Result<(SpecFrontmatter, String), ParseError> {
        let (yaml_str, body) = self.extract_frontmatter(content)?;
        let frontmatter = self.parse_yaml(&yaml_str)?;
        Ok((frontmatter, body))
    }

    /// Extract YAML frontmatter from markdown content
    fn extract_frontmatter<'a>(&self, content: &'a str) -> Result<(String, String), ParseError> {
        let content = content.trim_start();

        // Check for YAML frontmatter delimiter
        if !content.starts_with("---") {
            return Err(ParseError::NoFrontmatter);
        }

        // Find the closing delimiter
        let after_opening = &content[3..];
        let close_pos = after_opening
            .find("\n---")
            .ok_or(ParseError::InvalidFormat(
                "Unclosed frontmatter block".to_string(),
            ))?;

        let yaml_str = &after_opening[..close_pos];
        let body_start = 3 + close_pos + 4; // Skip "---" + yaml + "\n---"
        let body = &content[body_start..];

        // Skip leading newlines in body
        let body = body.trim_start_matches('\n');

        Ok((yaml_str.to_string(), body.to_string()))
    }

    /// Parse YAML string into frontmatter struct
    fn parse_yaml(&self, yaml_str: &str) -> Result<SpecFrontmatter, ParseError> {
        // Parse as generic YAML value first for flexible handling
        let value: serde_yaml::Value = serde_yaml::from_str(yaml_str)?;

        let map = value.as_mapping().ok_or(ParseError::InvalidFormat(
            "Frontmatter must be a YAML mapping".to_string(),
        ))?;

        // Extract and validate required fields
        let status_str = map
            .get("status")
            .and_then(|v| v.as_str())
            .ok_or(ParseError::MissingField("status".to_string()))?;

        let status: SpecStatus = status_str.parse().map_err(|_| ParseError::InvalidValue {
            field: "status".to_string(),
            value: status_str.to_string(),
        })?;

        let created = map
            .get("created")
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or(ParseError::MissingField("created".to_string()))?;

        // Extract optional fields
        let priority = map
            .get("priority")
            .and_then(|v| v.as_str())
            .map(|s| s.parse::<SpecPriority>())
            .transpose()
            .map_err(|_| ParseError::InvalidValue {
                field: "priority".to_string(),
                value: map
                    .get("priority")
                    .unwrap()
                    .as_str()
                    .unwrap_or("")
                    .to_string(),
            })?;

        let tags = self.parse_string_array(map.get("tags"));
        let depends_on = self.parse_string_array(map.get("depends_on"));

        let assignee = map
            .get("assignee")
            .and_then(|v| v.as_str())
            .map(String::from);
        let reviewer = map
            .get("reviewer")
            .and_then(|v| v.as_str())
            .map(String::from);
        let issue = map.get("issue").and_then(|v| v.as_str()).map(String::from);
        let pr = map.get("pr").and_then(|v| v.as_str()).map(String::from);
        let epic = map.get("epic").and_then(|v| v.as_str()).map(String::from);
        let breaking = map.get("breaking").and_then(|v| v.as_bool());
        let due = map.get("due").and_then(|v| v.as_str()).map(String::from);
        let updated = map
            .get("updated")
            .and_then(|v| v.as_str())
            .map(String::from);
        let completed = map
            .get("completed")
            .and_then(|v| v.as_str())
            .map(String::from);

        // Parse timestamp fields
        let created_at = map
            .get("created_at")
            .and_then(|v| v.as_str())
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));

        let updated_at = map
            .get("updated_at")
            .and_then(|v| v.as_str())
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));

        let completed_at = map
            .get("completed_at")
            .and_then(|v| v.as_str())
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));

        // Parse transitions array
        let transitions = map
            .get("transitions")
            .and_then(|v| v.as_sequence())
            .map(|seq| {
                seq.iter()
                    .filter_map(|item| {
                        let status_str = item.get("status")?.as_str()?;
                        let at_str = item.get("at")?.as_str()?;
                        let status = status_str.parse().ok()?;
                        let at = chrono::DateTime::parse_from_rfc3339(at_str)
                            .ok()?
                            .with_timezone(&Utc);
                        Some(StatusTransition { status, at })
                    })
                    .collect()
            })
            .unwrap_or_default();

        // Collect custom fields (any field not in the known list)
        let known_fields = [
            "status",
            "created",
            "priority",
            "tags",
            "depends_on",
            "assignee",
            "reviewer",
            "issue",
            "pr",
            "epic",
            "breaking",
            "due",
            "updated",
            "completed",
            "created_at",
            "updated_at",
            "completed_at",
            "transitions",
        ];

        let mut custom = std::collections::HashMap::new();
        for (key, value) in map.iter() {
            if let Some(key_str) = key.as_str() {
                if !known_fields.contains(&key_str) {
                    custom.insert(key_str.to_string(), value.clone());
                }
            }
        }

        Ok(SpecFrontmatter {
            status,
            created,
            priority,
            tags,
            depends_on,
            assignee,
            reviewer,
            issue,
            pr,
            epic,
            breaking,
            due,
            updated,
            completed,
            created_at,
            updated_at,
            completed_at,
            transitions,
            custom,
        })
    }

    /// Parse a YAML value as a string array
    fn parse_string_array(&self, value: Option<&serde_yaml::Value>) -> Vec<String> {
        match value {
            Some(serde_yaml::Value::Sequence(seq)) => seq
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect(),
            Some(serde_yaml::Value::String(s)) => {
                // Handle JSON array string (e.g., '["tag1", "tag2"]')
                if s.starts_with('[') && s.ends_with(']') {
                    serde_json::from_str(s).unwrap_or_else(|_| {
                        // Fall back to comma-separated
                        s.split(',').map(|t| t.trim().to_string()).collect()
                    })
                } else {
                    // Comma-separated string
                    s.split(',').map(|t| t.trim().to_string()).collect()
                }
            }
            _ => Vec::new(),
        }
    }

    /// Create a markdown string from frontmatter
    pub fn stringify(&self, frontmatter: &SpecFrontmatter, content: &str) -> String {
        let yaml = serde_yaml::to_string(frontmatter)
            .unwrap_or_else(|_| "status: planned\ncreated: ''\n".to_string());

        format!("---\n{}---\n\n{}", yaml, content)
    }

    /// Update frontmatter fields and return new content
    pub fn update_frontmatter(
        &self,
        content: &str,
        updates: &std::collections::HashMap<String, serde_yaml::Value>,
    ) -> Result<String, ParseError> {
        let (mut frontmatter, body) = self.parse(content)?;

        // Apply updates
        for (key, value) in updates {
            match key.as_str() {
                "status" => {
                    if let Some(s) = value.as_str() {
                        frontmatter.status = s.parse().map_err(|_| ParseError::InvalidValue {
                            field: "status".to_string(),
                            value: s.to_string(),
                        })?;
                    }
                }
                "priority" => {
                    if let Some(s) = value.as_str() {
                        frontmatter.priority =
                            Some(s.parse().map_err(|_| ParseError::InvalidValue {
                                field: "priority".to_string(),
                                value: s.to_string(),
                            })?);
                    }
                }
                "tags" => {
                    frontmatter.tags = self.parse_string_array(Some(value));
                }
                "depends_on" => {
                    frontmatter.depends_on = self.parse_string_array(Some(value));
                }
                "assignee" => frontmatter.assignee = value.as_str().map(String::from),
                "reviewer" => frontmatter.reviewer = value.as_str().map(String::from),
                _ => {
                    frontmatter.custom.insert(key.clone(), value.clone());
                }
            }
        }

        // Update timestamps
        frontmatter.updated_at = Some(Utc::now());

        // Set completed_at if status changed to complete
        if frontmatter.status == SpecStatus::Complete && frontmatter.completed_at.is_none() {
            frontmatter.completed_at = Some(Utc::now());
        }

        Ok(self.stringify(&frontmatter, &body))
    }
}

impl Default for FrontmatterParser {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_basic_frontmatter() {
        let content = r#"---
status: planned
created: '2025-01-01'
tags:
  - feature
  - cli
priority: high
---

# Test Spec

This is the content.
"#;

        let parser = FrontmatterParser::new();
        let (fm, body) = parser.parse(content).unwrap();

        assert_eq!(fm.status, SpecStatus::Planned);
        assert_eq!(fm.created, "2025-01-01");
        assert_eq!(fm.tags, vec!["feature", "cli"]);
        assert_eq!(fm.priority, Some(SpecPriority::High));
        assert!(body.contains("# Test Spec"));
    }

    #[test]
    fn test_parse_with_depends_on() {
        let content = r#"---
status: in-progress
created: '2025-01-01'
depends_on:
  - 001-base-spec
  - 002-other-spec
---

# Test
"#;

        let parser = FrontmatterParser::new();
        let (fm, _) = parser.parse(content).unwrap();

        assert_eq!(fm.status, SpecStatus::InProgress);
        assert_eq!(fm.depends_on, vec!["001-base-spec", "002-other-spec"]);
    }

    #[test]
    fn test_parse_missing_status() {
        let content = r#"---
created: '2025-01-01'
---

# Test
"#;

        let parser = FrontmatterParser::new();
        let result = parser.parse(content);

        assert!(matches!(result, Err(ParseError::MissingField(f)) if f == "status"));
    }

    #[test]
    fn test_no_frontmatter() {
        let content = "# Just a heading\n\nSome content.";

        let parser = FrontmatterParser::new();
        let result = parser.parse(content);

        assert!(matches!(result, Err(ParseError::NoFrontmatter)));
    }

    #[test]
    fn test_stringify_frontmatter() {
        let parser = FrontmatterParser::new();
        let content = r#"---
status: complete
created: '2025-01-01'
tags:
  - done
---

# Done Spec
"#;

        let (fm, body) = parser.parse(content).unwrap();
        let result = parser.stringify(&fm, &body);

        assert!(result.contains("status: complete"));
        assert!(result.contains("created:"));
        assert!(result.contains("# Done Spec"));
    }
}
