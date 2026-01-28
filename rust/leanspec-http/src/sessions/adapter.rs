//! Session Tool Adapters
//!
//! Provides adapters for triggering and managing AI coding tools.
//! Each adapter handles tool-specific logic for spawning processes,
//! environment setup, and validation.

use crate::sessions::types::SessionConfig;
use crate::ServerError;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

/// Core trait for all tool adapters
#[async_trait::async_trait]
pub trait ToolAdapter: Send + Sync {
    /// Tool name (claude, copilot, codex, opencode)
    fn name(&self) -> &str;

    /// Check if the tool is available and properly configured
    async fn validate_environment(&self) -> Result<(), ServerError>;

    /// Build the command for running a session
    fn build_command(&self, config: &SessionConfig) -> Result<Command, ServerError>;

    /// Check if tool supports PTY/interactive mode
    fn supports_pty(&self) -> bool;

    /// Get tool version
    async fn get_version(&self) -> Result<String, ServerError>;
}

/// Tool manager - registry of all adapters
pub struct ToolManager {
    adapters: Vec<Box<dyn ToolAdapter>>,
}

impl ToolManager {
    /// Create a new tool manager with all available adapters
    pub fn new() -> Self {
        let adapters: Vec<Box<dyn ToolAdapter>> = vec![
            Box::new(ClaudeAdapter::new()),
            Box::new(CopilotAdapter::new()),
            Box::new(CodexAdapter::new()),
            Box::new(OpenCodeAdapter::new()),
        ];
        Self { adapters }
    }

    /// Get an adapter by name
    pub fn get(&self, name: &str) -> Option<&dyn ToolAdapter> {
        self.adapters
            .iter()
            .find(|a| a.name() == name)
            .map(|a| a.as_ref())
    }

    /// List all available adapters
    pub fn list(&self) -> Vec<&dyn ToolAdapter> {
        self.adapters.iter().map(|a| a.as_ref()).collect()
    }

    /// List available tools (those with valid environments)
    pub async fn list_available(&self) -> Vec<&dyn ToolAdapter> {
        let mut available = Vec::new();
        for adapter in &self.adapters {
            if adapter.validate_environment().await.is_ok() {
                available.push(adapter.as_ref());
            }
        }
        available
    }
}

impl Default for ToolManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Claude Code adapter
pub struct ClaudeAdapter {
    binary_path: Option<PathBuf>,
}

impl ClaudeAdapter {
    pub fn new() -> Self {
        Self {
            binary_path: which::which("claude").ok(),
        }
    }

    fn find_binary(&self) -> Option<&PathBuf> {
        self.binary_path.as_ref()
    }
}

#[async_trait::async_trait]
impl ToolAdapter for ClaudeAdapter {
    fn name(&self) -> &str {
        "claude"
    }

    async fn validate_environment(&self) -> Result<(), ServerError> {
        if self.find_binary().is_none() {
            return Err(ServerError::ToolNotFound(
                "claude".to_string(),
                "Claude Code not found. Install with: npm install -g @anthropic-ai/claude-code"
                    .to_string(),
            ));
        }

        // Check API key
        if std::env::var("ANTHROPIC_API_KEY").is_err() {
            return Err(ServerError::ConfigError(
                "ANTHROPIC_API_KEY not set".to_string(),
            ));
        }

        Ok(())
    }

    fn build_command(&self, config: &SessionConfig) -> Result<Command, ServerError> {
        let binary = self.find_binary().ok_or_else(|| {
            ServerError::ToolNotFound("claude".to_string(), "Not found".to_string())
        })?;

        let mut cmd = Command::new(binary);

        // Add spec argument if provided
        if let Some(spec_id) = &config.spec_id {
            cmd.arg("--spec").arg(spec_id);
        }

        // Add working directory
        if let Some(working_dir) = &config.working_dir {
            cmd.current_dir(working_dir);
        }

        // Add environment variables
        for (key, value) in &config.env_vars {
            cmd.env(key, value);
        }

        // Add tool-specific arguments
        cmd.args(&config.tool_args);

        // Set up stdio
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        Ok(cmd)
    }

    fn supports_pty(&self) -> bool {
        true
    }

