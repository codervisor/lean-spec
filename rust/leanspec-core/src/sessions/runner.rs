//! Session Runner Registry
//!
//! Provides configurable runner definitions loaded from built-in defaults
//! and optional runners.json files.

#![cfg(feature = "sessions")]

use crate::error::{CoreError, CoreResult};
use crate::sessions::types::SessionConfig;
use crate::storage::config::config_dir;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;
use ts_rs::TS;

pub const RUNNERS_SCHEMA_URL: &str = "https://leanspec.dev/schemas/runners.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RunnerConfig {
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
    pub model: Option<String>,
    /// models.dev provider IDs whose models this runner can use.
    pub model_providers: Option<Vec<String>>,
    #[serde(default)]
    pub detection: Option<DetectionConfig>,
    #[serde(default)]
    pub symlink_file: Option<String>,
    /// Flag used to pass the session prompt to this runner (e.g. "--print" for
    /// claude, "--message" for aider). When `None` the prompt is appended as a
    /// positional argument. When the runner has no prompt support, set
    /// `prompt_flag` to `"-"` to suppress prompt injection entirely.
    #[serde(default)]
    pub prompt_flag: Option<String>,
    /// Optional execution protocol override. Defaults to shell when omitted.
    #[serde(default)]
    pub protocol: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RunnersFile {
    #[serde(rename = "$schema")]
    pub schema: Option<String>,
    #[serde(default)]
    pub runners: HashMap<String, RunnerConfig>,
    pub default: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct RunnerDefinition {
    pub id: String,
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub model: Option<String>,
    /// models.dev provider IDs whose models this runner can use.
    /// Models are resolved dynamically from the registry.
    pub model_providers: Option<Vec<String>>,
    pub detection: Option<DetectionConfig>,
    pub symlink_file: Option<String>,
    /// Controls how the session prompt is passed to the runner CLI.
    /// - `Some(flag)` — prepend `flag` before the prompt value (e.g. `"--print"`).
    /// - `Some("-")` — suppress prompt injection (runner doesn't accept a prompt arg).
    /// - `None` — append the prompt as a positional argument.
    pub prompt_flag: Option<String>,
    /// Optional execution protocol override (`acp` or `shell`). Defaults to shell.
    pub protocol: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RunnerProtocol {
    Acp,
    Shell,
}

impl RunnerProtocol {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Acp => "acp",
            Self::Shell => "shell",
        }
    }
}

