//! E2E Tests: spec lifecycle scenarios
//!
//! Tests the full lifecycle of specs from creation through archival:
//! - Create specs with various options
//! - Update status, priority, tags
//! - Link specs together (depends_on)
//! - Archive completed specs

mod common;
use common::*;

use std::path::Path;

#[test]
fn test_create_update_archive_workflow() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    // Initialize project
    let result = init_project(cwd, true);
    assert!(result.success, "init should succeed");

    // Step 1: Create a spec
    let result = create_spec(cwd, "my-feature");
    assert!(result.success, "create should succeed");

    // Verify spec was created (flat pattern: specs/001-my-feature)
    let spec_dir = cwd.join("specs").join("001-my-feature");
    assert!(dir_exists(&spec_dir), "spec directory should exist");

    // Check initial status
    let readme_path = spec_dir.join("README.md");
    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);
    assert_eq!(
        fm.get("status").and_then(|v| v.as_str()),
        Some("planned"),
        "initial status should be planned"
    );

    // Step 2: Update to in-progress
    let result = update_spec(cwd, "001-my-feature", &[("status", "in-progress")]);
    assert!(result.success, "update to in-progress should succeed");

    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);
    assert_eq!(
        fm.get("status").and_then(|v| v.as_str()),
        Some("in-progress")
    );

    // Step 3: Update to complete (with force since spec has checkboxes)
    let result = update_spec_force(cwd, "001-my-feature", &[("status", "complete")]);
    assert!(result.success, "update to complete should succeed");

    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);
    assert_eq!(fm.get("status").and_then(|v| v.as_str()), Some("complete"));

    // Step 4: Archive
    let result = archive_spec(cwd, "001-my-feature");
    assert!(result.success, "archive should succeed");

    // Original location should be gone
    assert!(!dir_exists(&spec_dir), "original spec dir should be gone");

    // Should be in archived folder
    let archived_dir = cwd.join("specs").join("archived").join("001-my-feature");
    assert!(
        dir_exists(&archived_dir),
        "spec should be in archived folder"
    );
}

#[test]
fn test_create_multiple_specs_sequential_numbering() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    create_spec(cwd, "feature-a");
    create_spec(cwd, "feature-b");
    create_spec(cwd, "feature-c");

    // Check sequential numbering (flat pattern)
    assert!(dir_exists(&cwd.join("specs").join("001-feature-a")));
    assert!(dir_exists(&cwd.join("specs").join("002-feature-b")));
    assert!(dir_exists(&cwd.join("specs").join("003-feature-c")));

    // List should show all three
    let result = list_specs(cwd);
    assert!(result.success);
    assert!(result.stdout.contains("feature-a"));
    assert!(result.stdout.contains("feature-b"));
    assert!(result.stdout.contains("feature-c"));
}

#[test]
fn test_create_spec_with_priority() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec_with_options(cwd, "urgent-fix", &[("priority", "high")]);
    assert!(result.success);

    let readme_path = cwd.join("specs").join("001-urgent-fix").join("README.md");
    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);

    assert_eq!(fm.get("priority").and_then(|v| v.as_str()), Some("high"));
}

#[test]
fn test_create_spec_with_tags() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec_with_options(cwd, "auth-system", &[("tags", "security,backend")]);
    assert!(result.success);

    let readme_path = cwd.join("specs").join("001-auth-system").join("README.md");
    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);

    if let Some(serde_yaml::Value::Sequence(tags)) = fm.get("tags") {
        let tag_strs: Vec<&str> = tags.iter().filter_map(|v| v.as_str()).collect();
        assert!(tag_strs.contains(&"security"), "should have security tag");
        assert!(tag_strs.contains(&"backend"), "should have backend tag");
    } else {
        panic!("Expected tags to be a sequence");
    }
}

#[test]
fn test_update_priority() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = update_spec(cwd, "001-my-spec", &[("priority", "critical")]);
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    let fm = parse_frontmatter(&content);

    assert_eq!(
        fm.get("priority").and_then(|v| v.as_str()),
        Some("critical")
    );
}

#[test]
fn test_update_assignee() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = update_spec(cwd, "001-my-spec", &[("assignee", "john-doe")]);
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    let fm = parse_frontmatter(&content);

    assert_eq!(
        fm.get("assignee").and_then(|v| v.as_str()),
        Some("john-doe")
    );
}

#[test]
fn test_link_specs_depends_on() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "database");
    create_spec(cwd, "api");

    // API depends on database
    let result = link_specs(cwd, "002-api", "001-database");
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("002-api").join("README.md"));
    let fm = parse_frontmatter(&content);

    if let Some(serde_yaml::Value::Sequence(deps)) = fm.get("depends_on") {
        let dep_strs: Vec<&str> = deps.iter().filter_map(|v| v.as_str()).collect();
        assert!(dep_strs.contains(&"001-database"));
    } else {
        panic!("Expected depends_on to be a sequence");
    }
}

