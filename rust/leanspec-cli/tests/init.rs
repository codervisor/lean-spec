//! E2E Tests: init command scenarios
//!
//! Tests the `lean-spec init` command in realistic scenarios including:
//! - Fresh initialization
//! - Re-initialization (upgrade mode)
//! - Force reset
//! - AGENTS.md preservation and creation
//!
//! Note: Some tests are marked #[ignore] because they test features
//! not yet implemented in the Rust CLI.

mod common;
use common::*;
use std::env;

#[test]
fn test_init_fresh_project_with_yes_flag() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    let result = init_project(cwd, true);

    assert!(result.success, "init should succeed");
    assert!(
        result.stdout.to_lowercase().contains("initialized")
            || result.stdout.to_lowercase().contains("leanspec")
            || result.stdout.to_lowercase().contains("success"),
        "should mention initialization: {}",
        result.stdout
    );

    // Verify directory structure
    assert!(
        dir_exists(&cwd.join(".lean-spec")),
        ".lean-spec should exist"
    );
    assert!(dir_exists(&cwd.join("specs")), "specs should exist");
    assert!(
        file_exists(&cwd.join(".lean-spec").join("config.json")),
        "config.json should exist"
    );
}

#[test]
fn test_init_creates_agents_md_with_substitution() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let agents_content = read_file(&cwd.join("AGENTS.md"));

    // Should have substituted {project_name}
    assert!(
        !agents_content.contains("{project_name}"),
        "should substitute project_name"
    );
    // Should contain LeanSpec instructions
    assert!(
        agents_content.to_lowercase().contains("leanspec")
            || agents_content.to_lowercase().contains("lean-spec"),
        "should contain leanspec instructions"
    );
}

#[test]
fn test_init_creates_config_with_defaults() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let config_content = read_file(&cwd.join(".lean-spec").join("config.json"));
    let config: serde_json::Value = serde_json::from_str(&config_content).expect("valid JSON");

    // Check default values - Rust implementation uses different field names
    assert!(
        config.get("specsDir").is_some() || config.get("specs_dir").is_some(),
        "should have specsDir"
    );
}

#[test]
fn test_init_creates_templates_directory() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let templates_dir = cwd.join(".lean-spec").join("templates");
    assert!(
        dir_exists(&templates_dir),
        "templates directory should exist"
    );
}

#[test]
fn test_reinit_upgrade_preserves_specs() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    // First: initialize
    init_project(cwd, true);

    // Create a spec
    create_spec(cwd, "my-feature");

    // Verify spec exists
    let specs_dir = cwd.join("specs");
    let specs_before: Vec<_> = list_dir(&specs_dir)
        .into_iter()
        .filter(|s| !s.starts_with('.'))
        .collect();
    assert!(!specs_before.is_empty(), "should have specs");

    // Re-initialize with -y (should upgrade)
    let result = init_project(cwd, true);
    assert!(result.success);

    // Specs should still exist
    let specs_after: Vec<_> = list_dir(&specs_dir)
        .into_iter()
        .filter(|s| !s.starts_with('.'))
        .collect();
    assert_eq!(
        specs_after.len(),
        specs_before.len(),
        "specs should be preserved"
    );
}

#[test]
fn test_reinit_preserves_existing_agents_md() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    // Initialize
    init_project(cwd, true);

    // Modify AGENTS.md with custom content (create it since Rust init doesn't)
    let agents_path = cwd.join("AGENTS.md");
    let custom_content = "# Custom Agent Instructions\n\nMy custom instructions here.";
    write_file(&agents_path, custom_content);

    // Re-initialize (upgrade mode)
    let result = init_project(cwd, true);
    assert!(result.success);

    // AGENTS.md should still have custom content
    let agents_after = read_file(&agents_path);
    assert_eq!(
        agents_after, custom_content,
        "AGENTS.md should be preserved"
    );
}

#[test]
fn test_reinit_recreates_missing_agents_md() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    // Initialize
    init_project(cwd, true);

    // Delete AGENTS.md
    let agents_path = cwd.join("AGENTS.md");
    remove(&agents_path);
    assert!(!file_exists(&agents_path), "AGENTS.md should be deleted");

    // Re-initialize (upgrade mode)
    let result = init_project(cwd, true);
    assert!(result.success);

    // AGENTS.md should be recreated
    assert!(file_exists(&agents_path), "AGENTS.md should be recreated");
}

