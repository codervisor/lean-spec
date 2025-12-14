//! Spec validation
//!
//! Validates spec structure, frontmatter, and content.

use serde::{Deserialize, Serialize};

use crate::specs::constants::{VALID_STATUSES, VALID_PRIORITIES};
use crate::specs::frontmatter::parse_frontmatter;
use crate::specs::reader::Spec;

/// Validation result for a spec
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    pub spec_name: String,
    pub valid: bool,
    pub issues: Vec<ValidationIssue>,
}

/// A single validation issue
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    pub severity: IssueSeverity,
    pub code: String,
    pub message: String,
    pub line: Option<i32>,
}

/// Severity of a validation issue
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum IssueSeverity {
    Error,
    Warning,
    Info,
}

/// Validate a single spec
pub fn validate_spec(spec: &Spec) -> ValidationResult {
    let mut issues = Vec::new();

    // Parse frontmatter for validation
    let (frontmatter, body) = parse_frontmatter(&spec.content_md);

    // Check required fields
    if frontmatter.status.is_none() {
        issues.push(ValidationIssue {
            severity: IssueSeverity::Error,
            code: "missing-status".to_string(),
            message: "Spec must have a status field in frontmatter".to_string(),
            line: None,
        });
    }

    // Check valid status values
    if let Some(status) = &frontmatter.status {
        if !VALID_STATUSES.contains(&status.as_str()) {
            issues.push(ValidationIssue {
                severity: IssueSeverity::Error,
                code: "invalid-status".to_string(),
                message: format!(
                    "Invalid status '{}'. Must be one of: {}",
                    status,
                    VALID_STATUSES.join(", ")
                ),
                line: None,
            });
        }
    }

    // Check valid priority values
    if let Some(priority) = &frontmatter.priority {
        if !VALID_PRIORITIES.contains(&priority.as_str()) {
            issues.push(ValidationIssue {
                severity: IssueSeverity::Warning,
                code: "invalid-priority".to_string(),
                message: format!(
                    "Invalid priority '{}'. Recommended: {}",
                    priority,
                    VALID_PRIORITIES.join(", ")
                ),
                line: None,
            });
        }
    }

    // Check for title in body
    if spec.title.is_none() {
        issues.push(ValidationIssue {
            severity: IssueSeverity::Warning,
            code: "missing-title".to_string(),
            message: "Spec should have a title (H1 heading)".to_string(),
            line: None,
        });
    }

    // Check line count (spec 169 mentions line limits)
    let line_count = spec.content_md.lines().count();
    if line_count > 400 {
        issues.push(ValidationIssue {
            severity: IssueSeverity::Warning,
            code: "excessive-length".to_string(),
            message: format!(
                "Spec has {} lines, which exceeds recommended maximum of 400",
                line_count
            ),
            line: None,
        });
    }

    // Check for required sections (Overview, Design, Plan, Test, Notes)
    let has_overview = body.contains("## Overview") || body.contains("## overview");
    let _has_design = body.contains("## Design") || body.contains("## design");
    let _has_plan = body.contains("## Plan") || body.contains("## plan");
    let _has_test = body.contains("## Test") || body.contains("## test");

    if !has_overview {
        issues.push(ValidationIssue {
            severity: IssueSeverity::Info,
            code: "missing-overview".to_string(),
            message: "Consider adding an ## Overview section".to_string(),
            line: None,
        });
    }

    // Check for dangling dependencies
    for dep in &frontmatter.depends_on {
        // This is a basic check; full validation would require all specs
        if dep.trim().is_empty() {
            issues.push(ValidationIssue {
                severity: IssueSeverity::Warning,
                code: "empty-dependency".to_string(),
                message: "Empty dependency in depends_on list".to_string(),
                line: None,
            });
        }
    }

    // Estimate token count (rough approximation)
    let estimated_tokens = estimate_tokens(&spec.content_md);
    if estimated_tokens > 5000 {
        issues.push(ValidationIssue {
            severity: IssueSeverity::Warning,
            code: "high-token-count".to_string(),
            message: format!(
                "Estimated {} tokens. Consider splitting if over 5000.",
                estimated_tokens
            ),
            line: None,
        });
    } else if estimated_tokens > 3500 {
        issues.push(ValidationIssue {
            severity: IssueSeverity::Info,
            code: "moderate-token-count".to_string(),
            message: format!(
                "Estimated {} tokens. Consider splitting if content grows.",
                estimated_tokens
            ),
            line: None,
        });
    }

    ValidationResult {
        spec_name: spec.spec_name.clone(),
        valid: !issues.iter().any(|i| i.severity == IssueSeverity::Error),
        issues,
    }
}

