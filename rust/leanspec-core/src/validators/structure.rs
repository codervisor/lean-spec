//! Structure validation for spec content

use crate::types::{ErrorSeverity, SpecInfo, ValidationError, ValidationResult};
use regex::Regex;

/// Options for structure validation
#[derive(Debug, Clone)]
pub struct StructureOptions {
    /// Required sections (case-insensitive)
    pub required_sections: Vec<String>,

    /// Check for orphan spec sections (h3 not under h2)
    /// Disabled by default as it produces too many false positives
    pub check_heading_hierarchy: bool,

    /// Require title (h1) to match spec name
    pub validate_title_match: bool,

    /// Check for empty sections
    /// This now properly recognizes subsections as content
    pub check_empty_sections: bool,

    /// Skip required sections check for archived/complete specs
    pub skip_completed_checks: bool,
}

impl Default for StructureOptions {
    fn default() -> Self {
        Self {
            required_sections: vec![],
            check_heading_hierarchy: false, // Disabled: too many false positives
            validate_title_match: false,
            check_empty_sections: true,
            skip_completed_checks: true, // Skip checks for archived/complete specs
        }
    }
}

/// Validator for spec markdown structure
pub struct StructureValidator {
    options: StructureOptions,
}

impl StructureValidator {
    /// Create a new structure validator with default options
    pub fn new() -> Self {
        Self {
            options: StructureOptions::default(),
        }
    }

    /// Create a validator with custom options
    pub fn with_options(options: StructureOptions) -> Self {
        Self { options }
    }

    /// Validate a spec's content structure
    pub fn validate(&self, spec: &SpecInfo) -> ValidationResult {
        let mut result = ValidationResult::new(&spec.path);

        // Extract all headings from content
        let headings = self.extract_headings(&spec.content);

        // Check for required title (h1)
        self.validate_title(&headings, spec, &mut result);

        // Skip some checks for archived/complete specs
        let is_completed = matches!(
            spec.frontmatter.status,
            crate::types::SpecStatus::Complete | crate::types::SpecStatus::Archived
        );

        // Check for required sections (skip for completed specs)
        if !(self.options.skip_completed_checks && is_completed) {
            self.validate_required_sections(&headings, &mut result);
        }

        // Check heading hierarchy if enabled (disabled by default)
        if self.options.check_heading_hierarchy {
            self.validate_heading_hierarchy(&headings, &mut result);
        }

        // Check for empty sections
        if self.options.check_empty_sections {
            self.validate_section_content(spec, &headings, &mut result);
        }

        result
    }

    /// Extract all headings from markdown content
    /// Skips headings inside code blocks to avoid false positives
    fn extract_headings(&self, content: &str) -> Vec<Heading> {
        let heading_regex = Regex::new(r"^(#{1,6})\s+(.+)$").unwrap();
        // Opening fence: ``` or more, optionally followed by language identifier
        let open_fence_regex = Regex::new(r"^(`{3,})").unwrap();
        // Closing fence: ``` or more, followed only by optional whitespace
        let close_fence_regex = Regex::new(r"^(`{3,})\s*$").unwrap();

        let mut in_code_block = false;
        let mut fence_len = 0usize;
        let mut headings = Vec::new();

        for (line_num, line) in content.lines().enumerate() {
            if !in_code_block {
                // Check for opening fence
                if let Some(cap) = open_fence_regex.captures(line) {
                    in_code_block = true;
                    fence_len = cap.get(1).unwrap().as_str().len();
                    continue;
                }
            } else {
                // Check for closing fence (must be only backticks + whitespace)
                if let Some(cap) = close_fence_regex.captures(line) {
                    let current_fence_len = cap.get(1).unwrap().as_str().len();
                    if current_fence_len >= fence_len {
                        in_code_block = false;
                        fence_len = 0;
                    }
                }
                // Stay in code block, skip heading detection
                continue;
            }

            if let Some(cap) = heading_regex.captures(line) {
                let level = cap.get(1).unwrap().as_str().len();
                let text = cap.get(2).unwrap().as_str().trim().to_string();
                headings.push(Heading {
                    level,
                    text,
                    line: line_num + 1,
                });
            }
        }

        headings
    }

    fn validate_title(&self, headings: &[Heading], spec: &SpecInfo, result: &mut ValidationResult) {
        // Check that there's exactly one h1
        let h1_count = headings.iter().filter(|h| h.level == 1).count();

        if h1_count == 0 {
            result.add_error("structure", "Missing title (# heading)");
        } else if h1_count > 1 {
            result.add_warning(
                "structure",
                "Multiple h1 headings found. Specs should have a single title.",
            );
        }

        // Validate title matches spec name if required
        if self.options.validate_title_match {
            if let Some(h1) = headings.iter().find(|h| h.level == 1) {
                let expected_title = spec.path.split('-').skip(1).collect::<Vec<_>>().join(" ");
                let expected_title_kebab = expected_title.to_lowercase().replace(' ', "-");
                let actual_title_kebab = h1.text.to_lowercase().replace(' ', "-");

                if !actual_title_kebab.contains(&expected_title_kebab) {
                    result.add_info(
                        "structure",
                        format!(
                            "Title '{}' doesn't match spec path '{}'",
                            h1.text, spec.path
                        ),
                    );
                }
            }
        }
    }