    async fn get_version(&self) -> Result<String, ServerError> {
        if let Some(binary) = self.find_binary() {
            let output = Command::new(binary)
                .arg("--version")
                .output()
                .await
                .map_err(|e| ServerError::ToolError(format!("Failed to get version: {}", e)))?;

            let version = String::from_utf8_lossy(&output.stdout);
            Ok(version.trim().to_string())
        } else {
            Err(ServerError::ToolNotFound(
                "claude".to_string(),
                "Not found".to_string(),
            ))
        }
    }
}

/// GitHub Copilot adapter
pub struct CopilotAdapter {
    gh_binary: Option<PathBuf>,
}

impl CopilotAdapter {
    pub fn new() -> Self {
        Self {
            gh_binary: which::which("gh").ok(),
        }
    }

    fn find_binary(&self) -> Option<&PathBuf> {
        self.gh_binary.as_ref()
    }

    async fn check_copilot_extension(&self) -> Result<bool, ServerError> {
        if let Some(gh) = self.find_binary() {
            let output = Command::new(gh)
                .args(&["extension", "list"])
                .output()
                .await
                .map_err(|e| {
                    ServerError::ToolError(format!("Failed to check extensions: {}", e))
                })?;

            let output_str = String::from_utf8_lossy(&output.stdout);
            Ok(output_str.contains("copilot"))
        } else {
            Ok(false)
        }
    }
}

#[async_trait::async_trait]
impl ToolAdapter for CopilotAdapter {
    fn name(&self) -> &str {
        "copilot"
    }

    async fn validate_environment(&self) -> Result<(), ServerError> {
        if self.find_binary().is_none() {
            return Err(ServerError::ToolNotFound(
                "gh".to_string(),
                "GitHub CLI not found. Install from: https://cli.github.com".to_string(),
            ));
        }

        if !self.check_copilot_extension().await? {
            return Err(ServerError::ToolNotFound(
                "copilot".to_string(),
                "GitHub Copilot extension not installed. Run: gh extension install github/copilot"
                    .to_string(),
            ));
        }

        // Check authentication
        let gh = self.find_binary().unwrap();
        let output = Command::new(gh)
            .args(&["auth", "status"])
            .output()
            .await
            .map_err(|e| ServerError::ToolError(format!("Failed to check auth: {}", e)))?;

        if !output.status.success() {
            return Err(ServerError::ConfigError(
                "Not authenticated with GitHub. Run: gh auth login".to_string(),
            ));
        }

        Ok(())
    }

    fn build_command(&self, config: &SessionConfig) -> Result<Command, ServerError> {
        let binary = self
            .find_binary()
            .ok_or_else(|| ServerError::ToolNotFound("gh".to_string(), "Not found".to_string()))?;

        let mut cmd = Command::new(binary);
        cmd.arg("copilot").arg("suggest");

        // Add spec context if provided
        if let Some(spec_id) = &config.spec_id {
            cmd.arg("--description")
                .arg(format!("Implement spec: {}", spec_id));
        }

        // Add working directory
        if let Some(working_dir) = &config.working_dir {
            cmd.current_dir(working_dir);
        }

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        Ok(cmd)
    }

    fn supports_pty(&self) -> bool {
        false // Copilot suggest is non-interactive
    }

    async fn get_version(&self) -> Result<String, ServerError> {
        if let Some(binary) = self.find_binary() {
            let output = Command::new(binary)
                .arg("--version")
                .output()
                .await
                .map_err(|e| ServerError::ToolError(format!("Failed to get version: {}", e)))?;

            let version = String::from_utf8_lossy(&output.stdout);
            Ok(format!("gh {}", version.trim()))
        } else {
            Err(ServerError::ToolNotFound(
                "gh".to_string(),
                "Not found".to_string(),
            ))
        }
    }
}

/// Codex CLI adapter
pub struct CodexAdapter {
    binary_path: Option<PathBuf>,
}

impl CodexAdapter {
    pub fn new() -> Self {
        Self {
            binary_path: which::which("codex").ok(),
        }
    }

    fn find_binary(&self) -> Option<&PathBuf> {
        self.binary_path.as_ref()
    }
}

#[async_trait::async_trait]
impl ToolAdapter for CodexAdapter {
    fn name(&self) -> &str {
        "codex"
    }

    async fn validate_environment(&self) -> Result<(), ServerError> {
        if self.find_binary().is_none() {
            return Err(ServerError::ToolNotFound(
                "codex".to_string(),
                "Codex CLI not found. Install from: https://github.com/microsoft/codex-cli"
                    .to_string(),
            ));
        }

        // Check OpenAI API key
        if std::env::var("OPENAI_API_KEY").is_err() {
            return Err(ServerError::ConfigError(
                "OPENAI_API_KEY not set".to_string(),
            ));
        }

        Ok(())
    }

