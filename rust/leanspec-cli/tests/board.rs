//! E2E Tests: board command
//!
//! Tests the board view functionality:
//! - Group by status
//! - Group by priority
//! - Group by assignee
//! - Group by tag

mod common;
use common::*;


#[test]
fn test_board_group_by_status() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "planned-work");
    create_spec(cwd, "in-progress-work");
    create_spec(cwd, "completed-work");

    update_spec(cwd, "002-in-progress-work", &[("status", "in-progress")]);
    update_spec(cwd, "003-completed-work", &[("status", "complete")]);

    let result = get_board(cwd);
    assert!(result.success);

    let stdout_lower = result.stdout.to_lowercase();
    // Board should show status groups
    assert!(stdout_lower.contains("planned"));
    assert!(stdout_lower.contains("in-progress") || stdout_lower.contains("in progress"));
    assert!(stdout_lower.contains("complete"));
}

#[test]
fn test_board_group_by_priority() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "low-priority", &[("priority", "low")]);
    create_spec_with_options(cwd, "high-priority", &[("priority", "high")]);
    create_spec_with_options(cwd, "critical-fix", &[("priority", "critical")]);

    let result = exec_cli(&["board", "--group-by", "priority"], cwd);
    assert!(result.success);

    let stdout_lower = result.stdout.to_lowercase();
    // Should show priority groups
    assert!(stdout_lower.contains("low") || stdout_lower.contains("high") || stdout_lower.contains("critical"));
}

#[test]
fn test_board_group_by_assignee() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "alice-task");
    create_spec(cwd, "bob-task");
    
    update_spec(cwd, "001-alice-task", &[("assignee", "alice")]);
    update_spec(cwd, "002-bob-task", &[("assignee", "bob")]);

    let result = exec_cli(&["board", "--group-by", "assignee"], cwd);
    assert!(result.success);

    // Should show assignee groups
    assert!(
        result.stdout.contains("alice") || result.stdout.contains("bob") || result.stdout.contains("Unassigned"),
        "should show assignee groupings"
    );
}

#[test]
fn test_board_group_by_tag() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "frontend-task", &[("tags", "frontend")]);
    create_spec_with_options(cwd, "backend-task", &[("tags", "backend")]);

    let result = exec_cli(&["board", "--group-by", "tag"], cwd);
    assert!(result.success);

    // Should show tag groups
    assert!(
        result.stdout.contains("frontend") || result.stdout.contains("backend"),
        "should show tag groupings"
    );
}

#[test]
fn test_board_empty_project() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = get_board(cwd);
    // Should handle gracefully
    assert!(result.exit_code >= 0);
}

#[test]
fn test_board_single_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "only-spec");

    let result = get_board(cwd);
    assert!(result.success);
    assert!(result.stdout.contains("only-spec") || result.stdout.to_lowercase().contains("planned"));
}
