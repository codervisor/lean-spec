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
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
}

impl RunnerDefinition {
    pub fn build_command(&self, config: &SessionConfig) -> CoreResult<Command> {
        let mut cmd = Command::new(&self.command);

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
        which::which(&self.command).map_err(|_| {
            CoreError::ConfigError(format!("Runner command not found: {}", self.command))
        })?;
        Ok(())
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
                command: "claude".to_string(),
                args: vec![
                    "--dangerously-skip-permissions".to_string(),
                    "--print".to_string(),
                ],
                env: HashMap::from([(
                    "ANTHROPIC_API_KEY".to_string(),
                    "${ANTHROPIC_API_KEY}".to_string(),
                )]),
            },
        );
        runners.insert(
            "copilot".to_string(),
            RunnerDefinition {
                id: "copilot".to_string(),
                name: Some("GitHub Copilot".to_string()),
                command: "gh".to_string(),
                args: vec!["copilot".to_string(), "suggest".to_string()],
                env: HashMap::new(),
            },
        );
        runners.insert(
            "codex".to_string(),
            RunnerDefinition {
                id: "codex".to_string(),
                name: Some("Codex CLI".to_string()),
                command: "codex".to_string(),
                args: Vec::new(),
                env: HashMap::new(),
            },
        );
        runners.insert(
            "opencode".to_string(),
            RunnerDefinition {
                id: "opencode".to_string(),
                name: Some("OpenCode".to_string()),
                command: "opencode".to_string(),
                args: Vec::new(),
                env: HashMap::new(),
            },
        );
        runners.insert(
            "aider".to_string(),
            RunnerDefinition {
                id: "aider".to_string(),
                name: Some("Aider".to_string()),
                command: "aider".to_string(),
                args: vec!["--no-auto-commits".to_string()],
                env: HashMap::from([(
                    "OPENAI_API_KEY".to_string(),
                    "${OPENAI_API_KEY}".to_string(),
                )]),
            },
        );
        runners.insert(
            "cline".to_string(),
            RunnerDefinition {
                id: "cline".to_string(),
                name: Some("Cline".to_string()),
                command: "cline".to_string(),
                args: Vec::new(),
                env: HashMap::new(),
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
        self.runners.values().collect()
    }

    pub fn list_ids(&self) -> Vec<&str> {
        self.runners.keys().map(|id| id.as_str()).collect()
    }

    pub fn default(&self) -> Option<&str> {
        self.default.as_deref()
    }

    pub fn list_available(&self) -> Vec<&RunnerDefinition> {
        self.runners
            .values()
            .filter(|runner| runner.validate_command().is_ok())
            .collect()
    }

    pub fn validate(&self, id: &str) -> CoreResult<()> {
        let runner = self
            .runners
            .get(id)
            .ok_or_else(|| CoreError::ConfigError(format!("Unknown runner: {}", id)))?;
        runner.validate_command()
    }

    fn apply_config(&mut self, file: RunnersFile) -> CoreResult<()> {
        for (id, override_config) in file.runners {
            if let Some(existing) = self.runners.get(&id).cloned() {
                let merged = merge_runner(existing, override_config);
                self.runners.insert(id, merged);
            } else {
                let command = override_config.command.ok_or_else(|| {
                    CoreError::ConfigError(format!("Runner '{}' missing required command", id))
                })?;
                let definition = RunnerDefinition {
                    id: id.clone(),
                    name: override_config.name,
                    command,
                    args: override_config.args.unwrap_or_default(),
                    env: override_config.env.unwrap_or_default(),
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
        base.command = command;
    }
    if let Some(args) = override_config.args {
        base.args = args;
    }
    if let Some(env) = override_config.env {
        base.env = env;
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
            command: "claude".to_string(),
            args: vec!["--print".to_string()],
            env: HashMap::new(),
        };

        let override_config = RunnerConfig {
            name: None,
            command: None,
            args: Some(vec!["--model".to_string(), "sonnet".to_string()]),
            env: None,
        };

        let merged = merge_runner(base, override_config);
        assert_eq!(merged.command, "claude");
        assert_eq!(merged.args, vec!["--model", "sonnet"]);
    }
}
