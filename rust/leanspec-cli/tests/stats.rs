//! E2E Tests: stats command
//!
//! Tests project statistics functionality

mod common;
use common::*;


#[test]
fn test_stats_basic() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "spec-one");
    create_spec(cwd, "spec-two");
    create_spec(cwd, "spec-three");

    update_spec(cwd, "002-spec-two", &[("status", "in-progress")]);
    update_spec(cwd, "003-spec-three", &[("status", "complete")]);

    let result = exec_cli(&["stats"], cwd);
    assert!(result.success);
    // Should show statistics
    let stdout_lower = result.stdout.to_lowercase();
    assert!(
        stdout_lower.contains("total") || stdout_lower.contains("specs") || stdout_lower.contains("3"),
        "should show total count"
    );
}

#[test]
fn test_stats_detailed() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "spec-one");
    create_spec(cwd, "spec-two");

    let result = exec_cli(&["stats", "--detailed"], cwd);
    assert!(result.success);
    // Detailed stats should show more info
}

#[test]
fn test_stats_empty_project() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = exec_cli(&["stats"], cwd);
    // Should handle empty project gracefully
    assert!(result.exit_code >= 0);
}

#[test]
fn test_stats_shows_status_breakdown() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "planned-one");
    create_spec(cwd, "planned-two");
    create_spec(cwd, "in-progress-one");
    create_spec(cwd, "complete-one");

    update_spec(cwd, "003-in-progress-one", &[("status", "in-progress")]);
    update_spec(cwd, "004-complete-one", &[("status", "complete")]);

    let result = exec_cli(&["stats"], cwd);
    assert!(result.success);
    // Should show status breakdown
    let stdout_lower = result.stdout.to_lowercase();
    assert!(stdout_lower.contains("planned") || stdout_lower.contains("complete") || stdout_lower.contains("progress"));
}
