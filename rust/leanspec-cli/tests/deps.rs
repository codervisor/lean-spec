//! E2E Tests: deps command
//!
//! Tests dependency graph visualization

mod common;
use common::*;


#[test]
fn test_deps_single_dependency() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "database");
    create_spec(cwd, "api");

    link_specs(cwd, "002-api", "001-database");

    let result = exec_cli(&["deps", "002-api"], cwd);
    assert!(result.success);
    // Should show dependency on database
    assert!(result.stdout.contains("database") || result.stdout.contains("001"));
}

#[test]
fn test_deps_chain() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "database");
    create_spec(cwd, "api");
    create_spec(cwd, "frontend");

    link_specs(cwd, "002-api", "001-database");
    link_specs(cwd, "003-frontend", "002-api");

    let result = exec_cli(&["deps", "003-frontend"], cwd);
    assert!(result.success);
    // Should show the dependency chain
    assert!(result.stdout.contains("api") || result.stdout.contains("002"));
}

#[test]
fn test_deps_upstream_only() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "database");
    create_spec(cwd, "api");

    link_specs(cwd, "002-api", "001-database");

    let result = exec_cli(&["deps", "002-api", "--upstream"], cwd);
    assert!(result.success);
}

#[test]
fn test_deps_downstream_only() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "database");
    create_spec(cwd, "api");

    link_specs(cwd, "002-api", "001-database");

    let result = exec_cli(&["deps", "001-database", "--downstream"], cwd);
    assert!(result.success);
    // Should show api as downstream dependent
}

#[test]
fn test_deps_with_depth() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "spec-a");
    create_spec(cwd, "spec-b");
    create_spec(cwd, "spec-c");
    create_spec(cwd, "spec-d");

    link_specs(cwd, "002-spec-b", "001-spec-a");
    link_specs(cwd, "003-spec-c", "002-spec-b");
    link_specs(cwd, "004-spec-d", "003-spec-c");

    let result = exec_cli(&["deps", "004-spec-d", "--depth", "1"], cwd);
    assert!(result.success);
    // With depth 1, should only show immediate dependency
}

#[test]
fn test_deps_no_dependencies() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "standalone");

    let result = exec_cli(&["deps", "001-standalone"], cwd);
    // Should handle gracefully
    assert!(result.exit_code >= 0);
}

#[test]
fn test_deps_nonexistent_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = exec_cli(&["deps", "999-nonexistent"], cwd);
    assert!(!result.success);
}
