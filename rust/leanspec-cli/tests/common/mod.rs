//! Test helper utilities for E2E and integration tests
//!
//! Provides utilities similar to the TypeScript e2e-helpers.ts for:
//! - Creating isolated test environments
//! - Executing CLI commands
//! - File and directory assertions
//! - Frontmatter parsing

use assert_cmd::Command;
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

/// Test context with temporary directory management
pub struct TestContext {
    pub tmp_dir: TempDir,
}

impl TestContext {
    /// Create a new isolated test environment
    pub fn new() -> Self {
        Self {
            tmp_dir: TempDir::new().expect("Failed to create temp directory"),
        }
    }

    /// Get path to temp directory
    pub fn path(&self) -> &Path {
        self.tmp_dir.path()
    }
}

impl Default for TestContext {
    fn default() -> Self {
        Self::new()
    }
}

/// Result from CLI execution
#[allow(dead_code)]
pub struct ExecResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub success: bool,
}

/// Execute a CLI command and capture output
pub fn exec_cli(args: &[&str], cwd: &Path) -> ExecResult {
    let output = Command::cargo_bin("lean-spec")
        .expect("Failed to find lean-spec binary")
        .args(args)
        .current_dir(cwd)
        .env("NO_COLOR", "1")
        .output()
        .expect("Failed to execute command");

    ExecResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
        success: output.status.success(),
    }
}

/// Initialize a LeanSpec project using the CLI
pub fn init_project(cwd: &Path, yes: bool) -> ExecResult {
    let mut args = vec!["init"];
    if yes {
        args.push("-y");
    }
    exec_cli(&args, cwd)
}

/// Create a spec using the CLI
pub fn create_spec(cwd: &Path, name: &str) -> ExecResult {
    exec_cli(&["create", name], cwd)
}

/// Create a spec with options
pub fn create_spec_with_options(cwd: &Path, name: &str, options: &[(&str, &str)]) -> ExecResult {
    let mut args = vec!["create".to_string(), name.to_string()];
    for (key, value) in options {
        args.push(format!("--{}", key));
        args.push(value.to_string());
    }
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    exec_cli(&args_refs, cwd)
}

/// Update a spec using the CLI
pub fn update_spec(cwd: &Path, spec: &str, options: &[(&str, &str)]) -> ExecResult {
    let mut args = vec!["update".to_string(), spec.to_string()];
    for (key, value) in options {
        args.push(format!("--{}", key));
        args.push(value.to_string());
    }
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    exec_cli(&args_refs, cwd)
}

/// Update a spec with --force flag (for completion verification bypass)
pub fn update_spec_force(cwd: &Path, spec: &str, options: &[(&str, &str)]) -> ExecResult {
    let mut args = vec!["update".to_string(), spec.to_string(), "--force".to_string()];
    for (key, value) in options {
        args.push(format!("--{}", key));
        args.push(value.to_string());
    }
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    exec_cli(&args_refs, cwd)
}

/// Link specs using the CLI
pub fn link_specs(cwd: &Path, spec: &str, depends_on: &str) -> ExecResult {
    exec_cli(&["link", spec, "--depends-on", depends_on], cwd)
}

/// Unlink specs using the CLI
#[allow(dead_code)]
pub fn unlink_specs(cwd: &Path, spec: &str, depends_on: &str) -> ExecResult {
    exec_cli(&["unlink", spec, "--depends-on", depends_on], cwd)
}

/// Archive a spec using the CLI
pub fn archive_spec(cwd: &Path, spec: &str) -> ExecResult {
    exec_cli(&["archive", spec], cwd)
}

/// List specs using the CLI
pub fn list_specs(cwd: &Path) -> ExecResult {
    exec_cli(&["list"], cwd)
}

/// List specs with options
pub fn list_specs_with_options(cwd: &Path, options: &[(&str, &str)]) -> ExecResult {
    let mut args = vec!["list".to_string()];
    for (key, value) in options {
        args.push(format!("--{}", key));
        args.push(value.to_string());
    }
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    exec_cli(&args_refs, cwd)
}

/// View a spec using the CLI
pub fn view_spec(cwd: &Path, spec: &str) -> ExecResult {
    exec_cli(&["view", spec], cwd)
}

/// Get board using the CLI
pub fn get_board(cwd: &Path) -> ExecResult {
    exec_cli(&["board"], cwd)
}

/// Validate specs using the CLI
pub fn validate_specs(cwd: &Path) -> ExecResult {
    exec_cli(&["validate"], cwd)
}

/// Search specs using the CLI
pub fn search_specs(cwd: &Path, query: &str) -> ExecResult {
    exec_cli(&["search", query], cwd)
}

/// Check if a file exists
pub fn file_exists(path: &Path) -> bool {
    path.exists() && path.is_file()
}

/// Check if a directory exists
pub fn dir_exists(path: &Path) -> bool {
    path.exists() && path.is_dir()
}

/// Read file content
pub fn read_file(path: &Path) -> String {
    fs::read_to_string(path).expect("Failed to read file")
}

/// Write file content
pub fn write_file(path: &Path, content: &str) {
    fs::write(path, content).expect("Failed to write file");
}

/// Remove a file or directory
pub fn remove(path: &Path) {
    if path.is_dir() {
        fs::remove_dir_all(path).expect("Failed to remove directory");
    } else if path.exists() {
        fs::remove_file(path).expect("Failed to remove file");
    }
}

/// List directory contents
pub fn list_dir(path: &Path) -> Vec<String> {
    if !path.is_dir() {
        return vec![];
    }
    fs::read_dir(path)
        .expect("Failed to read directory")
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect()
}

/// Parse YAML frontmatter from markdown content
pub fn parse_frontmatter(content: &str) -> std::collections::HashMap<String, serde_yaml::Value> {
    let re = regex::Regex::new(r"^---\n([\s\S]*?)\n---").unwrap();
    if let Some(captures) = re.captures(content) {
        if let Some(yaml_str) = captures.get(1) {
            if let Ok(parsed) = serde_yaml::from_str::<serde_yaml::Value>(yaml_str.as_str()) {
                if let serde_yaml::Value::Mapping(map) = parsed {
                    return map
                        .into_iter()
                        .filter_map(|(k, v)| {
                            k.as_str().map(|s| (s.to_string(), v))
                        })
                        .collect();
                }
            }
        }
    }
    std::collections::HashMap::new()
}