    fn build_command(&self, config: &SessionConfig) -> Result<Command, ServerError> {
        let binary = self.find_binary().ok_or_else(|| {
            ServerError::ToolNotFound("codex".to_string(), "Not found".to_string())
        })?;

        let mut cmd = Command::new(binary);

        if let Some(spec_id) = &config.spec_id {
            cmd.arg("--prompt")
                .arg(format!("Implement spec: {}", spec_id));
        }

        if let Some(working_dir) = &config.working_dir {
            cmd.current_dir(working_dir);
        }

        cmd.args(&config.tool_args);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        Ok(cmd)
    }

    fn supports_pty(&self) -> bool {
        true
    }

    async fn get_version(&self) -> Result<String, ServerError> {
        if let Some(binary) = self.find_binary() {
            let output = Command::new(binary)
                .arg("--version")
                .output()
                .await
                .map_err(|e| ServerError::ToolError(format!("Failed to get version: {}", e)))?;

            let version = String::from_utf8_lossy(&output.stdout);
            Ok(version.trim().to_string())
        } else {
            Err(ServerError::ToolNotFound(
                "codex".to_string(),
                "Not found".to_string(),
            ))
        }
    }
}

/// OpenCode adapter
pub struct OpenCodeAdapter {
    binary_path: Option<PathBuf>,
}

impl OpenCodeAdapter {
    pub fn new() -> Self {
        Self {
            binary_path: which::which("opencode").ok(),
        }
    }

    fn find_binary(&self) -> Option<&PathBuf> {
        self.binary_path.as_ref()
    }
}

#[async_trait::async_trait]
impl ToolAdapter for OpenCodeAdapter {
    fn name(&self) -> &str {
        "opencode"
    }

    async fn validate_environment(&self) -> Result<(), ServerError> {
        if self.find_binary().is_none() {
            return Err(ServerError::ToolNotFound(
                "opencode".to_string(),
                "OpenCode not found. Install from: https://opencode.ai".to_string(),
            ));
        }
        Ok(())
    }

    fn build_command(&self, config: &SessionConfig) -> Result<Command, ServerError> {
        let binary = self.find_binary().ok_or_else(|| {
            ServerError::ToolNotFound("opencode".to_string(), "Not found".to_string())
        })?;

        let mut cmd = Command::new(binary);

        if let Some(spec_id) = &config.spec_id {
            cmd.arg("--context").arg(spec_id);
        }

        if let Some(working_dir) = &config.working_dir {
            cmd.current_dir(working_dir);
        }

        cmd.args(&config.tool_args);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        Ok(cmd)
    }

    fn supports_pty(&self) -> bool {
        true
    }

    async fn get_version(&self) -> Result<String, ServerError> {
        if let Some(binary) = self.find_binary() {
            let output = Command::new(binary)
                .arg("--version")
                .output()
                .await
                .map_err(|e| ServerError::ToolError(format!("Failed to get version: {}", e)))?;

            let version = String::from_utf8_lossy(&output.stdout);
            Ok(version.trim().to_string())
        } else {
            Err(ServerError::ToolNotFound(
                "opencode".to_string(),
                "Not found".to_string(),
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_tool_manager() {
        let manager = ToolManager::new();

        // Should have all adapters registered
        let adapters = manager.list();
        assert_eq!(adapters.len(), 4);

        // Should find claude adapter
        let claude = manager.get("claude");
        assert!(claude.is_some());
        assert_eq!(claude.unwrap().name(), "claude");

        // Should not find unknown adapter
        let unknown = manager.get("unknown");
        assert!(unknown.is_none());
    }

    #[test]
    fn test_claude_adapter_name() {
        let adapter = ClaudeAdapter::new();
        assert_eq!(adapter.name(), "claude");
    }

    #[test]
    fn test_copilot_adapter_name() {
        let adapter = CopilotAdapter::new();
        assert_eq!(adapter.name(), "copilot");
    }

    #[test]
    fn test_codex_adapter_name() {
        let adapter = CodexAdapter::new();
        assert_eq!(adapter.name(), "codex");
    }

    #[test]
    fn test_opencode_adapter_name() {
        let adapter = OpenCodeAdapter::new();
        assert_eq!(adapter.name(), "opencode");
    }
}
