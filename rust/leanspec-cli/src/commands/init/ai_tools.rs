use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub enum AiTool {
    Copilot,
    Claude,
    Gemini,
    Cursor,
    Windsurf,
    Aider,
    Codex,
    Droid,
}

impl AiTool {
    pub fn description(&self) -> &'static str {
        match self {
            AiTool::Copilot => "GitHub Copilot (AGENTS.md)",
            AiTool::Claude => "Claude Code (CLAUDE.md)",
            AiTool::Gemini => "Gemini CLI (GEMINI.md)",
            AiTool::Cursor => "Cursor (AGENTS.md)",
            AiTool::Windsurf => "Windsurf (AGENTS.md)",
            AiTool::Aider => "Aider (AGENTS.md)",
            AiTool::Codex => "Codex CLI (AGENTS.md)",
            AiTool::Droid => "Droid (AGENTS.md)",
        }
    }

    pub fn uses_symlink(&self) -> bool {
        matches!(self, AiTool::Claude | AiTool::Gemini)
    }

    pub fn symlink_file(&self) -> Option<&'static str> {
        match self {
            AiTool::Claude => Some("CLAUDE.md"),
            AiTool::Gemini => Some("GEMINI.md"),
            _ => None,
        }
    }
}

#[derive(Clone, Debug)]
pub struct DetectionConfig {
    pub commands: &'static [&'static str],
    pub config_dirs: &'static [&'static str],
    pub env_vars: &'static [&'static str],
    pub extensions: &'static [&'static str],
}

#[derive(Clone, Debug)]
pub struct AiToolConfig {
    pub file: &'static str,
    pub uses_symlink: bool,
    pub detection: DetectionConfig,
}

