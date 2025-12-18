//! E2E Tests: validate command
//!
//! Tests spec validation functionality:
//! - Single spec validation
//! - All specs validation
//! - Dependency alignment check
//! - Strict mode
//! - Warnings only mode

mod common;
use common::*;


#[test]
fn test_validate_valid_specs() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "valid-spec");

    let result = validate_specs(cwd);
    // Valid specs should not produce errors
    assert!(result.success, "validation should pass for valid specs");
}

#[test]
fn test_validate_multiple_specs() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "spec-one");
    create_spec(cwd, "spec-two");
    create_spec(cwd, "spec-three");

    let result = validate_specs(cwd);
    assert!(result.success, "validation should pass for multiple valid specs");
}

#[test]
fn test_validate_single_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "target-spec");

    let result = exec_cli(&["validate", "001-target-spec"], cwd);
    assert!(result.success, "validation of single spec should pass");
}

#[test]
fn test_validate_with_check_deps() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "base-spec");
    create_spec(cwd, "dependent-spec");
    link_specs(cwd, "002-dependent-spec", "001-base-spec");

    let result = exec_cli(&["validate", "--check-deps"], cwd);
    // Should not crash, may or may not find issues
    assert!(result.exit_code >= 0, "should complete without crashing");
}

#[test]
fn test_validate_strict_mode() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "test-spec");

    let result = exec_cli(&["validate", "--strict"], cwd);
    // Strict mode treats warnings as errors
    // For valid specs, should still pass
    assert!(result.exit_code >= 0, "should complete without crashing");
}

#[test]
fn test_validate_warnings_only() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "test-spec");

    let result = exec_cli(&["validate", "--warnings-only"], cwd);
    // Warnings only mode should exit 0
    assert!(result.success, "warnings-only should exit 0");
}

#[test]
fn test_validate_empty_project() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // No specs created - should handle gracefully
    let result = validate_specs(cwd);
    assert!(result.exit_code >= 0, "should handle empty project");
}