struct EnvGuard {
    key: &'static str,
    previous: Option<String>,
}

impl EnvGuard {
    fn set(key: &'static str, value: &str) -> Self {
        let previous = env::var(key).ok();
        env::set_var(key, value);
        Self { key, previous }
    }
}

impl Drop for EnvGuard {
    fn drop(&mut self) {
        if let Some(prev) = &self.previous {
            env::set_var(self.key, prev);
        } else {
            env::remove_var(self.key);
        }
    }
}

#[test]
fn test_init_installs_skills_by_default() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    let result = init_project(cwd, true);
    assert!(result.success, "init should succeed");

    let skill_path = cwd.join(".github/skills/leanspec-sdd/SKILL.md");
    assert!(file_exists(&skill_path), "leanspec-sdd skill should be installed");
}

#[test]
fn test_init_creates_claude_symlink_when_detected() {
    let _guard = EnvGuard::set("ANTHROPIC_API_KEY", "test-key");
    let ctx = TestContext::new();
    let cwd = ctx.path();

    let result = init_project(cwd, true);
    assert!(result.success, "init should succeed");

    assert!(
        file_exists(&cwd.join("CLAUDE.md")),
        "CLAUDE.md should be created when Claude is detected"
    );
}

#[test]
fn test_init_writes_vscode_mcp_config_when_detected() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    // Presence of .vscode triggers detection
    let vscode_dir = cwd.join(".vscode");
    std::fs::create_dir_all(&vscode_dir).expect("create .vscode");

    let result = init_project(cwd, true);
    assert!(result.success, "init should succeed");

    let mcp_config = vscode_dir.join("mcp.json");
    assert!(file_exists(&mcp_config), "mcp.json should be generated for VS Code");
    let contents = read_file(&mcp_config);
    assert!(
        contents.contains("lean-spec"),
        "mcp.json should register lean-spec server"
    );
}

#[test]
#[ignore = "template selection not implemented in Rust CLI yet"]
fn test_init_with_standard_template() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    let result = exec_cli(&["init", "-y", "--template", "standard"], cwd);
    assert!(result.success);

    let config = serde_json::from_str::<serde_json::Value>(&read_file(
        &cwd.join(".lean-spec").join("config.json"),
    ))
    .expect("valid JSON");

    // Should use standard template
    let template = config
        .get("template")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    assert!(
        template.contains("spec-template") || template.contains("standard"),
        "should use standard template"
    );
}

#[test]
#[ignore = "template selection not implemented in Rust CLI yet"]
fn test_init_with_detailed_template() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    let result = exec_cli(&["init", "-y", "--template", "detailed"], cwd);
    assert!(result.success);

    let config = serde_json::from_str::<serde_json::Value>(&read_file(
        &cwd.join(".lean-spec").join("config.json"),
    ))
    .expect("valid JSON");

    // Should use detailed template
    let template = config
        .get("template")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    assert!(
        template.contains("README") || template.contains("detailed"),
        "should use detailed template"
    );
}

// Regression tests

#[test]
fn test_regression_agents_md_not_preserved_when_deleted() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    // Setup: init, then delete AGENTS.md
    init_project(cwd, true);
    let agents_path = cwd.join("AGENTS.md");
    remove(&agents_path);

    // Action: run init again
    let result = init_project(cwd, true);

    // Assert:
    // 1. Command should succeed
    assert!(result.success);

    // 2. File must exist
    assert!(file_exists(&agents_path), "AGENTS.md should be recreated");
}

#[test]
fn test_regression_preserve_missing_templates() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    // Setup: init, then delete templates
    init_project(cwd, true);
    let templates_dir = cwd.join(".lean-spec").join("templates");
    remove(&templates_dir);

    // Action: run init again (upgrade mode)
    let result = init_project(cwd, true);
    assert!(result.success);

    // Templates should be recreated
    assert!(dir_exists(&templates_dir), "templates should be recreated");
}
