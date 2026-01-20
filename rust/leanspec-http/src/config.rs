//! Configuration for the HTTP server
//!
//! Loads configuration from `~/.lean-spec/config.json`

use crate::error::ServerError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Server configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ServerConfig {
    /// Server-specific configuration
    #[serde(default)]
    pub server: ServerSettings,

    /// UI preferences
    #[serde(default)]
    pub ui: UiSettings,

    /// Project management settings
    #[serde(default)]
    pub projects: ProjectSettings,

    /// Cloud sync settings
    #[serde(default)]
    pub sync: SyncSettings,

    /// Security settings
    #[serde(default)]
    pub security: SecuritySettings,
}

/// Server-specific settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerSettings {
    /// Host to bind to (default: 127.0.0.1)
    #[serde(default = "default_host")]
    pub host: String,

    /// Port to listen on (default: 3000)
    #[serde(default = "default_port")]
    pub port: u16,

    /// Auto-open browser on start
    #[serde(default = "default_open_browser")]
    pub open_browser: bool,

    /// Browser preference (optional)
    #[serde(default)]
    pub browser: Option<String>,

    /// UI dist directory override
    #[serde(default)]
    pub ui_dist: Option<PathBuf>,

    /// CORS configuration
    #[serde(default)]
    pub cors: CorsSettings,
}

impl Default for ServerSettings {
    fn default() -> Self {
        Self {
            host: default_host(),
            port: default_port(),
            open_browser: default_open_browser(),
            browser: None,
            ui_dist: None,
            cors: CorsSettings::default(),
        }
    }
}

fn default_host() -> String {
    "127.0.0.1".to_string()
}

fn default_port() -> u16 {
    3000
}

fn default_open_browser() -> bool {
    true
}

/// CORS settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CorsSettings {
    /// Enable CORS (default: false)
    #[serde(default = "default_cors_enabled")]
    pub enabled: bool,

    /// Allowed origins (default: localhost development ports)
    #[serde(default = "default_cors_origins")]
    pub origins: Vec<String>,
}

impl Default for CorsSettings {
    fn default() -> Self {
        Self {
            enabled: default_cors_enabled(),
            origins: default_cors_origins(),
        }
    }
}

fn default_cors_enabled() -> bool {
    false
}

fn default_cors_origins() -> Vec<String> {
    // Allow all origins by default for development convenience
    // In production, you should specify explicit origins
    vec![]
}

/// UI preferences
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiSettings {
    /// Theme (auto, light, dark)
    #[serde(default = "default_theme")]
    pub theme: String,

    /// Locale (en, zh-CN)
    #[serde(default = "default_locale")]
    pub locale: String,

    /// Compact mode
    #[serde(default)]
    pub compact_mode: bool,
}

impl Default for UiSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            locale: default_locale(),
            compact_mode: false,
        }
    }
}

fn default_theme() -> String {
    "auto".to_string()
}

fn default_locale() -> String {
    "en".to_string()
}

/// Project management settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSettings {
    /// Auto-discover projects in common locations
    #[serde(default = "default_auto_discover")]
    pub auto_discover: bool,

    /// Maximum number of recent projects to track
    #[serde(default = "default_max_recent")]
    pub max_recent: usize,
}

/// Cloud sync settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSettings {
    /// Optional API key for headless/CI authentication
    #[serde(default)]
    pub api_key: Option<String>,

    /// Device flow verification URL override
    #[serde(default = "default_verification_url")]
    pub verification_url: String,

    /// Device code expiry in seconds
    #[serde(default = "default_device_code_ttl")]
    pub device_code_ttl_seconds: u64,

    /// Access token expiry in seconds (0 = never)
    #[serde(default = "default_token_ttl")]
    pub token_ttl_seconds: u64,
}

/// Security settings
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SecuritySettings {
    /// Read-only mode (prevent modifications)
    #[serde(default)]
    pub readonly: bool,
}

impl Default for SyncSettings {
    fn default() -> Self {
        Self {
            api_key: None,
            verification_url: default_verification_url(),
            device_code_ttl_seconds: default_device_code_ttl(),
            token_ttl_seconds: default_token_ttl(),
        }
    }
}

fn default_verification_url() -> String {
    "https://app.lean-spec.dev/device".to_string()
}

fn default_device_code_ttl() -> u64 {
    900
}

fn default_token_ttl() -> u64 {
    86400
}

impl Default for ProjectSettings {
    fn default() -> Self {
        Self {
            auto_discover: default_auto_discover(),
            max_recent: default_max_recent(),
        }
    }
}

fn default_auto_discover() -> bool {
    true
}

fn default_max_recent() -> usize {
    10
}

/// Get the LeanSpec config directory path
pub fn config_dir() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".lean-spec"))
        .unwrap_or_else(|| PathBuf::from(".lean-spec"))
}

/// Get the path to the config file
pub fn config_path() -> PathBuf {
    config_dir().join("config.json")
}

/// Get the path to the projects registry file
pub fn projects_path() -> PathBuf {
    config_dir().join("projects.json")
}

/// Load configuration from disk or return defaults
pub fn load_config() -> Result<ServerConfig, ServerError> {
    let path = config_path();

    load_config_from_path(&path)
}

/// Load configuration from a custom path
pub fn load_config_from_path(path: &PathBuf) -> Result<ServerConfig, ServerError> {
    if !path.exists() {
        // Try to migrate from YAML config
        let yaml_path = config_dir().join("config.yaml");
        if yaml_path.exists() {
            return migrate_yaml_config(&yaml_path);
        }

        // Return defaults
        return Ok(ServerConfig::default());
    }

    let content = fs::read_to_string(path)
        .map_err(|e| ServerError::ConfigError(format!("Failed to read config: {}", e)))?;

    serde_json::from_str(&content)
        .map_err(|e| ServerError::ConfigError(format!("Failed to parse config: {}", e)))
}

/// Migrate from YAML config to JSON
/// Note: This performs best-effort migration. Unknown YAML fields are ignored
/// and defaults are used. The primary goal is to create a valid JSON config file.
fn migrate_yaml_config(yaml_path: &PathBuf) -> Result<ServerConfig, ServerError> {
    let content = fs::read_to_string(yaml_path)
        .map_err(|e| ServerError::ConfigError(format!("Failed to read YAML config: {}", e)))?;

    // Try to parse YAML directly into our config struct
    // This handles fields that match between YAML and JSON formats
    let config = serde_yaml::from_str::<ServerConfig>(&content).unwrap_or_else(|e| {
        tracing::warn!("Could not fully parse YAML config, using defaults: {}", e);
        ServerConfig::default()
    });

    // Save as JSON for future use
    if let Err(e) = save_config(&config) {
        tracing::warn!("Failed to save migrated config: {}", e);
    }

    Ok(config)
}

/// Save configuration to disk
pub fn save_config(config: &ServerConfig) -> Result<(), ServerError> {
    let path = config_path();

    // Ensure directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| ServerError::ConfigError(format!("Failed to create config dir: {}", e)))?;
    }

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| ServerError::ConfigError(format!("Failed to serialize config: {}", e)))?;

    fs::write(&path, content)
        .map_err(|e| ServerError::ConfigError(format!("Failed to write config: {}", e)))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = ServerConfig::default();
        assert_eq!(config.server.host, "127.0.0.1");
        assert_eq!(config.server.port, 3000);
        assert!(!config.server.cors.enabled);
        assert_eq!(config.ui.theme, "auto");
        assert_eq!(config.projects.max_recent, 10);
    }

    #[test]
    fn test_config_serialization() {
        let config = ServerConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let parsed: ServerConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.server.port, config.server.port);
    }
}
