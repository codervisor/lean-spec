//! Test helper utilities for E2E and integration tests
//!
//! Provides utilities similar to the TypeScript e2e-helpers.ts for:
//! - Creating isolated test environments
//! - Executing CLI commands
//! - File and directory assertions
//! - Frontmatter parsing

#![allow(dead_code)]

use assert_cmd::cargo::cargo_bin_cmd;
use std::fs;
use std::path::Path;
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
    exec_cli_env(args, cwd, &[])
}

/// Execute a CLI command with extra environment variables
pub fn exec_cli_env(args: &[&str], cwd: &Path, env: &[(&str, &str)]) -> ExecResult {
    let mut cmd = cargo_bin_cmd!("lean-spec");
    cmd.args(args).current_dir(cwd).env("NO_COLOR", "1");
    for (key, value) in env {
        cmd.env(key, value);
    }
    let output = cmd.output().expect("Failed to execute command");

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
    let mut args = vec![
        "update".to_string(),
        spec.to_string(),
        "--force".to_string(),
    ];
    for (key, value) in options {
        args.push(format!("--{}", key));
        args.push(value.to_string());
    }
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    exec_cli(&args_refs, cwd)
}

/// Link specs using the CLI (rel add --depends-on)
pub fn link_specs(cwd: &Path, spec: &str, depends_on: &str) -> ExecResult {
    exec_cli(&["rel", "add", spec, "--depends-on", depends_on], cwd)
}

/// Unlink specs using the CLI (rel rm --depends-on)
#[allow(dead_code)]
pub fn unlink_specs(cwd: &Path, spec: &str, depends_on: &str) -> ExecResult {
    exec_cli(&["rel", "rm", spec, "--depends-on", depends_on], cwd)
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
            if let Ok(serde_yaml::Value::Mapping(map)) =
                serde_yaml::from_str::<serde_yaml::Value>(yaml_str.as_str())
            {
                return map
                    .into_iter()
                    .filter_map(|(k, v)| k.as_str().map(|s| (s.to_string(), v)))
                    .collect();
            }
        }
    }
    std::collections::HashMap::new()
}

/// Write a runners.json file with a simple echo test runner into the project's .lean-spec dir
pub fn write_test_runner(cwd: &Path, runner_id: &str) {
    let lean_spec_dir = cwd.join(".lean-spec");
    fs::create_dir_all(&lean_spec_dir).expect("Failed to create .lean-spec dir");
    let runners_json = format!(
        r#"{{
  "$schema": "https://leanspec.dev/schemas/runners.json",
  "runners": {{
    "{runner_id}": {{
      "name": "Test Runner",
      "command": "echo",
      "args": ["session-output"]
    }}
  }},
  "default": "{runner_id}"
}}"#
    );
    fs::write(lean_spec_dir.join("runners.json"), runners_json)
        .expect("Failed to write runners.json");
}

/// Create a session via the CLI; returns the ExecResult
pub fn session_create(
    cwd: &Path,
    home: &Path,
    project_path: &str,
    runner: Option<&str>,
    specs: &[&str],
    prompt: Option<&str>,
) -> ExecResult {
    let mut args = vec!["session", "create", "--project-path", project_path];
    if let Some(r) = runner {
        args.extend_from_slice(&["--runner", r]);
    }
    for spec in specs {
        args.extend_from_slice(&["--spec", spec]);
    }
    if let Some(p) = prompt {
        args.extend_from_slice(&["--prompt", p]);
    }
    exec_cli_env(&args, cwd, &[("HOME", home.to_str().unwrap())])
}

/// Run a session (create + start) via the CLI; returns the ExecResult
pub fn session_run(
    cwd: &Path,
    home: &Path,
    project_path: &str,
    runner: Option<&str>,
    specs: &[&str],
    prompt: Option<&str>,
) -> ExecResult {
    let mut args = vec!["session", "run", "--project-path", project_path];
    if let Some(r) = runner {
        args.extend_from_slice(&["--runner", r]);
    }
    for spec in specs {
        args.extend_from_slice(&["--spec", spec]);
    }
    if let Some(p) = prompt {
        args.extend_from_slice(&["--prompt", p]);
    }
    exec_cli_env(&args, cwd, &[("HOME", home.to_str().unwrap())])
}

/// List sessions via the CLI
pub fn session_list(cwd: &Path, home: &Path) -> ExecResult {
    exec_cli_env(
        &["session", "list"],
        cwd,
        &[("HOME", home.to_str().unwrap())],
    )
}

/// View a session via the CLI
pub fn session_view(cwd: &Path, home: &Path, session_id: &str) -> ExecResult {
    exec_cli_env(
        &["session", "view", session_id],
        cwd,
        &[("HOME", home.to_str().unwrap())],
    )
}

/// Delete a session via the CLI
pub fn session_delete(cwd: &Path, home: &Path, session_id: &str) -> ExecResult {
    exec_cli_env(
        &["session", "delete", session_id],
        cwd,
        &[("HOME", home.to_str().unwrap())],
    )
}

/// Parse a session ID from the `session create` / `session run` stdout output
/// Looks for "Created session <uuid>" in the output
pub fn parse_session_id(output: &str) -> Option<String> {
    for line in output.lines() {
        // Line format: "✓ Created session <uuid> (<runner>)"
        if let Some(rest) = line.split("Created session ").nth(1) {
            let id = rest.split_whitespace().next()?.to_string();
            if id.len() == 36 && id.chars().filter(|c| *c == '-').count() == 4 {
                return Some(id);
            }
        }
    }
    None
}
