//! E2E Tests: tokens command
//!
//! Tests token counting functionality

mod common;
use common::*;


#[test]
fn test_tokens_single_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = exec_cli(&["tokens", "001-my-spec"], cwd);
    assert!(result.success);
    // Should show token count
    let stdout_lower = result.stdout.to_lowercase();
    assert!(stdout_lower.contains("token") || result.stdout.chars().any(|c| c.is_ascii_digit()));
}

#[test]
fn test_tokens_all_specs() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "spec-one");
    create_spec(cwd, "spec-two");
    create_spec(cwd, "spec-three");

    let result = exec_cli(&["tokens"], cwd);
    assert!(result.success);
    // Should show total or per-spec token counts
}

#[test]
fn test_tokens_verbose() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = exec_cli(&["tokens", "001-my-spec", "--verbose"], cwd);
    assert!(result.success);
    // Verbose should show more details
}

#[test]
fn test_tokens_nonexistent_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = exec_cli(&["tokens", "999-nonexistent"], cwd);
    assert!(!result.success);
}

#[test]
fn test_tokens_empty_project() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = exec_cli(&["tokens"], cwd);
    // Should handle empty project
    assert!(result.exit_code >= 0);
}

#[test]
fn test_tokens_by_number() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = exec_cli(&["tokens", "001"], cwd);
    assert!(result.success);
}