impl std::fmt::Display for RunnerProtocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for RunnerProtocol {
    type Err = CoreError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_lowercase().as_str() {
            "acp" => Ok(Self::Acp),
            "shell" | "subprocess" => Ok(Self::Shell),
            other => Err(CoreError::ConfigError(format!(
                "Unknown runner protocol: {}",
                other
            ))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct DetectionConfig {
    #[serde(default)]
    pub commands: Vec<String>,
    #[serde(default)]
    pub config_dirs: Vec<String>,
    #[serde(default)]
    pub env_vars: Vec<String>,
    #[serde(default)]
    pub extensions: Vec<String>,
}

#[derive(Debug, Clone, TS)]
#[ts(export, export_to = "../../../packages/ui/src/types/generated/")]
pub struct DetectionResult {
    pub runner: RunnerDefinition,
    pub detected: bool,
    pub reasons: Vec<String>,
}

impl RunnerDefinition {
    pub fn build_command(&self, config: &SessionConfig) -> CoreResult<Command> {
        let command = self.command.as_ref().ok_or_else(|| {
            CoreError::ConfigError(format!("Runner '{}' is not runnable", self.id))
        })?;
        let mut cmd = Command::new(command);

        for arg in &self.args {
            cmd.arg(arg);
        }

        for arg in &config.runner_args {
            cmd.arg(arg);
        }

        // Inject the prompt as a CLI argument. The `prompt_flag` field controls
        // how it is passed:
        //   - Some("-")  → skip (runner does not accept a prompt arg)
        //   - Some(flag) → append `flag` then the prompt value
        //   - None       → append the prompt as a positional argument
        if let Some(ref prompt) = config.prompt {
            match self.prompt_flag.as_deref() {
                Some("-") => {}
                Some(flag) => {
                    cmd.arg(flag);
                    cmd.arg(prompt);
                }
                None => {
                    cmd.arg(prompt);
                }
            }
        }

        if let Some(working_dir) = &config.working_dir {
            cmd.current_dir(working_dir);
        }

        for (key, value) in &self.env {
            let resolved = interpolate_env(value)?;
            cmd.env(key, resolved);
        }

        for (key, value) in &config.env_vars {
            cmd.env(key, value);
        }

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        Ok(cmd)
    }

    pub fn command_preview(&self, config: &SessionConfig) -> String {
        let mut parts = Vec::new();

        if let Some(command) = &self.command {
            parts.push(shell_escape(command));
        } else {
            parts.push(shell_escape(&self.id));
        }

        for arg in &self.args {
            parts.push(shell_escape(arg));
        }

        for arg in &config.runner_args {
            parts.push(shell_escape(arg));
        }

        if let Some(prompt) = &config.prompt {
            match self.prompt_flag.as_deref() {
                Some("-") => {}
                Some(flag) => {
                    parts.push(shell_escape(flag));
                    parts.push(shell_escape(prompt));
                }
                None => parts.push(shell_escape(prompt)),
            }
        }

        parts.join(" ")
    }

    pub fn resolve_protocol(
        &self,
        override_protocol: Option<RunnerProtocol>,
    ) -> CoreResult<RunnerProtocol> {
        if let Some(protocol) = override_protocol {
            return Ok(protocol);
        }

        match self.protocol.as_deref() {
            Some(value) => value.parse::<RunnerProtocol>(),
            None => Ok(RunnerProtocol::Shell),
        }
    }

    pub fn build_model_args(&self, model: &str) -> CoreResult<Vec<String>> {
        let model = model.trim();
        if model.is_empty() {
            return Ok(Vec::new());
        }

        if self.args.iter().any(|arg| arg == "-m")
            || matches!(self.id.as_str(), "codex" | "opencode")
        {
            return Ok(vec!["-m".to_string(), model.to_string()]);
        }

        if self.args.iter().any(|arg| arg == "--model")
            || self.model_providers.is_some()
            || matches!(
                self.id.as_str(),
                "claude" | "copilot" | "aider" | "gemini" | "opencode"
            )
        {
            return Ok(vec!["--model".to_string(), model.to_string()]);
        }

        Err(CoreError::ConfigError(format!(
            "Runner '{}' does not advertise model override support",
            self.id
        )))
    }

    pub fn validate_command(&self) -> CoreResult<()> {
        let command = self.command.as_ref().ok_or_else(|| {
            CoreError::ConfigError(format!("Runner '{}' is not runnable", self.id))
        })?;
        which::which(command).map_err(|_| {
            CoreError::ConfigError(format!("Runner command not found: {}", command))
        })?;
        Ok(())
    }

    /// Detect the version of the runner command.
    /// Returns None if the command doesn't exist or version cannot be determined.
    pub fn detect_version(&self) -> Option<String> {
        let command = self.command.as_ref()?;

        // Try common version flags in order of preference
        let version_flags = ["--version", "-v", "version"];

        for flag in &version_flags {
            if let Ok(output) = std::process::Command::new(command).arg(flag).output() {
                if output.status.success() || !output.stdout.is_empty() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let text = if stdout.is_empty() { stderr } else { stdout };

                    // Extract version number from output
                    if let Some(version) = extract_version(&text) {
                        return Some(version);
                    }
                }
            }
        }

        None
    }

    pub fn is_runnable(&self) -> bool {
        self.command.is_some()
    }

    pub fn display_name(&self) -> String {
        self.name.clone().unwrap_or_else(|| self.id.clone())
    }

    pub fn resolve_env(
        &self,
        extra_env: &HashMap<String, String>,
    ) -> CoreResult<HashMap<String, String>> {
        let mut env = HashMap::new();
        for (key, value) in &self.env {
            env.insert(key.clone(), interpolate_env(value)?);
        }
        for (key, value) in extra_env {
            env.insert(key.clone(), value.clone());
        }
        Ok(env)
    }
}

pub struct RunnerRegistry {
    runners: HashMap<String, RunnerDefinition>,
    default: Option<String>,
}

impl RunnerRegistry {
    pub fn builtins() -> Self {
        let mut runners = HashMap::new();
        runners.insert(
            "claude".to_string(),
            RunnerDefinition {
                id: "claude".to_string(),
                name: Some("Claude Code".to_string()),
                command: Some("claude".to_string()),
                args: vec!["--dangerously-skip-permissions".to_string()],
                env: HashMap::from([(
                    "ANTHROPIC_API_KEY".to_string(),
                    "${ANTHROPIC_API_KEY}".to_string(),
                )]),
                model: None,
                model_providers: Some(vec!["anthropic".to_string()]),
                detection: Some(DetectionConfig {
                    commands: vec!["claude".to_string()],
                    config_dirs: vec![".claude".to_string()],
                    env_vars: vec!["ANTHROPIC_API_KEY".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: Some("CLAUDE.md".to_string()),
                prompt_flag: Some("--print".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "copilot".to_string(),
            RunnerDefinition {
                id: "copilot".to_string(),
                name: Some("GitHub Copilot".to_string()),
                command: Some("copilot".to_string()),
                args: vec!["--allow-all".to_string()],
                env: HashMap::new(),
                model: None,
                model_providers: Some(vec!["github-copilot".to_string()]),
                detection: Some(DetectionConfig {
                    commands: vec!["copilot".to_string()],
                    config_dirs: vec![".copilot".to_string()],
                    env_vars: vec!["GITHUB_TOKEN".to_string(), "GH_TOKEN".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: Some("--prompt".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "codex".to_string(),
            RunnerDefinition {
                id: "codex".to_string(),
                name: Some("Codex CLI".to_string()),
                command: Some("codex".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: Some(vec!["openai".to_string()]),
                detection: Some(DetectionConfig {
                    commands: vec!["codex".to_string()],
                    config_dirs: vec![".codex".to_string()],
                    env_vars: vec!["OPENAI_API_KEY".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "opencode".to_string(),
            RunnerDefinition {
                id: "opencode".to_string(),
                name: Some("OpenCode".to_string()),
                command: Some("opencode".to_string()),
                args: vec!["run".to_string()],
                env: HashMap::new(),
                model: None,
                model_providers: Some(vec![
                    "openai".to_string(),
                    "anthropic".to_string(),
                    "google".to_string(),
                ]),
                detection: Some(DetectionConfig {
                    commands: vec!["opencode".to_string()],
                    config_dirs: vec![".opencode".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "aider".to_string(),
            RunnerDefinition {
                id: "aider".to_string(),
                name: Some("Aider".to_string()),
                command: Some("aider".to_string()),
                args: vec!["--no-auto-commits".to_string()],
                env: HashMap::from([(
                    "OPENAI_API_KEY".to_string(),
                    "${OPENAI_API_KEY}".to_string(),
                )]),
                model: None,
                model_providers: Some(vec![
                    "openai".to_string(),
                    "anthropic".to_string(),
                    "google".to_string(),
                ]),
                detection: Some(DetectionConfig {
                    commands: vec!["aider".to_string()],
                    config_dirs: vec![".aider".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: Some("--message".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "cline".to_string(),
            RunnerDefinition {
                id: "cline".to_string(),
                name: Some("Cline".to_string()),
                command: Some("cline".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["cline".to_string()],
                    config_dirs: Vec::new(),
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: Some("-".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "gemini".to_string(),
            RunnerDefinition {
                id: "gemini".to_string(),
                name: Some("Gemini CLI".to_string()),
                command: Some("gemini".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: Some(vec!["google".to_string()]),
                detection: Some(DetectionConfig {
                    commands: vec!["gemini".to_string()],
                    config_dirs: vec![".gemini".to_string()],
                    env_vars: vec!["GOOGLE_API_KEY".to_string(), "GEMINI_API_KEY".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: Some("GEMINI.md".to_string()),
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "cursor".to_string(),
            RunnerDefinition {
                id: "cursor".to_string(),
                name: Some("Cursor".to_string()),
                command: None,
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["cursor".to_string()],
                    config_dirs: vec![".cursor".to_string(), ".cursorules".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: Some("-".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "windsurf".to_string(),
            RunnerDefinition {
                id: "windsurf".to_string(),
                name: Some("Windsurf".to_string()),
                command: None,
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["windsurf".to_string()],
                    config_dirs: vec![".windsurf".to_string(), ".windsurfrules".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: Some("-".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "antigravity".to_string(),
            RunnerDefinition {
                id: "antigravity".to_string(),
                name: Some("Antigravity".to_string()),
                command: None,
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["antigravity".to_string()],
                    config_dirs: vec![".antigravity".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: Some("-".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "droid".to_string(),
            RunnerDefinition {
                id: "droid".to_string(),
                name: Some("Droid".to_string()),
                command: Some("droid".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["droid".to_string()],
                    config_dirs: vec![".droid".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "kiro".to_string(),
            RunnerDefinition {
                id: "kiro".to_string(),
                name: Some("Kiro CLI".to_string()),
                command: Some("kiro-cli".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["kiro-cli".to_string()],
                    config_dirs: vec![".kiro".to_string()],
                    env_vars: vec!["AWS_ACCESS_KEY_ID".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "kimi".to_string(),
            RunnerDefinition {
                id: "kimi".to_string(),
                name: Some("Kimi CLI".to_string()),
                command: Some("kimi".to_string()),
                args: Vec::new(),
                env: HashMap::from([(
                    "MOONSHOT_API_KEY".to_string(),
                    "${MOONSHOT_API_KEY}".to_string(),
                )]),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["kimi".to_string()],
                    config_dirs: vec![".kimi".to_string()],
                    env_vars: vec!["MOONSHOT_API_KEY".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "qodo".to_string(),
            RunnerDefinition {
                id: "qodo".to_string(),
                name: Some("Qodo CLI".to_string()),
                command: Some("qodo".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["qodo".to_string()],
                    config_dirs: vec![".qodo".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "amp".to_string(),
            RunnerDefinition {
                id: "amp".to_string(),
                name: Some("Amp".to_string()),
                command: Some("amp".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["amp".to_string()],
                    config_dirs: vec![".amp".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "trae".to_string(),
            RunnerDefinition {
                id: "trae".to_string(),
                name: Some("Trae Agent".to_string()),
                command: Some("trae".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["trae".to_string()],
                    config_dirs: vec![".trae".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "qwen-code".to_string(),
            RunnerDefinition {
                id: "qwen-code".to_string(),
                name: Some("Qwen Code".to_string()),
                command: Some("qwen-code".to_string()),
                args: Vec::new(),
                env: HashMap::from([(
                    "DASHSCOPE_API_KEY".to_string(),
                    "${DASHSCOPE_API_KEY}".to_string(),
                )]),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["qwen-code".to_string()],
                    config_dirs: vec![".qwen-code".to_string()],
                    env_vars: vec!["DASHSCOPE_API_KEY".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "goose".to_string(),
            RunnerDefinition {
                id: "goose".to_string(),
                name: Some("Goose".to_string()),
                command: Some("goose".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["goose".to_string()],
                    config_dirs: vec![".goose".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "openhands".to_string(),
            RunnerDefinition {
                id: "openhands".to_string(),
                name: Some("OpenHands".to_string()),
                command: Some("openhands".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["openhands".to_string()],
                    config_dirs: vec![".openhands".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "continue".to_string(),
            RunnerDefinition {
                id: "continue".to_string(),
                name: Some("Continue".to_string()),
                command: Some("continue".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["continue".to_string()],
                    config_dirs: vec![".continue".to_string()],
                    env_vars: Vec::new(),
                    extensions: vec!["continue.continue".to_string()],
                }),
                symlink_file: None,
                prompt_flag: Some("-".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "crush".to_string(),
            RunnerDefinition {
                id: "crush".to_string(),
                name: Some("Crush".to_string()),
                command: Some("crush".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: vec!["crush".to_string()],
                    config_dirs: vec![".crush".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
                prompt_flag: None,
                protocol: None,
            },
        );
        runners.insert(
            "roo".to_string(),
            RunnerDefinition {
                id: "roo".to_string(),
                name: Some("Roo Code".to_string()),
                command: None,
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: Vec::new(),
                    config_dirs: vec![".roo".to_string()],
                    env_vars: Vec::new(),
                    extensions: vec!["rooveterinaryinc.roo-cline".to_string()],
                }),
                symlink_file: None,
                prompt_flag: Some("-".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "codebuddy".to_string(),
            RunnerDefinition {
                id: "codebuddy".to_string(),
                name: Some("CodeBuddy".to_string()),
                command: None,
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: Vec::new(),
                    config_dirs: vec![".codebuddy".to_string()],
                    env_vars: Vec::new(),
                    extensions: vec!["codebuddy.codebuddy".to_string()],
                }),
                symlink_file: None,
                prompt_flag: Some("-".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "kilo".to_string(),
            RunnerDefinition {
                id: "kilo".to_string(),
                name: Some("Kilo Code".to_string()),
                command: None,
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: Vec::new(),
                    config_dirs: vec![".kilocode".to_string()],
                    env_vars: Vec::new(),
                    extensions: vec!["kilocode.kilo-code".to_string()],
                }),
                symlink_file: None,
                prompt_flag: Some("-".to_string()),
                protocol: None,
            },
        );
        runners.insert(
            "augment".to_string(),
            RunnerDefinition {
                id: "augment".to_string(),
                name: Some("Augment".to_string()),
                command: None,
                args: Vec::new(),
                env: HashMap::new(),
                model: None,
                model_providers: None,
                detection: Some(DetectionConfig {
                    commands: Vec::new(),
                    config_dirs: vec![".augment".to_string()],
                    env_vars: Vec::new(),
                    extensions: vec!["augment.vscode-augment".to_string()],
                }),
                symlink_file: None,
                prompt_flag: Some("-".to_string()),
                protocol: None,
            },
        );

        Self {
            runners,
            default: Some("claude".to_string()),
        }
    }

    pub fn load(project_path: &Path) -> CoreResult<Self> {
        let mut registry = Self::builtins();

        if let Some(global) = read_runners_file(&global_runners_path())? {
            registry.apply_config(global)?;
        }

        if let Some(project) = read_runners_file(&project_runners_path(project_path))? {
            registry.apply_config(project)?;
        }

        Ok(registry)
    }

    pub fn get(&self, id: &str) -> Option<&RunnerDefinition> {
        self.runners.get(id)
    }

    pub fn list(&self) -> Vec<&RunnerDefinition> {
        let mut runners: Vec<_> = self.runners.values().collect();
        runners.sort_by(|a, b| a.id.cmp(&b.id));
        runners
    }

    pub fn list_ids(&self) -> Vec<&str> {
        let mut ids: Vec<_> = self.runners.keys().map(|id| id.as_str()).collect();
        ids.sort();
        ids
    }

    pub fn default(&self) -> Option<&str> {
        self.default.as_deref()
    }

    pub fn list_available(&self) -> Vec<&RunnerDefinition> {
        let mut runners: Vec<_> = self
            .runners
            .values()
            .filter(|runner| runner.validate_command().is_ok())
            .collect();
        runners.sort_by(|a, b| a.id.cmp(&b.id));
        runners
    }

    pub fn validate(&self, id: &str) -> CoreResult<()> {
        let runner = self
            .runners
            .get(id)
            .ok_or_else(|| CoreError::ConfigError(format!("Unknown runner: {}", id)))?;
        runner.validate_command()
    }

    pub fn detect_available(&self, home_override: Option<&Path>) -> Vec<DetectionResult> {
        let home = home_dir(home_override);
        let mut results = Vec::new();

        for runner in self.runners.values() {
            let Some(detection) = &runner.detection else {
                continue;
            };
            let mut reasons = Vec::new();

            for command in &detection.commands {
                if command_exists(command) {
                    reasons.push(format!("'{}' command found", command));
                }
            }

            for dir in &detection.config_dirs {
                if config_dir_exists(home.as_deref(), dir) {
                    reasons.push(format!("~/{dir} directory found"));
                }
            }

            for env in &detection.env_vars {
                if env_var_exists(env) {
                    reasons.push(format!("{env} env var set"));
                }
            }

            for ext in &detection.extensions {
                if extension_installed(home.as_deref(), ext) {
                    reasons.push(format!("{ext} extension installed"));
                }
            }

            results.push(DetectionResult {
                runner: runner.clone(),
                detected: !reasons.is_empty(),
                reasons,
            });
        }

        results.sort_by(|a, b| a.runner.id.cmp(&b.runner.id));
        results
    }

    pub fn symlink_runners(&self) -> Vec<&RunnerDefinition> {
        self.runners
            .values()
            .filter(|runner| runner.symlink_file.is_some())
            .collect()
    }

    pub fn runnable_runners(&self) -> Vec<&RunnerDefinition> {
        self.runners
            .values()
            .filter(|runner| runner.is_runnable())
            .collect()
    }

    fn apply_config(&mut self, file: RunnersFile) -> CoreResult<()> {
        for (id, override_config) in file.runners {
            if let Some(existing) = self.runners.get(&id).cloned() {
                let merged = merge_runner(existing, override_config);
                self.runners.insert(id, merged);
            } else {
                let definition = RunnerDefinition {
                    id: id.clone(),
                    name: override_config.name,
                    command: override_config.command,
                    args: override_config.args.unwrap_or_default(),
                    env: override_config.env.unwrap_or_default(),
                    model: override_config.model,
                    model_providers: override_config.model_providers,
                    detection: override_config.detection,
                    symlink_file: override_config.symlink_file,
                    prompt_flag: override_config.prompt_flag,
                    protocol: override_config.protocol,
                };
                self.runners.insert(id, definition);
            }
        }

        if file.default.is_some() {
            self.default = file.default;
        }

        Ok(())
    }
}

fn merge_runner(mut base: RunnerDefinition, override_config: RunnerConfig) -> RunnerDefinition {
    if let Some(name) = override_config.name {
        base.name = Some(name);
    }
    if let Some(command) = override_config.command {
        base.command = Some(command);
    }
    if let Some(args) = override_config.args {
        base.args = args;
    }
    if let Some(env) = override_config.env {
        base.env = env;
    }
    if let Some(model) = override_config.model {
        base.model = Some(model);
    }
    if let Some(model_providers) = override_config.model_providers {
        base.model_providers = Some(model_providers);
    }
    if let Some(detection) = override_config.detection {
        base.detection = Some(detection);
    }
    if let Some(symlink_file) = override_config.symlink_file {
        base.symlink_file = Some(symlink_file);
    }
    if let Some(prompt_flag) = override_config.prompt_flag {
        base.prompt_flag = Some(prompt_flag);
    }
    if let Some(protocol) = override_config.protocol {
        base.protocol = Some(protocol);
    }
    base
}

pub fn default_runners_file() -> RunnersFile {
    RunnersFile {
        schema: Some(RUNNERS_SCHEMA_URL.to_string()),
        runners: HashMap::new(),
        default: None,
    }
}

pub fn read_runners_file(path: &Path) -> CoreResult<Option<RunnersFile>> {
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path)
        .map_err(|e| CoreError::ConfigError(format!("Failed to read runners: {}", e)))?;

    let parsed = serde_json::from_str::<RunnersFile>(&content)
        .map_err(|e| CoreError::ConfigError(format!("Failed to parse runners: {}", e)))?;

    Ok(Some(parsed))
}

pub fn write_runners_file(path: &Path, file: &RunnersFile) -> CoreResult<()> {
    let mut output = file.clone();

    if output.schema.is_none() {
        output.schema = Some(RUNNERS_SCHEMA_URL.to_string());
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| CoreError::ConfigError(format!("Failed to create runners dir: {}", e)))?;
    }

    let serialized = serde_json::to_string_pretty(&output)
        .map_err(|e| CoreError::ConfigError(format!("Failed to serialize runners: {}", e)))?;

    fs::write(path, serialized)
        .map_err(|e| CoreError::ConfigError(format!("Failed to write runners: {}", e)))?;

    Ok(())
}

pub fn global_runners_path() -> PathBuf {
    config_dir().join("runners.json")
}

pub fn project_runners_path(project_path: &Path) -> PathBuf {
    project_path.join(".lean-spec").join("runners.json")
}

/// Resolve available models for a runner by looking up its `model_providers`
/// in the models.dev registry.
///
/// Returns model IDs filtered to agentic-capable models (tool_call=true)
/// and excludes embedding-only or audio-only models.
#[cfg(feature = "ai")]
pub fn resolve_runner_models(
    runner: &RunnerDefinition,
    registry: &crate::models_registry::ModelRegistry,
) -> Vec<String> {
    let providers = match &runner.model_providers {
        Some(p) if !p.is_empty() => p,
        _ => return Vec::new(),
    };

    let mut models = Vec::new();
    for provider_id in providers {
        if let Some(provider) = registry.providers.get(provider_id) {
            for model in provider.models.values() {
                if !model.tool_call.unwrap_or(false) {
                    continue;
                }
                // Exclude embedding-only or audio-only models
                if let Some(ref modalities) = model.modalities {
                    let has_text_output = modalities.output.iter().any(|m| m == "text");
                    let has_text_input = modalities.input.iter().any(|m| m == "text");
                    if !has_text_output || !has_text_input {
                        continue;
                    }
                }
                models.push(format_model_for_runner(runner, provider_id, &model.id));
            }
        }
    }

    models.sort();
    models.dedup();
    models
}

/// Resolve runner models using the bundled registry (sync, for offline use).
#[cfg(feature = "ai")]
pub fn resolve_runner_models_bundled(runner: &RunnerDefinition) -> CoreResult<Vec<String>> {
    let registry = crate::models_registry::load_bundled_registry()?;
    Ok(resolve_runner_models(runner, &registry))
}

#[cfg(feature = "ai")]
fn format_model_for_runner(runner: &RunnerDefinition, provider_id: &str, model_id: &str) -> String {
    match runner.id.as_str() {
        // OpenCode requires provider/model IDs for cross-provider selection.
        "opencode" => format!("{provider_id}/{model_id}"),
        _ => model_id.to_string(),
    }
}

fn home_dir(override_path: Option<&Path>) -> Option<PathBuf> {
    if let Some(path) = override_path {
        return Some(path.to_path_buf());
    }
    if let Ok(path) = std::env::var("LEAN_SPEC_HOME") {
        return Some(PathBuf::from(path));
    }
    #[cfg(windows)]
    {
        std::env::var("USERPROFILE").ok().map(PathBuf::from)
    }
    #[cfg(not(windows))]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
}

fn command_exists(command: &str) -> bool {
    which::which(command).is_ok()
}

fn config_dir_exists(home: Option<&Path>, dir_name: &str) -> bool {
    if let Some(home_dir) = home {
        let candidate = home_dir.join(dir_name);
        return candidate.is_dir();
    }
    false
}

fn env_var_exists(var_name: &str) -> bool {
    std::env::var(var_name)
        .map(|v| !v.is_empty())
        .unwrap_or(false)
}

fn extension_installed(home: Option<&Path>, extension_prefix: &str) -> bool {
    let Some(home_dir) = home else { return false };
    let extension_dirs = [
        home_dir.join(".vscode/extensions"),
        home_dir.join(".vscode-server/extensions"),
        home_dir.join(".cursor/extensions"),
    ];

    for dir in extension_dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            if entries.flatten().any(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with(extension_prefix)
            }) {
                return true;
            }
        }
    }
    false
}

/// Extract version number from command output.
/// Handles common formats like "vX.Y.Z", "X.Y.Z", "version X.Y.Z", etc.
fn shell_escape(value: &str) -> String {
    if value.is_empty() {
        return "''".to_string();
    }

    if value
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '_' | '-' | '.' | ':' | '@' | '='))
    {
        return value.to_string();
    }

    format!("'{}'", value.replace('\'', "'\\''"))
}

fn extract_version(text: &str) -> Option<String> {
    // Common patterns for version strings
    let version_patterns = [
        // Semantic version with optional v prefix: v1.2.3, 1.2.3, v1.2.3-beta
        regex::Regex::new(r"v?(\d+\.\d+\.\d+(?:-[\w.]+)?)").ok()?,
    ];

    for pattern in &version_patterns {
        if let Some(caps) = pattern.captures(text) {
            if let Some(version) = caps.get(1) {
                return Some(version.as_str().to_string());
            }
        }
    }

    None
}

fn interpolate_env(value: &str) -> CoreResult<String> {
    let mut output = String::new();
    let mut chars = value.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '$' && matches!(chars.peek(), Some('{')) {
            chars.next();
            let mut var_name = String::new();
            for next in chars.by_ref() {
                if next == '}' {
                    break;
                }
                var_name.push(next);
            }

            if var_name.is_empty() {
                return Err(CoreError::ConfigError(
                    "Empty environment variable reference".to_string(),
                ));
            }

            let resolved = std::env::var(&var_name).map_err(|_| {
                CoreError::ConfigError(format!("Environment variable '{}' not set", var_name))
            })?;
            output.push_str(&resolved);
        } else {
            output.push(c);
        }
    }

    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_runner_overrides() {
        let base = RunnerDefinition {
            id: "claude".to_string(),
            name: Some("Claude Code".to_string()),
            command: Some("claude".to_string()),
            args: vec!["--print".to_string()],
            env: HashMap::new(),
            model: None,
            model_providers: None,
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };

        let override_config = RunnerConfig {
            name: None,
            command: None,
            args: Some(vec!["--model".to_string(), "sonnet".to_string()]),
            env: None,
            model: None,
            model_providers: None,
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };

        let merged = merge_runner(base, override_config);
        assert_eq!(merged.command, Some("claude".to_string()));
        assert_eq!(merged.args, vec!["--model", "sonnet"]);
    }

    #[test]
    fn test_resolve_protocol_defaults_to_shell() {
        let runner = RunnerDefinition {
            id: "test".to_string(),
            name: None,
            command: Some("echo".to_string()),
            args: Vec::new(),
            env: HashMap::new(),
            model: None,
            model_providers: None,
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };

        assert_eq!(
            runner.resolve_protocol(None).expect("protocol"),
            RunnerProtocol::Shell
        );
    }

    #[test]
    fn test_resolve_protocol_uses_configured_acp() {
        let runner = RunnerDefinition {
            id: "test".to_string(),
            name: None,
            command: Some("echo".to_string()),
            args: Vec::new(),
            env: HashMap::new(),
            model: None,
            model_providers: None,
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: Some("acp".to_string()),
        };

        assert_eq!(
            runner.resolve_protocol(None).expect("protocol"),
            RunnerProtocol::Acp
        );
    }

    #[test]
    fn test_command_preview_includes_prompt_and_runner_args() {
        let runner = RunnerDefinition {
            id: "copilot".to_string(),
            name: None,
            command: Some("copilot".to_string()),
            args: vec!["--allow-all".to_string()],
            env: HashMap::new(),
            model: None,
            model_providers: Some(vec!["github-copilot".to_string()]),
            detection: None,
            symlink_file: None,
            prompt_flag: Some("--prompt".to_string()),
            protocol: None,
        };
        let config = SessionConfig {
            prompt: Some("ship it".to_string()),
            runner_args: vec!["--model".to_string(), "gpt-5".to_string()],
            ..SessionConfig::default()
        };

        assert_eq!(
            runner.command_preview(&config),
            "copilot --allow-all --model gpt-5 --prompt 'ship it'"
        );
    }

    #[test]
    fn test_build_model_args_supports_common_runners() {
        let runner = RunnerDefinition {
            id: "codex".to_string(),
            name: None,
            command: Some("codex".to_string()),
            args: Vec::new(),
            env: HashMap::new(),
            model: None,
            model_providers: Some(vec!["openai".to_string()]),
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };

        assert_eq!(
            runner.build_model_args("gpt-5").expect("model args"),
            vec!["-m".to_string(), "gpt-5".to_string()]
        );
    }

    #[test]
    fn test_build_model_args_uses_dash_m_for_opencode() {
        let runner = RunnerDefinition {
            id: "opencode".to_string(),
            name: None,
            command: Some("opencode".to_string()),
            args: vec!["run".to_string()],
            env: HashMap::new(),
            model: None,
            model_providers: Some(vec![
                "openai".to_string(),
                "anthropic".to_string(),
                "google".to_string(),
            ]),
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };

        assert_eq!(
            runner.build_model_args("openai/gpt-5").expect("model args"),
            vec!["-m".to_string(), "openai/gpt-5".to_string()]
        );
    }

    #[test]
    fn test_builtin_runners_include_new_entries() {
        let registry = RunnerRegistry::builtins();
        assert!(registry.get("gemini").is_some());
        assert!(registry.get("cursor").is_some());
        assert!(registry.get("windsurf").is_some());
        assert!(registry.get("antigravity").is_some());
        assert!(registry.get("droid").is_some());
        assert!(registry.get("kiro").is_some());
        assert!(registry.get("kimi").is_some());
        assert!(registry.get("qodo").is_some());
        assert!(registry.get("amp").is_some());
        assert!(registry.get("trae").is_some());
        assert!(registry.get("qwen-code").is_some());
        // New runners added from npx skills
        assert!(registry.get("goose").is_some());
        assert!(registry.get("openhands").is_some());
        assert!(registry.get("continue").is_some());
        assert!(registry.get("crush").is_some());
        assert!(registry.get("roo").is_some());
        assert!(registry.get("codebuddy").is_some());
        assert!(registry.get("kilo").is_some());
        assert!(registry.get("augment").is_some());
    }

    #[test]
    fn test_builtin_opencode_runner_uses_run_subcommand_and_detection_dir() {
        let registry = RunnerRegistry::builtins();
        let runner = registry.get("opencode").expect("opencode runner");

        assert_eq!(runner.args, vec!["run"]);
        assert_eq!(
            runner.detection.as_ref().expect("detection").config_dirs,
            vec![".opencode".to_string()]
        );
    }

    #[test]
    fn test_detection_uses_home_override() {
        let temp_dir = tempfile::tempdir().expect("tempdir");
        std::fs::create_dir_all(temp_dir.path().join(".claude")).expect("create .claude");

        let registry = RunnerRegistry::builtins();
        let results = registry.detect_available(Some(temp_dir.path()));
        let claude = results
            .iter()
            .find(|result| result.runner.id == "claude")
            .expect("claude result");

        assert!(claude.detected);
        assert!(claude
            .reasons
            .iter()
            .any(|reason| reason.contains(".claude")));
    }

    #[cfg(feature = "ai")]
    #[test]
    fn test_resolve_runner_models_with_bundled_registry() {
        let registry = crate::models_registry::load_bundled_registry().expect("bundled registry");

        // Test copilot runner resolves github-copilot models
        let copilot = RunnerDefinition {
            id: "copilot".to_string(),
            name: None,
            command: None,
            args: Vec::new(),
            env: HashMap::new(),
            model: None,
            model_providers: Some(vec!["github-copilot".to_string()]),
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };
        let models = resolve_runner_models(&copilot, &registry);
        // github-copilot provider should have tool-call capable models
        if registry.providers.contains_key("github-copilot") {
            assert!(
                !models.is_empty(),
                "copilot should have models from github-copilot provider"
            );
        }
    }

    #[cfg(feature = "ai")]
    #[test]
    fn test_resolve_runner_models_no_providers() {
        let registry = crate::models_registry::load_bundled_registry().expect("bundled registry");

        let runner = RunnerDefinition {
            id: "test".to_string(),
            name: None,
            command: None,
            args: Vec::new(),
            env: HashMap::new(),
            model: None,
            model_providers: None,
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };
        let models = resolve_runner_models(&runner, &registry);
        assert!(
            models.is_empty(),
            "runner with no providers should return empty models"
        );
    }

    #[cfg(feature = "ai")]
    #[test]
    fn test_resolve_runner_models_empty_providers() {
        let registry = crate::models_registry::load_bundled_registry().expect("bundled registry");

        let runner = RunnerDefinition {
            id: "test".to_string(),
            name: None,
            command: None,
            args: Vec::new(),
            env: HashMap::new(),
            model: None,
            model_providers: Some(vec![]),
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };
        let models = resolve_runner_models(&runner, &registry);
        assert!(
            models.is_empty(),
            "runner with empty providers should return empty models"
        );
    }

    #[cfg(feature = "ai")]
    #[test]
    fn test_resolve_runner_models_multi_provider() {
        let registry = crate::models_registry::load_bundled_registry().expect("bundled registry");

        let runner = RunnerDefinition {
            id: "aider".to_string(),
            name: None,
            command: None,
            args: Vec::new(),
            env: HashMap::new(),
            model: None,
            model_providers: Some(vec!["openai".to_string(), "anthropic".to_string()]),
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };
        let models = resolve_runner_models(&runner, &registry);
        assert!(
            !models.is_empty(),
            "multi-provider runner should have models"
        );
        // Should be sorted and deduplicated
        let mut sorted = models.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(models, sorted, "models should be sorted and deduplicated");
    }

    #[cfg(feature = "ai")]
    #[test]
    fn test_resolve_runner_models_formats_opencode_models_with_provider_prefix() {
        let registry = crate::models_registry::load_bundled_registry().expect("bundled registry");

        let runner = RunnerDefinition {
            id: "opencode".to_string(),
            name: None,
            command: Some("opencode".to_string()),
            args: vec!["run".to_string()],
            env: HashMap::new(),
            model: None,
            model_providers: Some(vec!["openai".to_string()]),
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };

        let models = resolve_runner_models(&runner, &registry);
        if registry.providers.contains_key("openai") {
            assert!(
                models.iter().all(|model| model.starts_with("openai/")),
                "OpenCode models should include provider prefix: {:?}",
                models
            );
        }
    }

    #[cfg(feature = "ai")]
    #[test]
    fn test_resolve_runner_models_unknown_provider() {
        let registry = crate::models_registry::load_bundled_registry().expect("bundled registry");

        let runner = RunnerDefinition {
            id: "test".to_string(),
            name: None,
            command: None,
            args: Vec::new(),
            env: HashMap::new(),
            model: None,
            model_providers: Some(vec!["nonexistent-provider".to_string()]),
            detection: None,
            symlink_file: None,
            prompt_flag: None,
            protocol: None,
        };
        let models = resolve_runner_models(&runner, &registry);
        assert!(
            models.is_empty(),
            "unknown provider should return empty models"
        );
    }

    #[test]
    fn test_builtin_runners_have_model_providers() {
        let registry = RunnerRegistry::builtins();

        // Runners that should have model_providers
        let expected_providers: Vec<(&str, Vec<&str>)> = vec![
            ("copilot", vec!["github-copilot"]),
            ("claude", vec!["anthropic"]),
            ("codex", vec!["openai"]),
            ("gemini", vec!["google"]),
            ("aider", vec!["openai", "anthropic", "google"]),
            ("opencode", vec!["openai", "anthropic", "google"]),
        ];

        for (runner_id, expected) in expected_providers {
            let runner = registry
                .get(runner_id)
                .unwrap_or_else(|| panic!("missing runner: {}", runner_id));
            let providers = runner
                .model_providers
                .as_ref()
                .unwrap_or_else(|| panic!("{} should have model_providers", runner_id));
            let expected_strings: Vec<String> = expected.iter().map(|s| s.to_string()).collect();
            assert_eq!(
                providers, &expected_strings,
                "wrong providers for {}",
                runner_id
            );
        }

        // Runners that should NOT have model_providers (IDE-only)
        let no_providers = ["cursor", "windsurf", "cline"];
        for runner_id in no_providers {
            let runner = registry.get(runner_id).expect(runner_id);
            assert!(
                runner.model_providers.is_none(),
                "{} should not have model_providers",
                runner_id
            );
        }
    }
}
