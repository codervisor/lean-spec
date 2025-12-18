//! Completion verification for specs
//!
//! Validates that a spec can be marked as complete by checking for unchecked
//! checkbox items in the spec content.

use crate::types::{CheckboxItem, CompletionVerificationResult, Progress};
use regex::Regex;
use std::path::Path;

/// Verifies spec completion by checking checkbox items
pub struct CompletionVerifier;

impl CompletionVerifier {
    /// Verify if a spec is ready to be marked as complete
    ///
    /// Returns a verification result containing:
    /// - Whether all checkboxes are checked
    /// - List of outstanding (unchecked) items
    /// - Progress metrics
    /// - Suggestions for completing outstanding items
    pub fn verify_completion(spec_path: &Path) -> Result<CompletionVerificationResult, String> {
        let readme_path = spec_path.join("README.md");
        let content = std::fs::read_to_string(&readme_path)
            .map_err(|e| format!("Failed to read spec: {}", e))?;

        Self::verify_content(&content)
    }

    /// Verify completion from content string (useful for testing)
    pub fn verify_content(content: &str) -> Result<CompletionVerificationResult, String> {
        let checkboxes = Self::parse_checkboxes(content)?;

        if checkboxes.is_empty() {
            return Ok(CompletionVerificationResult::success());
        }

        let unchecked: Vec<CheckboxItem> =
            checkboxes.iter().filter(|cb| !cb.checked).cloned().collect();

        let progress = Progress::calculate(&checkboxes);

        let suggestions = Self::generate_suggestions(&unchecked);

        Ok(CompletionVerificationResult {
            is_complete: unchecked.is_empty(),
            outstanding: unchecked,
            progress,
            suggestions,
        })
    }

    /// Parse checkbox items from markdown content
    fn parse_checkboxes(content: &str) -> Result<Vec<CheckboxItem>, String> {
        let checkbox_regex = Regex::new(r"^(\s*)-\s*\[([ xX])\]\s*(.+)$")
            .map_err(|e| format!("Regex error: {}", e))?;

        let header_regex =
            Regex::new(r"^(#{1,6})\s+(.+)$").map_err(|e| format!("Regex error: {}", e))?;

        let mut checkboxes = Vec::new();
        let mut current_section: Option<String> = None;

        for (line_number, line) in content.lines().enumerate() {
            let line_num = line_number + 1; // 1-indexed

            // Track section headers
            if let Some(caps) = header_regex.captures(line) {
                current_section = Some(caps.get(2).unwrap().as_str().trim().to_string());
            }

            // Parse checkboxes
            if let Some(caps) = checkbox_regex.captures(line) {
                let check_mark = caps.get(2).unwrap().as_str();
                let text = caps.get(3).unwrap().as_str().trim().to_string();
                let checked = check_mark == "x" || check_mark == "X";

                checkboxes.push(CheckboxItem {
                    line: line_num,
                    text,
                    section: current_section.clone(),
                    checked,
                });
            }
        }

        Ok(checkboxes)
    }

    /// Generate actionable suggestions based on outstanding items
    fn generate_suggestions(unchecked: &[CheckboxItem]) -> Vec<String> {
        if unchecked.is_empty() {
            return Vec::new();
        }

        let mut suggestions = vec!["Review outstanding items and complete them".to_string()];

        // Group by section for targeted suggestions
        let sections: std::collections::HashSet<_> = unchecked
            .iter()
            .filter_map(|cb| cb.section.as_ref())
            .collect();

        if !sections.is_empty() {
            let section_list: Vec<_> = sections.iter().map(|s| s.as_str()).collect();
            suggestions.push(format!(
                "Focus on sections: {}",
                section_list.join(", ")
            ));
        }

        suggestions.push("Or use --force to mark complete anyway".to_string());

        suggestions
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_checked() {
        let content = r#"
# Test Spec

## Plan

- [x] Task 1
- [x] Task 2
"#;

        let result = CompletionVerifier::verify_content(content).unwrap();
        assert!(result.is_complete);
        assert!(result.outstanding.is_empty());
        assert_eq!(result.progress.completed, 2);
        assert_eq!(result.progress.total, 2);
    }

    #[test]
    fn test_some_unchecked() {
        let content = r#"
# Test Spec

## Plan

- [x] Task 1
- [ ] Task 2
- [x] Task 3
- [ ] Task 4
"#;

        let result = CompletionVerifier::verify_content(content).unwrap();
        assert!(!result.is_complete);
        assert_eq!(result.outstanding.len(), 2);
        assert_eq!(result.progress.completed, 2);
        assert_eq!(result.progress.total, 4);
        assert!((result.progress.percentage - 50.0).abs() < 0.1);
    }

    #[test]
    fn test_no_checkboxes() {
        let content = r#"
# Test Spec

## Overview

No checkboxes here.
"#;

        let result = CompletionVerifier::verify_content(content).unwrap();
        assert!(result.is_complete);
    }

    #[test]
    fn test_section_detection() {
        let content = r#"
# Test Spec

## Plan

- [ ] Plan task

## Test

- [ ] Test task
"#;

        let result = CompletionVerifier::verify_content(content).unwrap();
        assert_eq!(result.outstanding.len(), 2);
        assert_eq!(result.outstanding[0].section, Some("Plan".to_string()));
        assert_eq!(result.outstanding[1].section, Some("Test".to_string()));
    }

    #[test]
    fn test_line_numbers() {
        let content = r#"# Test

- [ ] Line 3
- [x] Line 4
- [ ] Line 5
"#;

        let result = CompletionVerifier::verify_content(content).unwrap();
        assert_eq!(result.outstanding[0].line, 3);
        assert_eq!(result.outstanding[1].line, 5);
    }

    #[test]
    fn test_nested_checkboxes() {
        let content = r#"
## Plan

- [ ] Top level
  - [ ] Nested item
    - [ ] Deeply nested
"#;

        let result = CompletionVerifier::verify_content(content).unwrap();
        assert_eq!(result.outstanding.len(), 3);
    }

    #[test]
    fn test_uppercase_x() {
        let content = r#"
- [X] Uppercase checked
- [x] Lowercase checked
- [ ] Unchecked
"#;

        let result = CompletionVerifier::verify_content(content).unwrap();
        assert_eq!(result.progress.completed, 2);
        assert_eq!(result.outstanding.len(), 1);
    }
}
