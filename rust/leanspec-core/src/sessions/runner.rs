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

pub const RUNNERS_SCHEMA_URL: &str = "https://leanspec.dev/schemas/runners.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RunnerConfig {
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
    #[serde(default)]
    pub detection: Option<DetectionConfig>,
    #[serde(default)]
    pub symlink_file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RunnersFile {
    #[serde(rename = "$schema")]
    pub schema: Option<String>,
    #[serde(default)]
    pub runners: HashMap<String, RunnerConfig>,
    pub default: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerDefinition {
    pub id: String,
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub detection: Option<DetectionConfig>,
    pub symlink_file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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

#[derive(Debug, Clone)]
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

    pub fn validate_command(&self) -> CoreResult<()> {
        let command = self.command.as_ref().ok_or_else(|| {
            CoreError::ConfigError(format!("Runner '{}' is not runnable", self.id))
        })?;
        which::which(command).map_err(|_| {
            CoreError::ConfigError(format!("Runner command not found: {}", command))
        })?;
        Ok(())
    }

    pub fn is_runnable(&self) -> bool {
        self.command.is_some()
    }

    pub fn display_name(&self) -> String {
        self.name.clone().unwrap_or_else(|| self.id.clone())
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
                args: vec![
                    "--dangerously-skip-permissions".to_string(),
                    "--print".to_string(),
                ],
                env: HashMap::from([(
                    "ANTHROPIC_API_KEY".to_string(),
                    "${ANTHROPIC_API_KEY}".to_string(),
                )]),
                detection: Some(DetectionConfig {
                    commands: vec!["claude".to_string()],
                    config_dirs: vec![".claude".to_string()],
                    env_vars: vec!["ANTHROPIC_API_KEY".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: Some("CLAUDE.md".to_string()),
            },
        );
        runners.insert(
            "copilot".to_string(),
            RunnerDefinition {
                id: "copilot".to_string(),
                name: Some("GitHub Copilot".to_string()),
                command: Some("gh".to_string()),
                args: vec!["copilot".to_string(), "suggest".to_string()],
                env: HashMap::new(),
                detection: Some(DetectionConfig {
                    commands: vec!["copilot".to_string()],
                    config_dirs: Vec::new(),
                    env_vars: vec!["GITHUB_TOKEN".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["codex".to_string()],
                    config_dirs: vec![".codex".to_string()],
                    env_vars: vec!["OPENAI_API_KEY".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: None,
            },
        );
        runners.insert(
            "opencode".to_string(),
            RunnerDefinition {
                id: "opencode".to_string(),
                name: Some("OpenCode".to_string()),
                command: Some("opencode".to_string()),
                args: Vec::new(),
                env: HashMap::new(),
                detection: Some(DetectionConfig {
                    commands: vec!["opencode".to_string()],
                    config_dirs: Vec::new(),
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["aider".to_string()],
                    config_dirs: vec![".aider".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["cline".to_string()],
                    config_dirs: Vec::new(),
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["gemini".to_string()],
                    config_dirs: vec![".gemini".to_string()],
                    env_vars: vec!["GOOGLE_API_KEY".to_string(), "GEMINI_API_KEY".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: Some("GEMINI.md".to_string()),
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
                detection: Some(DetectionConfig {
                    commands: vec!["cursor".to_string()],
                    config_dirs: vec![".cursor".to_string(), ".cursorules".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["windsurf".to_string()],
                    config_dirs: vec![".windsurf".to_string(), ".windsurfrules".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["droid".to_string()],
                    config_dirs: vec![".droid".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["kiro-cli".to_string()],
                    config_dirs: vec![".kiro".to_string()],
                    env_vars: vec!["AWS_ACCESS_KEY_ID".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["kimi".to_string()],
                    config_dirs: vec![".kimi".to_string()],
                    env_vars: vec!["MOONSHOT_API_KEY".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["qodo".to_string()],
                    config_dirs: vec![".qodo".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["amp".to_string()],
                    config_dirs: vec![".amp".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["trae".to_string()],
                    config_dirs: vec![".trae".to_string()],
                    env_vars: Vec::new(),
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                detection: Some(DetectionConfig {
                    commands: vec!["qwen-code".to_string()],
                    config_dirs: vec![".qwen-code".to_string()],
                    env_vars: vec!["DASHSCOPE_API_KEY".to_string()],
                    extensions: Vec::new(),
                }),
                symlink_file: None,
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
                    detection: override_config.detection,
                    symlink_file: override_config.symlink_file,
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
    if let Some(detection) = override_config.detection {
        base.detection = Some(detection);
    }
    if let Some(symlink_file) = override_config.symlink_file {
        base.symlink_file = Some(symlink_file);
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
            detection: None,
            symlink_file: None,
        };

        let override_config = RunnerConfig {
            name: None,
            command: None,
            args: Some(vec!["--model".to_string(), "sonnet".to_string()]),
            env: None,
            detection: None,
            symlink_file: None,
        };

        let merged = merge_runner(base, override_config);
        assert_eq!(merged.command, Some("claude".to_string()));
        assert_eq!(merged.args, vec!["--model", "sonnet"]);
    }

    #[test]
    fn test_builtin_runners_include_new_entries() {
        let registry = RunnerRegistry::builtins();
        assert!(registry.get("gemini").is_some());
        assert!(registry.get("cursor").is_some());
        assert!(registry.get("windsurf").is_some());
        assert!(registry.get("droid").is_some());
        assert!(registry.get("kiro").is_some());
        assert!(registry.get("kimi").is_some());
        assert!(registry.get("qodo").is_some());
        assert!(registry.get("amp").is_some());
        assert!(registry.get("trae").is_some());
        assert!(registry.get("qwen-code").is_some());
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
}
