//! E2E tests: markdown-only command guards.
//!
//! Confirms that commands that have no non-markdown equivalent surface a
//! clear "markdown adapter required" error when the project's configured
//! adapter is not markdown — and do so before any backend authentication is
//! attempted, so the message stays useful when remote credentials are
//! missing.

mod common;
use common::*;

use std::fs;

fn write_github_adapter_config(cwd: &std::path::Path) {
    fs::write(
        cwd.join("leanspec.adapter.yaml"),
        // `LEANSPEC_TEST_NO_TOKEN` is intentionally not exported anywhere, so
        // any code path that constructs the github adapter authenticates
        // against a missing token and fails. A passing guard must short-
        // circuit before that point.
        "adapter: github\nowner: acme\nrepo: backend\ntoken_env: LEANSPEC_TEST_NO_TOKEN\n",
    )
    .unwrap();
}

fn assert_markdown_only_error(result: &ExecResult, command: &str) {
    assert!(
        !result.success,
        "expected error for '{command}', got stdout: {}",
        result.stdout
    );
    let combined = format!(
        "{}{}",
        result.stderr.to_lowercase(),
        result.stdout.to_lowercase()
    );
    assert!(
        combined.contains("markdown adapter"),
        "expected markdown-only message for '{command}', got: stderr={} stdout={}",
        result.stderr,
        result.stdout
    );
}

#[test]
fn test_validate_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["validate"], cwd);
    assert_markdown_only_error(&result, "validate");
}

#[test]
fn test_gantt_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["gantt"], cwd);
    assert_markdown_only_error(&result, "gantt");
}

#[test]
fn test_deps_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["deps", "001"], cwd);
    assert_markdown_only_error(&result, "deps");
}

#[test]
fn test_tokens_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["tokens"], cwd);
    assert_markdown_only_error(&result, "tokens");
}

#[test]
fn test_timeline_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["timeline"], cwd);
    assert_markdown_only_error(&result, "timeline");
}

#[test]
fn test_check_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["check"], cwd);
    assert_markdown_only_error(&result, "check");
}

#[test]
fn test_backfill_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["backfill"], cwd);
    assert_markdown_only_error(&result, "backfill");
}

#[test]
fn test_analyze_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["analyze", "001"], cwd);
    assert_markdown_only_error(&result, "analyze");
}

#[test]
fn test_compact_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["compact", "001", "--remove", "1-3"], cwd);
    assert_markdown_only_error(&result, "compact");
}

// NOTE: `split` is currently unreachable from `exec_cli` because its
// `--output` long flag clashes with the global `-o/--output` and clap
// panics at startup. The guard is wired up in `commands/split.rs::run`;
// adding a runtime test once the flag conflict is resolved.

#[test]
fn test_templates_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["templates", "--action", "list"], cwd);
    assert_markdown_only_error(&result, "templates");
}

#[test]
fn test_rel_requires_markdown_adapter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    init_project(cwd, true);
    write_github_adapter_config(cwd);

    let result = exec_cli(&["rel", "add", "001", "--depends-on", "002"], cwd);
    assert_markdown_only_error(&result, "rel");
}
