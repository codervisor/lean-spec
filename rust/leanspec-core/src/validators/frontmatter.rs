//! Frontmatter validation

use crate::types::{SpecInfo, SpecStatus, ValidationResult};

/// Options for frontmatter validation
#[derive(Debug, Clone, Default)]
pub struct FrontmatterOptions {
    /// Additional required fields beyond status and created
    pub required_fields: Vec<String>,

    /// Allowed custom field names
    pub allowed_custom_fields: Vec<String>,

    /// Warn on unknown fields
    pub warn_on_unknown: bool,
}

/// Validator for spec frontmatter
pub struct FrontmatterValidator {
    options: FrontmatterOptions,
}

impl FrontmatterValidator {
    /// Create a new frontmatter validator with default options
    pub fn new() -> Self {
        Self {
            options: FrontmatterOptions::default(),
        }
    }

    /// Create a validator with custom options
    pub fn with_options(options: FrontmatterOptions) -> Self {
        Self { options }
    }

    /// Validate a spec's frontmatter
    pub fn validate(&self, spec: &SpecInfo) -> ValidationResult {
        let mut result = ValidationResult::new(&spec.path);

        // Validate status (required, must be valid enum)
        self.validate_status(spec, &mut result);

        // Validate created date format
        self.validate_created(spec, &mut result);

        // Validate priority if present
        self.validate_priority(spec, &mut result);

        // Validate tags if present
        self.validate_tags(spec, &mut result);

        // Validate depends_on if present
        self.validate_depends_on(spec, &mut result);

        // Check for additional required fields
        self.validate_required_fields(spec, &mut result);

        // Warn on unknown fields if configured
        if self.options.warn_on_unknown {
            self.warn_unknown_fields(spec, &mut result);
        }

        result
    }

    fn validate_status(&self, spec: &SpecInfo, result: &mut ValidationResult) {
        // Status is always valid if parsing succeeded (enum enforced)
        // But we can add warnings for certain patterns
        if spec.frontmatter.status == SpecStatus::InProgress {
            // Check if there's an assignee
            if spec.frontmatter.assignee.is_none() {
                result.add_info("frontmatter", "In-progress spec without assignee");
            }
        }

        if spec.frontmatter.status == SpecStatus::Complete {
            // Check if completed date is set
            if spec.frontmatter.completed.is_none() && spec.frontmatter.completed_at.is_none() {
                result.add_info("frontmatter", "Completed spec without completion date");
            }
        }
    }

    fn validate_created(&self, spec: &SpecInfo, result: &mut ValidationResult) {
        let created = &spec.frontmatter.created;

        // Validate YYYY-MM-DD format
        if created.len() != 10 {
            result.add_error(
                "frontmatter",
                format!(
                    "Invalid created date format: '{}'. Expected YYYY-MM-DD",
                    created
                ),
            );
            return;
        }

        // Try to parse as date
        if chrono::NaiveDate::parse_from_str(created, "%Y-%m-%d").is_err() {
            result.add_error(
                "frontmatter",
                format!("Invalid created date: '{}'. Expected YYYY-MM-DD", created),
            );
        }
    }

    fn validate_priority(&self, spec: &SpecInfo, result: &mut ValidationResult) {
        // Priority is validated by enum if present
        // Add recommendations for certain statuses
        if spec.frontmatter.priority.is_none() && spec.frontmatter.status == SpecStatus::Planned {
            result.add_info(
                "frontmatter",
                "Planned spec without priority. Consider adding priority for planning.",
            );
        }
    }

    fn validate_tags(&self, spec: &SpecInfo, result: &mut ValidationResult) {
        // Check for empty tag strings
        for tag in &spec.frontmatter.tags {
            if tag.trim().is_empty() {
                result.add_warning("frontmatter", "Empty tag found in tags array");
            }

            // Warn on tags with spaces (should use kebab-case)
            if tag.contains(' ') {
                result.add_warning(
                    "frontmatter",
                    format!("Tag '{}' contains spaces. Consider using kebab-case.", tag),
                );
            }
        }
    }

    fn validate_depends_on(&self, spec: &SpecInfo, result: &mut ValidationResult) {
        for dep in &spec.frontmatter.depends_on {
            if dep.trim().is_empty() {
                result.add_error("frontmatter", "Empty dependency reference in depends_on");
            }

            // Self-dependency check
            if dep == &spec.path {
                result.add_error("frontmatter", "Spec cannot depend on itself");
            }
        }
    }

    fn validate_required_fields(&self, spec: &SpecInfo, result: &mut ValidationResult) {
        for field in &self.options.required_fields {
            let has_field = match field.as_str() {
                "priority" => spec.frontmatter.priority.is_some(),
                "tags" => !spec.frontmatter.tags.is_empty(),
                "assignee" => spec.frontmatter.assignee.is_some(),
                "reviewer" => spec.frontmatter.reviewer.is_some(),
                "due" => spec.frontmatter.due.is_some(),
                _ => spec.frontmatter.custom.contains_key(field),
            };

            if !has_field {
                result.add_error("frontmatter", format!("Missing required field: {}", field));
            }
        }
    }

    fn warn_unknown_fields(&self, spec: &SpecInfo, result: &mut ValidationResult) {
        let known_fields = [
            "status",
            "created",
            "priority",
            "tags",
            "depends_on",
            "parent",
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

        for field_name in spec.frontmatter.custom.keys() {
            if !known_fields.contains(&field_name.as_str())
                && !self.options.allowed_custom_fields.contains(field_name)
            {
                result.add_info(
                    "frontmatter",
                    format!("Unknown custom field: {}", field_name),
                );
            }
        }
    }
}

impl Default for FrontmatterValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::SpecFrontmatter;
    use std::path::PathBuf;

    fn create_test_spec(status: SpecStatus, created: &str) -> SpecInfo {
        SpecInfo {
            path: "test-spec".to_string(),
            title: "Test Spec".to_string(),
            frontmatter: SpecFrontmatter {
                status,
                created: created.to_string(),
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
            content: "# Test\n\nContent".to_string(),
            file_path: PathBuf::from("specs/test-spec/README.md"),
            is_sub_spec: false,
            parent_spec: None,
        }
    }

    #[test]
    fn test_valid_frontmatter() {
        let spec = create_test_spec(SpecStatus::Planned, "2025-01-01");
        let validator = FrontmatterValidator::new();
        let result = validator.validate(&spec);

        assert!(result.is_valid());
    }

    #[test]
    fn test_invalid_date_format() {
        let spec = create_test_spec(SpecStatus::Planned, "01-01-2025");
        let validator = FrontmatterValidator::new();
        let result = validator.validate(&spec);

        assert!(!result.is_valid());
        assert!(result
            .errors()
            .any(|e| e.message.contains("Invalid created date")));
    }

    #[test]
    fn test_self_dependency() {
        let mut spec = create_test_spec(SpecStatus::Planned, "2025-01-01");
        spec.frontmatter.depends_on = vec!["test-spec".to_string()];

        let validator = FrontmatterValidator::new();
        let result = validator.validate(&spec);

        assert!(!result.is_valid());
        assert!(result
            .errors()
            .any(|e| e.message.contains("cannot depend on itself")));
    }
}
