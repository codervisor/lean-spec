//! Line count validation for specs

use crate::types::{SpecInfo, ValidationResult};

/// Options for line count validation
#[derive(Debug, Clone)]
pub struct LineCountOptions {
    /// Maximum number of lines (default: 400)
    pub max_lines: usize,

    /// Warning threshold for lines (default: 300)
    pub warn_lines: usize,
}

impl Default for LineCountOptions {
    fn default() -> Self {
        Self {
            max_lines: 400,
            warn_lines: 300,
        }
    }
}

/// Validator for spec line count
pub struct LineCountValidator {
    options: LineCountOptions,
}

impl LineCountValidator {
    /// Create a new line count validator with default options
    pub fn new() -> Self {
        Self {
            options: LineCountOptions::default(),
        }
    }

    /// Create a validator with custom options
    pub fn with_options(options: LineCountOptions) -> Self {
        Self { options }
    }

    /// Validate a spec's line count
    pub fn validate(&self, spec: &SpecInfo) -> ValidationResult {
        let mut result = ValidationResult::new(&spec.path);

        let line_count = spec.content.lines().count();

        if line_count > self.options.max_lines {
            result.add_error(
                "length",
                format!(
                    "Spec has {} lines, exceeds maximum of {}. Consider splitting into smaller specs.",
                    line_count, self.options.max_lines
                )
            );
        } else if line_count > self.options.warn_lines {
            result.add_warning(
                "length",
                format!(
                    "Spec has {} lines, approaching maximum of {}. Consider splitting if content grows.",
                    line_count, self.options.max_lines
                )
            );
        }

        result
    }
}

impl Default for LineCountValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SpecFrontmatter, SpecStatus};
    use std::path::PathBuf;

    fn create_test_spec_with_lines(line_count: usize) -> SpecInfo {
        let content = (0..line_count)
            .map(|i| format!("Line {}", i))
            .collect::<Vec<_>>()
            .join("\n");

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
            content,
            file_path: PathBuf::from("specs/test-spec/README.md"),
            is_sub_spec: false,
            parent_spec: None,
        }
    }

    #[test]
    fn test_valid_line_count() {
        let spec = create_test_spec_with_lines(100);
        let validator = LineCountValidator::new();
        let result = validator.validate(&spec);

        assert!(result.is_valid());
        assert!(!result.has_warnings());
    }

    #[test]
    fn test_warning_line_count() {
        let spec = create_test_spec_with_lines(350);
        let validator = LineCountValidator::new();
        let result = validator.validate(&spec);

        assert!(result.is_valid());
        assert!(result.has_warnings());
    }

    #[test]
    fn test_exceeds_max_lines() {
        let spec = create_test_spec_with_lines(500);
        let validator = LineCountValidator::new();
        let result = validator.validate(&spec);

        assert!(!result.is_valid());
        assert!(result.has_errors());
    }
}