#[test]
fn test_link_specs_dependency_chain() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "database");
    create_spec(cwd, "api");
    create_spec(cwd, "frontend");

    // frontend → api → database
    link_specs(cwd, "002-api", "001-database");
    link_specs(cwd, "003-frontend", "002-api");

    let api_content = read_file(&cwd.join("specs").join("002-api").join("README.md"));
    let api_fm = parse_frontmatter(&api_content);
    if let Some(serde_yaml::Value::Sequence(deps)) = api_fm.get("depends_on") {
        let dep_strs: Vec<&str> = deps.iter().filter_map(|v| v.as_str()).collect();
        assert!(dep_strs.contains(&"001-database"));
    }

    let frontend_content = read_file(&cwd.join("specs").join("003-frontend").join("README.md"));
    let frontend_fm = parse_frontmatter(&frontend_content);
    if let Some(serde_yaml::Value::Sequence(deps)) = frontend_fm.get("depends_on") {
        let dep_strs: Vec<&str> = deps.iter().filter_map(|v| v.as_str()).collect();
        assert!(dep_strs.contains(&"002-api"));
    }
}

#[test]
fn test_list_specs_by_status() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "planned-spec");
    create_spec(cwd, "active-spec");
    create_spec(cwd, "done-spec");

    update_spec(cwd, "002-active-spec", &[("status", "in-progress")]);
    update_spec_force(cwd, "003-done-spec", &[("status", "complete")]);

    // Filter by status
    let result = list_specs_with_options(cwd, &[("status", "in-progress")]);
    assert!(result.stdout.contains("active-spec"));
    assert!(!result.stdout.contains("planned-spec"));
    assert!(!result.stdout.contains("done-spec"));

    let result = list_specs_with_options(cwd, &[("status", "complete")]);
    assert!(result.stdout.contains("done-spec"));
}

#[test]
fn test_list_specs_by_priority() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "low-priority", &[("priority", "low")]);
    create_spec_with_options(cwd, "high-priority", &[("priority", "high")]);
    create_spec_with_options(cwd, "critical-fix", &[("priority", "critical")]);

    let result = list_specs_with_options(cwd, &[("priority", "high")]);
    assert!(result.stdout.contains("high-priority"));
    assert!(!result.stdout.contains("low-priority"));
}

#[test]
fn test_archived_specs_not_listed_by_default() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "active-spec");
    create_spec(cwd, "archived-spec");

    update_spec_force(cwd, "002-archived-spec", &[("status", "complete")]);
    archive_spec(cwd, "002-archived-spec");

    let result = list_specs(cwd);
    assert!(
        result.stdout.contains("active-spec"),
        "should list active spec"
    );
    assert!(
        !result.stdout.contains("002-archived-spec"),
        "should not list archived spec"
    );
}

#[test]
fn test_board_shows_specs_by_status() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "planned-work");
    create_spec(cwd, "in-progress-work");
    create_spec(cwd, "completed-work");

    update_spec(cwd, "002-in-progress-work", &[("status", "in-progress")]);
    update_spec_force(cwd, "003-completed-work", &[("status", "complete")]);

    let result = get_board(cwd);
    assert!(result.success);

    // Board should have columns for each status
    let stdout_lower = result.stdout.to_lowercase();
    assert!(stdout_lower.contains("planned"));
    assert!(stdout_lower.contains("in-progress") || stdout_lower.contains("in progress"));
    assert!(stdout_lower.contains("complete"));
}

#[test]
fn test_view_spec_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "my-feature", &[("title", "My Amazing Feature")]);

    let result = view_spec(cwd, "001-my-feature");
    assert!(result.success);
    assert!(result.stdout.contains("My Amazing Feature") || result.stdout.contains("my-feature"));
}

#[test]
fn test_view_spec_by_partial_name() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "authentication-system");

    // View by spec number
    let result = view_spec(cwd, "001");
    assert!(result.success);
    assert!(result.stdout.contains("authentication"));
}

// Regression tests

#[test]
fn test_regression_preserve_created_date_format() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "date-test");

    let readme_path = cwd.join("specs").join("001-date-test").join("README.md");

    // Get initial created date
    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);
    let initial_created = fm
        .get("created")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // Update something
    update_spec(cwd, "001-date-test", &[("status", "in-progress")]);

    // Created date should still be in YYYY-MM-DD format
    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);
    let after_created = fm.get("created").and_then(|v| v.as_str());

    assert_eq!(after_created.map(|s| s.to_string()), initial_created);
    if let Some(created) = after_created {
        // Should match YYYY-MM-DD format
        let re = regex::Regex::new(r"^\d{4}-\d{2}-\d{2}$").unwrap();
        assert!(re.is_match(created), "created should be YYYY-MM-DD format");
        assert!(
            !created.contains('T'),
            "created should not contain ISO timestamp"
        );
    }
}

#[test]
fn test_regression_specs_with_special_characters() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // Names with dashes, underscores should work
    let result = create_spec(cwd, "my-cool_feature");
    assert!(result.success);
    assert!(dir_exists(&cwd.join("specs").join("001-my-cool_feature")));
}