#[derive(Clone, Debug)]
pub struct DetectionResult {
    pub tool: AiTool,
    pub detected: bool,
    pub reasons: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct SymlinkResult {
    pub file: String,
    pub created: bool,
    pub skipped: bool,
    pub error: Option<String>,
}

fn config(tool: AiTool) -> AiToolConfig {
    match tool {
        AiTool::Copilot => AiToolConfig {
            file: "AGENTS.md",
            uses_symlink: false,
            detection: DetectionConfig {
                commands: &["copilot"],
                config_dirs: &[],
                env_vars: &["GITHUB_TOKEN"],
                extensions: &[],
            },
        },
        AiTool::Claude => AiToolConfig {
            file: "CLAUDE.md",
            uses_symlink: true,
            detection: DetectionConfig {
                commands: &["claude"],
                config_dirs: &[".claude"],
                env_vars: &["ANTHROPIC_API_KEY"],
                extensions: &[],
            },
        },
        AiTool::Gemini => AiToolConfig {
            file: "GEMINI.md",
            uses_symlink: true,
            detection: DetectionConfig {
                commands: &["gemini"],
                config_dirs: &[".gemini"],
                env_vars: &["GOOGLE_API_KEY", "GEMINI_API_KEY"],
                extensions: &[],
            },
        },
        AiTool::Cursor => AiToolConfig {
            file: "AGENTS.md",
            uses_symlink: false,
            detection: DetectionConfig {
                commands: &["cursor"],
                config_dirs: &[".cursor", ".cursorules"],
                env_vars: &[],
                extensions: &[],
            },
        },
        AiTool::Windsurf => AiToolConfig {
            file: "AGENTS.md",
            uses_symlink: false,
            detection: DetectionConfig {
                commands: &["windsurf"],
                config_dirs: &[".windsurf", ".windsurfrules"],
                env_vars: &[],
                extensions: &[],
            },
        },
        AiTool::Aider => AiToolConfig {
            file: "AGENTS.md",
            uses_symlink: false,
            detection: DetectionConfig {
                commands: &["aider"],
                config_dirs: &[".aider"],
                env_vars: &[],
                extensions: &[],
            },
        },
        AiTool::Codex => AiToolConfig {
            file: "AGENTS.md",
            uses_symlink: false,
            detection: DetectionConfig {
                commands: &["codex"],
                config_dirs: &[".codex"],
                env_vars: &["OPENAI_API_KEY"],
                extensions: &[],
            },
        },
        AiTool::Droid => AiToolConfig {
            file: "AGENTS.md",
            uses_symlink: false,
            detection: DetectionConfig {
                commands: &["droid"],
                config_dirs: &[".droid"],
                env_vars: &[],
                extensions: &[],
            },
        },
    }
}

pub fn home_dir(override_path: Option<&Path>) -> Option<PathBuf> {
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
    let which = if cfg!(windows) { "where" } else { "which" };
    Command::new(which)
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
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

pub fn detect_ai_tools(home_override: Option<&Path>) -> Vec<DetectionResult> {
    let mut results = Vec::new();
    let home = home_dir(home_override);

    for tool in all_tools() {
        let cfg = config(tool);
        let mut reasons: Vec<String> = Vec::new();

        for cmd in cfg.detection.commands {
            if command_exists(cmd) {
                reasons.push(format!("'{}' command found", cmd));
            }
        }

        for dir in cfg.detection.config_dirs {
            if config_dir_exists(home.as_deref(), dir) {
                reasons.push(format!("~/{dir} directory found"));
            }
        }

        for env in cfg.detection.env_vars {
            if env_var_exists(env) {
                reasons.push(format!("{env} env var set"));
            }
        }

        for ext in cfg.detection.extensions {
            if extension_installed(home.as_deref(), ext) {
                reasons.push(format!("{ext} extension installed"));
            }
        }

        results.push(DetectionResult {
            tool,
            detected: !reasons.is_empty(),
            reasons,
        });
    }

    results
}

pub fn default_ai_selection(detections: &[DetectionResult]) -> Vec<AiTool> {
    let mut detected: Vec<AiTool> = detections
        .iter()
        .filter(|r| r.detected)
        .map(|r| r.tool)
        .collect();

    if !detected.is_empty() {
        let has_copilot = detected.contains(&AiTool::Copilot);
        if !has_copilot {
            let any_non_symlink = detected.iter().any(|t| !config(*t).uses_symlink);
            if !any_non_symlink {
                detected.push(AiTool::Copilot);
            }
        }
        detected
    } else {
        vec![AiTool::Copilot]
    }
}

pub fn symlink_capable_tools() -> Vec<AiTool> {
    all_tools()
        .into_iter()
        .filter(|tool| config(*tool).uses_symlink)
        .collect()
}

pub fn create_symlinks(root: &Path, tools: &[AiTool]) -> Vec<SymlinkResult> {
    let mut files: HashSet<&str> = HashSet::new();
    for tool in tools {
        let cfg = config(*tool);
        if cfg.uses_symlink {
            files.insert(cfg.file);
        }
    }

    let mut results = Vec::new();
    for file in files {
        let target_path = root.join(file);
        if target_path.exists() {
            results.push(SymlinkResult {
                file: file.to_string(),
                created: false,
                skipped: true,
                error: None,
            });
            continue;
        }

        #[cfg(unix)]
        {
            let outcome = std::os::unix::fs::symlink("AGENTS.md", &target_path)
                .map(|_| SymlinkResult {
                    file: file.to_string(),
                    created: true,
                    skipped: false,
                    error: None,
                })
                .unwrap_or_else(|e| SymlinkResult {
                    file: file.to_string(),
                    created: false,
                    skipped: false,
                    error: Some(e.to_string()),
                });
            results.push(outcome);
        }

        #[cfg(not(unix))]
        {
            let outcome = std::fs::copy(root.join("AGENTS.md"), &target_path)
                .map(|_| SymlinkResult {
                    file: file.to_string(),
                    created: true,
                    skipped: false,
                    error: Some("created as copy (Windows)".to_string()),
                })
                .unwrap_or_else(|e| SymlinkResult {
                    file: file.to_string(),
                    created: false,
                    skipped: false,
                    error: Some(e.to_string()),
                });
            results.push(outcome);
        }
    }

    results
}

pub fn all_tools() -> Vec<AiTool> {
    vec![
        AiTool::Copilot,
        AiTool::Claude,
        AiTool::Gemini,
        AiTool::Cursor,
        AiTool::Windsurf,
        AiTool::Aider,
        AiTool::Codex,
        AiTool::Droid,
    ]
}
