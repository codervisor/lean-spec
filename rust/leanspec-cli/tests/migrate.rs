//! E2E tests: `migrate` command.
//!
//! Covers both modes:
//!   * `--to <adapter>` — cross-adapter migration
//!   * `<input_path>` — legacy importer of external spec dirs

mod common;
use common::*;

use std::fs;

fn write_github_adapter_config(cwd: &std::path::Path) {
    fs::write(
        cwd.join("leanspec.adapter.yaml"),
        // Token env intentionally unset — guards / pre-flight checks must
        // short-circuit before any backend auth attempt.
        "adapter: github\nowner: acme\nrepo: backend\ntoken_env: LEANSPEC_TEST_NO_TOKEN\n",
    )
    .unwrap();
}

#[test]
fn test_migrate_to_without_config_emits_helpful_error() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);

    // No `leanspec.adapter.github.yaml` exists — the command must explain
    // *exactly* what to create rather than crashing on the missing target.
    let result = exec_cli(&["migrate", "--to", "github"], cwd);
    assert!(
        !result.success,
        "expected failure, stdout: {}",
        result.stdout
    );
    let combined = format!("{}{}", result.stderr, result.stdout);
    assert!(
        combined.contains("leanspec.adapter.github.yaml"),
        "expected config-path hint, got: {combined}"
    );
}

#[test]
fn test_migrate_to_requires_markdown_source() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    // Source is already github (per config above), so the cross-adapter
    // migrate must surface the markdown-only restriction before trying to
    // contact GitHub for either the source or the target adapter.
    let result = exec_cli(&["migrate", "--to", "github"], cwd);
    assert!(!result.success);
    let combined = format!(
        "{}{}",
        result.stderr.to_lowercase(),
        result.stdout.to_lowercase()
    );
    assert!(
        combined.contains("markdown adapter"),
        "expected markdown-only message, got: {combined}"
    );
}

#[test]
fn test_migrate_legacy_importer_dry_run() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);

    // External tree resembling a tiny spec-kit project.
    let external = cwd.join("external");
    fs::create_dir_all(external.join("feature-a")).unwrap();
    fs::write(external.join("feature-a").join("spec.md"), "# Feature A\n").unwrap();

    let result = exec_cli(
        &["migrate", external.to_str().unwrap(), "--auto", "--dry-run"],
        cwd,
    );
    assert!(
        result.success,
        "legacy migrate dry-run should succeed, stderr: {}",
        result.stderr
    );
    assert!(
        result.stdout.contains("001-feature-a"),
        "expected target path in dry-run output, got: {}",
        result.stdout
    );
    // Nothing should have been created on disk.
    assert!(!cwd.join("specs").join("001-feature-a").exists());
}

#[test]
fn test_migrate_requires_target_or_input() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);

    let result = exec_cli(&["migrate"], cwd);
    assert!(!result.success, "expected error when no mode is selected");
    let combined = format!("{}{}", result.stderr, result.stdout);
    assert!(
        combined.contains("--to") || combined.to_lowercase().contains("input path"),
        "expected usage hint, got: {combined}"
    );
}

#[test]
fn test_migrate_rejects_input_path_with_to_flag() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);

    let external = cwd.join("external");
    fs::create_dir_all(&external).unwrap();

    // Clap is configured with `conflicts_with` so this should fail before
    // any of the actual command logic runs.
    let result = exec_cli(
        &["migrate", external.to_str().unwrap(), "--to", "github"],
        cwd,
    );
    assert!(!result.success, "expected clap conflict error");
    let combined = format!("{}{}", result.stderr, result.stdout).to_lowercase();
    assert!(
        combined.contains("cannot be used") || combined.contains("conflict"),
        "expected clap conflict hint, got: {combined}"
    );
}