    fn validate_required_sections(&self, headings: &[Heading], result: &mut ValidationResult) {
        for required in &self.options.required_sections {
            let required_lower = required.to_lowercase();
            let found = headings
                .iter()
                .any(|h| h.level == 2 && h.text.to_lowercase() == required_lower);

            if !found {
                result.add_warning(
                    "structure",
                    format!("Missing recommended section: ## {}", required),
                );
            }
        }
    }

    fn validate_heading_hierarchy(&self, headings: &[Heading], result: &mut ValidationResult) {
        let mut in_h2 = false;

        for heading in headings {
            match heading.level {
                1 => in_h2 = false,
                2 => in_h2 = true,
                3 => {
                    if !in_h2 {
                        result.errors.push(ValidationError {
                            severity: ErrorSeverity::Warning,
                            message: format!("h3 '{}' not under an h2 section", heading.text),
                            line: Some(heading.line),
                            category: "structure".to_string(),
                            suggestion: Some(
                                "Consider restructuring headings or adding a parent h2".to_string(),
                            ),
                        });
                    }
                }
                _ => {}
            }
        }
    }

    fn validate_section_content(
        &self,
        spec: &SpecInfo,
        headings: &[Heading],
        result: &mut ValidationResult,
    ) {
        let lines: Vec<&str> = spec.content.lines().collect();

        for (i, heading) in headings.iter().enumerate() {
            // Only check h2 sections for emptiness
            if heading.level != 2 {
                continue;
            }

            // Find content until next heading at same or higher level
            let start_line = heading.line;
            let end_line = headings
                .get(i + 1)
                .map(|h| h.line)
                .unwrap_or(lines.len() + 1);

            // Check if the next heading is a subsection (h3, h4, etc.)
            // If so, the section is not empty - it has subsections as content
            let next_heading = headings.get(i + 1);
            let has_subsection = next_heading
                .map(|h| h.level > heading.level)
                .unwrap_or(false);

            if has_subsection {
                // Section has subsections, not empty
                continue;
            }

            // Count non-empty lines between headings
            let content_lines: usize = lines
                .iter()
                .skip(start_line)
                .take(end_line - start_line - 1)
                .filter(|line| !line.trim().is_empty())
                .count();

            if content_lines == 0 {
                result.add_warning("structure", format!("Empty section: ## {}", heading.text));
            }
        }
    }
}

impl Default for StructureValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug)]
struct Heading {
    level: usize,
    text: String,
    line: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SpecFrontmatter, SpecStatus};
    use std::path::PathBuf;

    fn create_test_spec(content: &str) -> SpecInfo {
        SpecInfo {
            path: "test-spec".to_string(),
            title: "Test Spec".to_string(),
            frontmatter: SpecFrontmatter {
                status: SpecStatus::Planned,
                created: "2025-01-01".to_string(),
                priority: None,
                tags: Vec::new(),
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
            content: content.to_string(),
            file_path: PathBuf::from("specs/test-spec/README.md"),
            is_sub_spec: false,
            parent_spec: None,
        }
    }

    #[test]
    fn test_valid_structure() {
        let content = r#"# Test Spec

## Overview

This is the overview section.

## Plan

- [ ] Step 1
- [ ] Step 2
"#;

        let spec = create_test_spec(content);
        let validator = StructureValidator::new();
        let result = validator.validate(&spec);

        assert!(result.is_valid());
    }

    #[test]
    fn test_missing_title() {
        let content = r#"## Overview

This is the overview.
"#;

        let spec = create_test_spec(content);
        let validator = StructureValidator::new();
        let result = validator.validate(&spec);

        assert!(!result.is_valid());
        assert!(result.errors().any(|e| e.message.contains("Missing title")));
    }

    #[test]
    fn test_missing_required_section() {
        let content = r#"# Test Spec

## Plan

This is the plan section.
"#;

        let spec = create_test_spec(content);
        // Configure validator to require Overview section for this test
        let options = StructureOptions {
            required_sections: vec!["Overview".to_string()],
            ..Default::default()
        };
        let validator = StructureValidator::with_options(options);
        let result = validator.validate(&spec);

        // Should have warning for missing Overview section
        assert!(result.has_warnings());
        assert!(result.warnings().any(|w| w.message.contains("Overview")));
    }

    #[test]
    fn test_empty_section() {
        let content = r#"# Test Spec

## Overview

## Plan

- [ ] Step 1
"#;

        let spec = create_test_spec(content);
        let validator = StructureValidator::new();
        let result = validator.validate(&spec);

        // Should have warning for empty Overview section
        assert!(result
            .warnings()
            .any(|w| w.message.contains("Empty section")));
    }
}
