//! Token count validation for specs

use crate::types::{SpecInfo, ValidationResult};
use crate::utils::global_token_counter;

/// Options for token count validation
#[derive(Debug, Clone)]
pub struct TokenCountOptions {
    /// Maximum number of tokens (default: 5000)
    pub max_tokens: usize,

    /// Warning threshold for tokens (default: 3500)
    pub warn_tokens: usize,
}

impl Default for TokenCountOptions {
    fn default() -> Self {
        Self {
            max_tokens: 5000,
            warn_tokens: 3500,
        }
    }
}

/// Validator for spec token count
pub struct TokenCountValidator {
    options: TokenCountOptions,
}

impl TokenCountValidator {
    /// Create a new token count validator with default options
    pub fn new() -> Self {
        Self {
            options: TokenCountOptions::default(),
        }
    }

    /// Create a validator with custom options
    pub fn with_options(options: TokenCountOptions) -> Self {
        Self { options }
    }

    /// Validate a spec's token count
    pub fn validate(&self, spec: &SpecInfo) -> ValidationResult {
        let mut result = ValidationResult::new(&spec.path);

        let counter = global_token_counter();
        let token_count = counter.count(&spec.content);

        if token_count > self.options.max_tokens {
            result.add_error(
                "length",
                format!(
                    "Spec has {} tokens, exceeds maximum of {}. Consider splitting into smaller specs.",
                    token_count, self.options.max_tokens
                )
            );
        } else if token_count > self.options.warn_tokens {
            result.add_warning(
                "length",
                format!(
                    "Spec has {} tokens, approaching maximum of {}. Consider splitting if content grows.",
                    token_count, self.options.max_tokens
                )
            );
        }

        result
    }
}

impl Default for TokenCountValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SpecFrontmatter, SpecStatus};
    use std::path::PathBuf;

    fn create_test_spec_with_content(content: &str) -> SpecInfo {
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
    fn test_valid_token_count() {
        // Small content should have few tokens
        let spec = create_test_spec_with_content("This is a short spec.");
        let validator = TokenCountValidator::new();
        let result = validator.validate(&spec);

        assert!(result.is_valid());
        assert!(!result.has_warnings());
    }

    #[test]
    fn test_warning_token_count() {
        // Create content with tokens in warning range
        // Use custom validator with lower thresholds for reliable testing
        let word = "specification ";
        let content = word.repeat(2000);
        let spec = create_test_spec_with_content(&content);

        // Use custom options: warn at 1000 tokens, max at 10000
        let validator = TokenCountValidator::with_options(TokenCountOptions {
            max_tokens: 10000,
            warn_tokens: 1000,
        });
        let result = validator.validate(&spec);

        // Should be valid (not exceeding max) but have warnings (exceeding warn threshold)
        assert!(result.is_valid(), "Expected is_valid() but got errors");
        assert!(
            result.has_warnings(),
            "Expected warnings for content above threshold"
        );
    }

    #[test]
    fn test_exceeds_max_tokens() {
        // Create content with >5000 tokens
        let word = "specification ";
        let content = word.repeat(5000);
        let spec = create_test_spec_with_content(&content);
        let validator = TokenCountValidator::new();
        let result = validator.validate(&spec);

        assert!(!result.is_valid());
        assert!(result.has_errors());
    }
}
