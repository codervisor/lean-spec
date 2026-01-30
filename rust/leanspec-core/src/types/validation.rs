//! Validation types and results

use serde::{Deserialize, Serialize};

/// A checkbox item extracted from spec content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckboxItem {
    /// Line number where the checkbox appears (1-indexed)
    pub line: usize,
    /// The text content of the checkbox item
    pub text: String,
    /// The section header this checkbox belongs to (e.g., "Plan", "Test")
    pub section: Option<String>,
    /// Whether the checkbox is checked
    pub checked: bool,
}

/// Progress tracking for checkbox completion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Progress {
    /// Number of completed (checked) items
    pub completed: usize,
    /// Total number of checkbox items
    pub total: usize,
    /// Completion percentage (0-100)
    pub percentage: f64,
}

impl Progress {
    /// Calculate progress from a list of checkboxes
    pub fn calculate(checkboxes: &[CheckboxItem]) -> Self {
        let total = checkboxes.len();
        let completed = checkboxes.iter().filter(|cb| cb.checked).count();
        let percentage = if total > 0 {
            (completed as f64 / total as f64) * 100.0
        } else {
            100.0
        };
        Self {
            completed,
            total,
            percentage,
        }
    }
}

impl std::fmt::Display for Progress {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}/{} items complete ({:.0}%)",
            self.completed, self.total, self.percentage
        )
    }
}

/// Result of completion verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionVerificationResult {
    /// Whether the spec can be marked as complete
    pub is_complete: bool,
    /// Outstanding (unchecked) checkbox items
    pub outstanding: Vec<CheckboxItem>,
    /// Progress metrics
    pub progress: Progress,
    /// Actionable suggestions for the agent
    pub suggestions: Vec<String>,
}

impl CompletionVerificationResult {
    /// Create a result indicating successful completion (no outstanding items)
    pub fn success() -> Self {
        Self {
            is_complete: true,
            outstanding: Vec::new(),
            progress: Progress {
                completed: 0,
                total: 0,
                percentage: 100.0,
            },
            suggestions: Vec::new(),
        }
    }
}

/// Errors that can occur during completion verification
#[derive(Debug, Clone)]
pub enum VerificationError {
    /// Failed to read the spec file
    FileNotFound(String),
    /// Failed to parse the spec content
    ParseError(String),
    /// IO error occurred
    IoError(String),
}

/// Summary of an incomplete child spec
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncompleteChildSpec {
    /// Path of the child spec
    pub path: String,
    /// Title of the child spec
    pub title: String,
    /// Current status of the child spec
    pub status: String,
}

/// Result of umbrella completion verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UmbrellaVerificationResult {
    /// Whether the umbrella spec can be marked as complete
    pub is_complete: bool,
    /// List of incomplete child specs
    pub incomplete_children: Vec<IncompleteChildSpec>,
    /// Progress metrics for children
    pub progress: Progress,
    /// Actionable suggestions for the agent
    pub suggestions: Vec<String>,
}

impl UmbrellaVerificationResult {
    /// Create a result indicating successful completion (all children complete)
    pub fn success() -> Self {
        Self {
            is_complete: true,
            incomplete_children: Vec::new(),
            progress: Progress {
                completed: 0,
                total: 0,
                percentage: 100.0,
            },
            suggestions: Vec::new(),
        }
    }

    /// Create a result indicating the spec has no children (not an umbrella)
    pub fn not_umbrella() -> Self {
        Self {
            is_complete: true,
            incomplete_children: Vec::new(),
            progress: Progress {
                completed: 0,
                total: 0,
                percentage: 100.0,
            },
            suggestions: Vec::new(),
        }
    }
}

impl std::fmt::Display for VerificationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VerificationError::FileNotFound(path) => {
                write!(f, "Spec file not found: {}", path)
            }
            VerificationError::ParseError(msg) => {
                write!(f, "Failed to parse spec: {}", msg)
            }
            VerificationError::IoError(msg) => {
                write!(f, "IO error: {}", msg)
            }
        }
    }
}

impl std::error::Error for VerificationError {}

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
            write!(
                f,
                "{} [{}:{}] {}",
                severity_icon, self.category, line, self.message
            )
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
        self.issues
            .iter()
            .any(|i| i.severity == IssueSeverity::Error)
    }

    /// Check if there are any warnings
    pub fn has_warnings(&self) -> bool {
        self.issues
            .iter()
            .any(|i| i.severity == IssueSeverity::Warning)
    }

    /// Get only error issues
    pub fn errors(&self) -> impl Iterator<Item = &ValidationIssue> {
        self.issues
            .iter()
            .filter(|i| i.severity == IssueSeverity::Error)
    }

    /// Get only warning issues
    pub fn warnings(&self) -> impl Iterator<Item = &ValidationIssue> {
        self.issues
            .iter()
            .filter(|i| i.severity == IssueSeverity::Warning)
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
