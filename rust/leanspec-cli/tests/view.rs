//! E2E Tests: view command
//!
//! Tests viewing spec content:
//! - View by full name
//! - View by number
//! - View raw markdown
//! - Nonexistent spec

mod common;
use common::*;


#[test]
fn test_view_by_full_name() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "my-feature", &[("title", "My Amazing Feature")]);

    let result = view_spec(cwd, "001-my-feature");
    assert!(result.success);
    // Should show spec content
    assert!(result.stdout.contains("my-feature") || result.stdout.contains("My Amazing Feature"));
}

#[test]
fn test_view_by_number() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "authentication-system");

    let result = view_spec(cwd, "001");
    assert!(result.success);
    assert!(result.stdout.contains("authentication"));
}

#[test]
fn test_view_raw_markdown() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = exec_cli(&["view", "001-my-spec", "--raw"], cwd);
    assert!(result.success);
    // Raw output should contain frontmatter delimiters
    assert!(result.stdout.contains("---") || result.stdout.contains("status"));
}

#[test]
fn test_view_nonexistent_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = view_spec(cwd, "999-nonexistent");
    assert!(!result.success);
}

#[test]
fn test_view_shows_frontmatter_fields() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "detailed-spec", &[
        ("priority", "high"),
        ("tags", "api,v2"),
    ]);

    let result = view_spec(cwd, "001-detailed-spec");
    assert!(result.success);
    // View should show metadata
    let stdout_lower = result.stdout.to_lowercase();
    assert!(stdout_lower.contains("high") || stdout_lower.contains("priority"));
}
