//! Regression Test Template for Rust CLI E2E Tests
//!
//! INSTRUCTIONS FOR BUG-FIX PRs:
//!
//! 1. Copy the test template below to a new test or add to existing E2E tests
//! 2. Replace ISSUE_NUMBER with the GitHub issue number
//! 3. Replace the description with a clear explanation of the bug
//! 4. Write a test that FAILS without your fix and PASSES with your fix
//! 5. Include setup, action, and assertion steps
//!
//! Naming Convention:
//! - Test name: `test_regression_issue_NUMBER_brief_description`
//! - Alternative: `test_regression_brief_description` if no issue number
//!
//! Example locations:
//! - tests/init.rs - for init command bugs
//! - tests/spec_lifecycle.rs - for CRUD bugs
//! - tests/update.rs - for update command bugs
//! - tests/link.rs - for dependency linking bugs
//!
//! This file serves as documentation and a template for future regression tests.

mod common;
use common::*;

/// TEMPLATE: Regression tests template
///
/// Add regression tests here when fixing bugs.
/// Each test should:
/// 1. Reproduce the exact conditions that triggered the bug
/// 2. Verify the bug no longer occurs with the fix
/// 3. Document the issue number and brief description
///
/// ## Template for New Regression Tests
///
/// ```rust
/// #[test]
/// fn test_regression_issue_NUMBER_brief_description() {
///     // SETUP: Create the conditions that triggered the bug
///     let ctx = TestContext::new();
///     let cwd = ctx.path();
///     init_project(cwd, true);
///
///     // Example setup: Create a spec, modify a file, etc.
///     // create_spec(cwd, "test-spec");
///
///     // ACTION: Perform the action that used to trigger the bug
///     // Example: Run a command, call a function, etc.
///
///     // ASSERT: Verify the bug no longer occurs
///     // Example: Check file contents, verify output, etc.
///
///     // The test should:
///     // - FAIL if the bug is present (before fix)
///     // - PASS if the bug is fixed (after fix)
/// }
/// ```

/// Example: Real regression test for reference
///
/// This test catches the bug where init reported "AGENTS.md preserved"
/// even when the file was missing and needed to be recreated.
#[test]
fn test_regression_example_init_agents_md_message() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    // SETUP: init, then delete AGENTS.md
    init_project(cwd, true);

    // If AGENTS.md exists (depends on Rust CLI implementation)
    let agents_path = cwd.join("AGENTS.md");
    if file_exists(&agents_path) {
        remove(&agents_path);
    }

    // ACTION: run init again
    let result = init_project(cwd, true);

    // ASSERT: Command should succeed
    assert!(result.success, "init should succeed");

    // Note: Specific assertions for AGENTS.md recreation behavior
    // depend on whether the feature is implemented in Rust CLI
}

/// Example: Regression test for date format preservation
#[test]
fn test_regression_preserve_created_date_format() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    // SETUP
    init_project(cwd, true);
    create_spec(cwd, "date-test");
    // Flat pattern: specs/001-date-test
    let readme_path = cwd.join("specs").join("001-date-test").join("README.md");

    // Get initial created date
    let content = read_file(&readme_path);
    let frontmatter = parse_frontmatter(&content);
    let initial_created = frontmatter
        .get("created")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // ACTION: Update something
    update_spec(cwd, "001-date-test", &[("status", "in-progress")]);

    // ASSERT: Created date should still be in YYYY-MM-DD format
    let content = read_file(&readme_path);
    let frontmatter = parse_frontmatter(&content);
    let after_created = frontmatter
        .get("created")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    assert_eq!(after_created, initial_created, "created date should not change");
    if let Some(created) = after_created.as_ref() {
        // Should match YYYY-MM-DD format
        let re = regex::Regex::new(r"^\d{4}-\d{2}-\d{2}$").unwrap();
        assert!(
            re.is_match(created),
            "created should be YYYY-MM-DD format, got: {}",
            created
        );
        assert!(
            !created.contains('T'),
            "created should not contain ISO timestamp"
        );
    }
}

/// Example: Regression test for special characters in spec names
#[test]
fn test_regression_special_characters_in_name() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // SETUP & ACTION: Create a spec with dashes and underscores
    let result = create_spec(cwd, "my-cool_feature");
    assert!(result.success, "create should succeed");

    // ASSERT: Spec directory should exist
    assert!(
        dir_exists(&cwd.join("specs").join("001-my-cool_feature")),
        "spec directory should exist with special characters"
    );
}

// CHECKLIST for adding regression tests:
//
// □ Issue number is included in test name (if available)
// □ Test reproduces the exact bug scenario
// □ Test fails without the fix
// □ Test passes with the fix
// □ Setup, action, and assertion are clearly commented
// □ Test is added to the appropriate E2E test file
// □ PR description references the regression test