/// Validate all specs with cross-spec checks
pub fn validate_all_specs(specs: &[Spec]) -> Vec<ValidationResult> {
    let mut results: Vec<ValidationResult> = specs.iter().map(validate_spec).collect();

    // Build spec name set for dependency validation
    let spec_names: std::collections::HashSet<String> = specs
        .iter()
        .flat_map(|s| {
            let mut names = vec![s.spec_name.clone()];
            if let Some(num) = s.spec_number {
                names.push(format!("{:03}", num));
                names.push(num.to_string());
            }
            names
        })
        .collect();

    // Check for broken dependencies
    for (result, spec) in results.iter_mut().zip(specs.iter()) {
        let (frontmatter, _) = parse_frontmatter(&spec.content_md);
        
        for dep in &frontmatter.depends_on {
            let trimmed = dep.trim();
            if trimmed.is_empty() {
                continue;
            }

            // Check if dependency exists
            let exists = spec_names.contains(trimmed)
                || trimmed
                    .split('-')
                    .next()
                    .and_then(|n| n.parse::<i32>().ok())
                    .map(|num| spec_names.contains(&num.to_string()))
                    .unwrap_or(false);

            if !exists {
                result.issues.push(ValidationIssue {
                    severity: IssueSeverity::Warning,
                    code: "broken-dependency".to_string(),
                    message: format!("Dependency '{}' not found", dep),
                    line: None,
                });
                // Update valid status if this creates an error
                if result.valid && result.issues.iter().any(|i| i.severity == IssueSeverity::Error) {
                    result.valid = false;
                }
            }
        }
    }

    results
}

/// Estimate token count for content
/// Uses a rough heuristic of ~4 characters per token for English text
fn estimate_tokens(content: &str) -> i32 {
    let word_count = content.split_whitespace().count();
    let special_chars = content.chars().filter(|c| !c.is_alphanumeric() && !c.is_whitespace()).count();
    
    // Roughly 1.3 tokens per word + 0.5 for special chars
    ((word_count as f64 * 1.3) + (special_chars as f64 * 0.5)).ceil() as i32
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn create_test_spec_with_content(content: &str) -> Spec {
        let (fm, _) = parse_frontmatter(content);
        Spec {
            id: "test".to_string(),
            project_id: "test".to_string(),
            spec_number: Some(1),
            spec_name: "001-test".to_string(),
            title: super::super::frontmatter::extract_title(content),
            status: fm.status.unwrap_or_else(|| "planned".to_string()),
            priority: fm.priority,
            tags: fm.tags,
            assignee: fm.assignee,
            content_md: content.to_string(),
            content_html: None,
            created_at: None,
            updated_at: None,
            completed_at: None,
            file_path: "specs/001-test/README.md".to_string(),
            github_url: None,
            synced_at: Utc::now(),
            depends_on: fm.depends_on,
            required_by: Vec::new(),
        }
    }

    #[test]
    fn test_validate_valid_spec() {
        let content = r#"---
status: planned
priority: high
---

# Valid Spec

## Overview

This is a valid spec.

## Design

Some design content.

## Plan

- [ ] Task 1
- [ ] Task 2

## Test

Test criteria.
"#;
        let spec = create_test_spec_with_content(content);
        let result = validate_spec(&spec);
        
        assert!(result.valid);
        assert!(result.issues.iter().all(|i| i.severity != IssueSeverity::Error));
    }

    #[test]
    fn test_validate_missing_status() {
        let content = r#"---
priority: high
---

# Missing Status
"#;
        let spec = create_test_spec_with_content(content);
        let result = validate_spec(&spec);
        
        assert!(!result.valid);
        assert!(result.issues.iter().any(|i| i.code == "missing-status"));
    }

    #[test]
    fn test_validate_invalid_status() {
        let content = r#"---
status: invalid-status
---

# Invalid Status
"#;
        let spec = create_test_spec_with_content(content);
        let result = validate_spec(&spec);
        
        assert!(!result.valid);
        assert!(result.issues.iter().any(|i| i.code == "invalid-status"));
    }

    #[test]
    fn test_estimate_tokens() {
        let short_text = "Hello world";
        let long_text = "Hello world ".repeat(1000);
        
        let short_tokens = estimate_tokens(short_text);
        let long_tokens = estimate_tokens(&long_text);
        
        assert!(short_tokens < 10);
        assert!(long_tokens > 2000);
    }
}
