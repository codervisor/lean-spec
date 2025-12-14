//! Validation types and results



/// Severity of a validation issue
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum IssueSeverity {
    Info,
    Warning,
    Error,
}

impl std::fmt::Display for IssueSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IssueSeverity::Info => write!(f, "info"),
            IssueSeverity::Warning => write!(f, "warning"),
            IssueSeverity::Error => write!(f, "error"),
        }
    }
}

/// A validation issue found in a spec
#[derive(Debug, Clone)]
pub struct ValidationIssue {
    /// Severity of the issue
    pub severity: IssueSeverity,
    
    /// Description of the issue
    pub message: String,
    
    /// Line number where the issue was found (if applicable)
    pub line: Option<usize>,
    
    /// Category of the issue (e.g., "frontmatter", "structure", "content")
    pub category: String,
    
    /// Suggestion for fixing the issue
    pub suggestion: Option<String>,
}

impl std::fmt::Display for ValidationIssue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let severity_icon = match self.severity {
            IssueSeverity::Info => "ℹ️",
            IssueSeverity::Warning => "⚠️",
            IssueSeverity::Error => "❌",
        };
        
        if let Some(line) = self.line {
            write!(f, "{} [{}:{}] {}", severity_icon, self.category, line, self.message)
        } else {
            write!(f, "{} [{}] {}", severity_icon, self.category, self.message)
        }
    }
}

/// Result of validating a spec
#[derive(Debug, Clone)]
pub struct ValidationResult {
    /// Path of the spec that was validated
    pub spec_path: String,
    
    /// List of issues found
    pub issues: Vec<ValidationIssue>,
}

impl ValidationResult {
    /// Create a new validation result for a spec
    pub fn new(spec_path: impl Into<String>) -> Self {
        Self {
            spec_path: spec_path.into(),
            issues: Vec::new(),
        }
    }
    
    /// Add an issue to the result
    pub fn add_issue(&mut self, issue: ValidationIssue) {
        self.issues.push(issue);
    }
    
    /// Add an error issue
    pub fn add_error(&mut self, category: impl Into<String>, message: impl Into<String>) {
        self.issues.push(ValidationIssue {
            severity: IssueSeverity::Error,
            message: message.into(),
            line: None,
            category: category.into(),
            suggestion: None,
        });
    }
    
    /// Add a warning issue
    pub fn add_warning(&mut self, category: impl Into<String>, message: impl Into<String>) {
        self.issues.push(ValidationIssue {
            severity: IssueSeverity::Warning,
            message: message.into(),
            line: None,
            category: category.into(),
            suggestion: None,
        });
    }
    
    /// Add an info issue
    pub fn add_info(&mut self, category: impl Into<String>, message: impl Into<String>) {
        self.issues.push(ValidationIssue {
            severity: IssueSeverity::Info,
            message: message.into(),
            line: None,
            category: category.into(),
            suggestion: None,
        });
    }
    
    /// Check if validation passed (no errors)
    pub fn is_valid(&self) -> bool {
        !self.has_errors()
    }
    
    /// Check if there are any errors
    pub fn has_errors(&self) -> bool {
        self.issues.iter().any(|i| i.severity == IssueSeverity::Error)
    }
    
    /// Check if there are any warnings
    pub fn has_warnings(&self) -> bool {
        self.issues.iter().any(|i| i.severity == IssueSeverity::Warning)
    }
    
    /// Get only error issues
    pub fn errors(&self) -> impl Iterator<Item = &ValidationIssue> {
        self.issues.iter().filter(|i| i.severity == IssueSeverity::Error)
    }
    
    /// Get only warning issues
    pub fn warnings(&self) -> impl Iterator<Item = &ValidationIssue> {
        self.issues.iter().filter(|i| i.severity == IssueSeverity::Warning)
    }
    
    /// Merge another validation result into this one
    pub fn merge(&mut self, other: ValidationResult) {
        self.issues.extend(other.issues);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validation_result() {
        let mut result = ValidationResult::new("test-spec");
        assert!(result.is_valid());
        
        result.add_warning("test", "This is a warning");
        assert!(result.is_valid());
        assert!(result.has_warnings());
        
        result.add_error("test", "This is an error");
        assert!(!result.is_valid());
        assert!(result.has_errors());
    }
    
    #[test]
    fn test_issue_display() {
        let issue = ValidationIssue {
            severity: IssueSeverity::Error,
            message: "Missing required field".to_string(),
            line: Some(5),
            category: "frontmatter".to_string(),
            suggestion: None,
        };
        
        let display = format!("{}", issue);
        assert!(display.contains("frontmatter"));
        assert!(display.contains("Missing required field"));
    }
}
