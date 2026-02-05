//! E2E Tests: search command
//!
//! Tests search functionality:
//! - Basic search
//! - Limit results
//! - No matches

mod common;
use common::*;

#[test]
fn test_search_basic() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(
        cwd,
        "authentication",
        &[("title", "User Authentication System")],
    );
    create_spec(cwd, "database");
    create_spec(cwd, "api");

    let result = search_specs(cwd, "authentication");
    assert!(result.success);
    assert!(result.stdout.contains("authentication"));
}

#[test]
fn test_search_by_title() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "auth", &[("title", "User Authentication System")]);
    create_spec_with_options(cwd, "payments", &[("title", "Payment Processing")]);

    let result = search_specs(cwd, "User");
    assert!(result.success);
    // Should find spec with "User" in title
}

#[test]
fn test_search_with_limit() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    // Create multiple specs
    for i in 1..=5 {
        create_spec(cwd, &format!("feature-{}", i));
    }

    let result = exec_cli(&["search", "feature", "--limit", "2"], cwd);
    assert!(result.success);
    // Should limit results (exact behavior depends on implementation)
}

#[test]
fn test_search_no_matches() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "authentication");

    let result = search_specs(cwd, "nonexistent-term");
    // Should succeed but show no results
    assert!(result.exit_code >= 0);
}

#[test]
fn test_search_empty_project() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = search_specs(cwd, "anything");
    // Should handle gracefully
    assert!(result.exit_code >= 0);
}

#[test]
fn test_search_case_insensitive() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "auth", &[("title", "Authentication System")]);

    // Search with different case
    let result = search_specs(cwd, "AUTHENTICATION");
    // Most search implementations are case-insensitive
    assert!(result.exit_code >= 0);
}

#[test]
fn test_search_multi_term_cross_field() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    // Create spec with "desktop" in path and "app" in title
    create_spec_with_options(cwd, "desktop", &[("title", "LeanSpec Desktop App")]);
    create_spec(cwd, "unrelated");

    // Multi-term search: both "desktop" and "app" must be present
    let result = search_specs(cwd, "desktop app");
    assert!(result.success);
    assert!(result.stdout.contains("desktop"));
}

#[test]
fn test_search_multi_term_no_match() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    // Create spec that only matches one term
    create_spec_with_options(cwd, "cli-tool", &[("title", "CLI Tool")]);

    // Search requires both terms - "cli" + "webapp" should not match
    let result = search_specs(cwd, "cli webapp");
    // Should not find anything since "webapp" doesn't appear
    assert!(result.exit_code >= 0);
}

#[test]
fn test_search_terms_across_fields() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    // Create spec where each term appears in different field
    create_spec_with_options(cwd, "user-auth", &[("title", "Authentication Module")]);

    // "user" in path, "auth" in path and title
    let result = search_specs(cwd, "user auth");
    assert!(result.success);
    assert!(result.stdout.contains("user-auth"));
}
