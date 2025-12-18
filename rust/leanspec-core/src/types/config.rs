//! Configuration types for LeanSpec

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Custom field type for frontmatter configuration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CustomFieldType {
    String,
    Number,
    Boolean,
    Array,
}

/// LeanSpec configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeanSpecConfig {
    /// Specs directory (default: "specs")
    #[serde(default = "default_specs_dir")]
    pub specs_dir: PathBuf,
    
    /// Default template name
    #[serde(default)]
    pub default_template: Option<String>,
    
    /// Pattern for spec directories (e.g., "NNN-name")
    #[serde(default)]
    pub pattern: Option<String>,
    
    /// Frontmatter configuration
    #[serde(default)]
    pub frontmatter: FrontmatterConfig,
    
    /// Validation configuration
    #[serde(default)]
    pub validation: ValidationConfig,
}

impl Default for LeanSpecConfig {
    fn default() -> Self {
        Self {
            specs_dir: default_specs_dir(),
            default_template: None,
            pattern: None,
            frontmatter: FrontmatterConfig::default(),
            validation: ValidationConfig::default(),
        }
    }
}

fn default_specs_dir() -> PathBuf {
    PathBuf::from("specs")
}

/// Frontmatter configuration
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FrontmatterConfig {
    /// Custom fields and their types
    #[serde(default)]
    pub custom: HashMap<String, CustomFieldType>,
}

/// Validation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationConfig {
    /// Maximum number of lines (default: 400)
    #[serde(default = "default_max_lines")]
    pub max_lines: usize,
    
    /// Maximum token count (default: 3500)
    #[serde(default = "default_max_tokens")]
    pub max_tokens: usize,
    
    /// Warning token threshold (default: 2000)
    #[serde(default = "default_warn_tokens")]
    pub warn_tokens: usize,
    
    /// Required sections in spec content
    #[serde(default)]
    pub required_sections: Vec<String>,
    
    /// Whether to enforce checklist verification when marking complete (default: true)
    #[serde(default = "default_enforce_completion_checklist")]
    pub enforce_completion_checklist: bool,
    
    /// Whether to allow completion override with --force (default: true)
    #[serde(default = "default_allow_completion_override")]
    pub allow_completion_override: bool,
}

fn default_enforce_completion_checklist() -> bool {
    true
}

fn default_allow_completion_override() -> bool {
    true
}

fn default_max_lines() -> usize {
    400
}

fn default_max_tokens() -> usize {
    3500
}

fn default_warn_tokens() -> usize {
    2000
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            max_lines: default_max_lines(),
            max_tokens: default_max_tokens(),
            warn_tokens: default_warn_tokens(),
            required_sections: Vec::new(),
            enforce_completion_checklist: default_enforce_completion_checklist(),
            allow_completion_override: default_allow_completion_override(),
        }
    }
}

impl LeanSpecConfig {
    /// Load configuration from a YAML file
    pub fn load(path: &std::path::Path) -> Result<Self, ConfigError> {
        let content = std::fs::read_to_string(path).map_err(ConfigError::Io)?;
        serde_yaml::from_str(&content).map_err(ConfigError::Parse)
    }
    
    /// Load configuration from the default location (.lean-spec/config.yaml)
    pub fn load_default() -> Result<Self, ConfigError> {
        let config_path = PathBuf::from(".lean-spec/config.yaml");
        if config_path.exists() {
            Self::load(&config_path)
        } else {
            Ok(Self::default())
        }
    }
}

/// Configuration error types
#[derive(Debug)]
pub enum ConfigError {
    Io(std::io::Error),
    Parse(serde_yaml::Error),
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConfigError::Io(e) => write!(f, "Failed to read config file: {}", e),
            ConfigError::Parse(e) => write!(f, "Failed to parse config file: {}", e),
        }
    }
}

impl std::error::Error for ConfigError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ConfigError::Io(e) => Some(e),
            ConfigError::Parse(e) => Some(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_config() {
        let config = LeanSpecConfig::default();
        assert_eq!(config.specs_dir, PathBuf::from("specs"));
        assert_eq!(config.validation.max_lines, 400);
        assert_eq!(config.validation.max_tokens, 3500);
        assert!(config.validation.enforce_completion_checklist);
        assert!(config.validation.allow_completion_override);
    }
    
    #[test]
    fn test_parse_config() {
        let yaml = r#"
specs_dir: my-specs
default_template: minimal
frontmatter:
  custom:
    milestone: string
    sprint: number
validation:
  max_lines: 500
  max_tokens: 4000
"#;
        let config: LeanSpecConfig = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(config.specs_dir, PathBuf::from("my-specs"));
        assert_eq!(config.default_template, Some("minimal".to_string()));
        assert_eq!(config.validation.max_lines, 500);
    }
    
    #[test]
    fn test_parse_config_with_completion_settings() {
        let yaml = r#"
validation:
  enforce_completion_checklist: false
  allow_completion_override: false
"#;
        let config: LeanSpecConfig = serde_yaml::from_str(yaml).unwrap();
        assert!(!config.validation.enforce_completion_checklist);
        assert!(!config.validation.allow_completion_override);
    }
}
