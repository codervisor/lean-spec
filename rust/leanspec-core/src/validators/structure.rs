//! Structure validation for spec content

use crate::types::{SpecInfo, ValidationResult, ValidationIssue, IssueSeverity};
use regex::Regex;

/// Options for structure validation
#[derive(Debug, Clone)]
pub struct StructureOptions {
    /// Required sections (case-insensitive)
    pub required_sections: Vec<String>,
    
    /// Check for orphan spec sections (h3 not under h2)
    pub check_heading_hierarchy: bool,
    
    /// Require title (h1) to match spec name
    pub validate_title_match: bool,
}

impl Default for StructureOptions {
    fn default() -> Self {
        Self {
            required_sections: vec![
                "Overview".to_string(),
                "Plan".to_string(),
            ],
            check_heading_hierarchy: true,
            validate_title_match: false,
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
        
        // Check for required sections
        self.validate_required_sections(&headings, &mut result);
        
        // Check heading hierarchy if enabled
        if self.options.check_heading_hierarchy {
            self.validate_heading_hierarchy(&headings, &mut result);
        }
        
        // Check for empty sections
        self.validate_section_content(spec, &headings, &mut result);
        
        result
    }
    
    /// Extract all headings from markdown content
    fn extract_headings(&self, content: &str) -> Vec<Heading> {
        let heading_regex = Regex::new(r"^(#{1,6})\s+(.+)$").unwrap();
        
        content
            .lines()
            .enumerate()
            .filter_map(|(line_num, line)| {
                heading_regex.captures(line).map(|cap| {
                    let level = cap.get(1).unwrap().as_str().len();
                    let text = cap.get(2).unwrap().as_str().trim().to_string();
                    Heading {
                        level,
                        text,
                        line: line_num + 1,
                    }
                })
            })
            .collect()
    }
    
    fn validate_title(&self, headings: &[Heading], spec: &SpecInfo, result: &mut ValidationResult) {
        // Check that there's exactly one h1
        let h1_count = headings.iter().filter(|h| h.level == 1).count();
        
        if h1_count == 0 {
            result.add_error("structure", "Missing title (# heading)");
        } else if h1_count > 1 {
            result.add_warning("structure", "Multiple h1 headings found. Specs should have a single title.");
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
                        format!("Title '{}' doesn't match spec path '{}'", h1.text, spec.path)
                    );
                }
            }
        }
    }
    
    fn validate_required_sections(&self, headings: &[Heading], result: &mut ValidationResult) {
        for required in &self.options.required_sections {
            let required_lower = required.to_lowercase();
            let found = headings.iter().any(|h| {
                h.level == 2 && h.text.to_lowercase() == required_lower
            });
            
            if !found {
                result.add_warning(
                    "structure",
                    format!("Missing recommended section: ## {}", required)
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
                        result.issues.push(ValidationIssue {
                            severity: IssueSeverity::Warning,
                            message: format!("h3 '{}' not under an h2 section", heading.text),
                            line: Some(heading.line),
                            category: "structure".to_string(),
                            suggestion: Some("Consider restructuring headings or adding a parent h2".to_string()),
                        });
                    }
                }
                _ => {}
            }
        }
    }
    
    fn validate_section_content(&self, spec: &SpecInfo, headings: &[Heading], result: &mut ValidationResult) {
        let lines: Vec<&str> = spec.content.lines().collect();
        
        for (i, heading) in headings.iter().enumerate() {
            // Find content until next heading
            let start_line = heading.line;
            let end_line = headings
                .get(i + 1)
                .map(|h| h.line)
                .unwrap_or(lines.len() + 1);
            
            // Count non-empty lines between headings
            let content_lines: usize = lines
                .iter()
                .skip(start_line)
                .take(end_line - start_line - 1)
                .filter(|line| !line.trim().is_empty())
                .count();
            
            if content_lines == 0 && heading.level == 2 {
                result.add_warning(
                    "structure",
                    format!("Empty section: ## {}", heading.text)
                );
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

## Overview

This is the overview.
"#;
        
        let spec = create_test_spec(content);
        let validator = StructureValidator::new();
        let result = validator.validate(&spec);
        
        // Should have warning for missing Plan section
        assert!(result.has_warnings());
        assert!(result.warnings().any(|w| w.message.contains("Plan")));
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
        assert!(result.warnings().any(|w| w.message.contains("Empty section")));
    }
}
