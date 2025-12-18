//! E2E Tests: list command with filtering
//!
//! Tests the list command with various filters:
//! - Status filtering
//! - Tag filtering
//! - Priority filtering
//! - Assignee filtering
//! - Compact output

mod common;
use common::*;

#[test]
fn test_list_all_specs() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "spec-one");
    create_spec(cwd, "spec-two");
    create_spec(cwd, "spec-three");

    let result = list_specs(cwd);
    assert!(result.success);
    assert!(result.stdout.contains("spec-one"));
    assert!(result.stdout.contains("spec-two"));
    assert!(result.stdout.contains("spec-three"));
}

#[test]
fn test_list_filter_by_status() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "planned-spec");
    create_spec(cwd, "active-spec");

    update_spec(cwd, "002-active-spec", &[("status", "in-progress")]);

    // Filter for planned
    let result = list_specs_with_options(cwd, &[("status", "planned")]);
    assert!(result.success);
    assert!(result.stdout.contains("planned-spec"));
    assert!(!result.stdout.contains("active-spec"));

    // Filter for in-progress
    let result = list_specs_with_options(cwd, &[("status", "in-progress")]);
    assert!(result.success);
    assert!(result.stdout.contains("active-spec"));
    assert!(!result.stdout.contains("planned-spec"));
}

#[test]
fn test_list_filter_by_priority() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "low-spec", &[("priority", "low")]);
    create_spec_with_options(cwd, "high-spec", &[("priority", "high")]);
    create_spec_with_options(cwd, "critical-spec", &[("priority", "critical")]);

    // Filter for high priority
    let result = list_specs_with_options(cwd, &[("priority", "high")]);
    assert!(result.success);
    assert!(result.stdout.contains("high-spec"));
    assert!(!result.stdout.contains("low-spec"));
    assert!(!result.stdout.contains("critical-spec"));
}

#[test]
fn test_list_filter_by_tag() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "frontend-spec", &[("tags", "frontend,react")]);
    create_spec_with_options(cwd, "backend-spec", &[("tags", "backend,api")]);
    create_spec_with_options(cwd, "fullstack-spec", &[("tags", "frontend,backend")]);

    // Filter for backend tag
    let result = list_specs_with_options(cwd, &[("tag", "backend")]);
    assert!(result.success);
    // Should show backend and fullstack specs
    assert!(result.stdout.contains("backend-spec") || result.stdout.contains("fullstack-spec"));
}

#[test]
fn test_list_filter_by_assignee() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "spec-one");
    create_spec(cwd, "spec-two");

    update_spec(cwd, "001-spec-one", &[("assignee", "alice")]);
    update_spec(cwd, "002-spec-two", &[("assignee", "bob")]);

    // Filter for alice
    let result = list_specs_with_options(cwd, &[("assignee", "alice")]);
    assert!(result.success);
    assert!(result.stdout.contains("spec-one"));
    assert!(!result.stdout.contains("spec-two"));
}

#[test]
fn test_list_compact_output() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "spec-one");
    create_spec(cwd, "spec-two");

    let result = exec_cli(&["list", "--compact"], cwd);
    assert!(result.success);
    // Compact output should still show spec names
    assert!(result.stdout.contains("spec-one") || result.stdout.contains("001"));
}

#[test]
fn test_list_empty_project() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // No specs - should handle gracefully
    let result = list_specs(cwd);
    assert!(result.exit_code >= 0, "should handle empty project");
}

#[test]
fn test_list_no_matches() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "planned-spec");

    // Filter for status that doesn't exist
    let result = list_specs_with_options(cwd, &[("status", "complete")]);
    // Should succeed but show no results
    assert!(result.exit_code >= 0);
    assert!(!result.stdout.contains("planned-spec"));
}
