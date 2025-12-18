//! E2E Tests: update command
//!
//! Tests metadata update functionality:
//! - Status updates
//! - Priority updates
//! - Tag operations (add/remove)
//! - Assignee updates
//! - Multiple updates at once

mod common;
use common::*;

#[test]
fn test_update_status() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = update_spec(cwd, "001-my-spec", &[("status", "in-progress")]);
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    let fm = parse_frontmatter(&content);
    assert_eq!(
        fm.get("status").and_then(|v| v.as_str()),
        Some("in-progress")
    );
}

#[test]
fn test_update_status_transition() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    // planned → in-progress → complete (with force for completion verification)
    update_spec(cwd, "001-my-spec", &[("status", "in-progress")]);
    update_spec_force(cwd, "001-my-spec", &[("status", "complete")]);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    let fm = parse_frontmatter(&content);
    assert_eq!(fm.get("status").and_then(|v| v.as_str()), Some("complete"));
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
fn test_update_add_tags() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = exec_cli(
        &["update", "001-my-spec", "--add-tags", "api,frontend"],
        cwd,
    );
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    let fm = parse_frontmatter(&content);

    if let Some(serde_yaml::Value::Sequence(tags)) = fm.get("tags") {
        let tag_strs: Vec<&str> = tags.iter().filter_map(|v| v.as_str()).collect();
        assert!(tag_strs.contains(&"api"));
        assert!(tag_strs.contains(&"frontend"));
    }
}

#[test]
fn test_update_remove_tags() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "my-spec", &[("tags", "api,frontend,backend")]);

    let result = exec_cli(&["update", "001-my-spec", "--remove-tags", "frontend"], cwd);
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    let fm = parse_frontmatter(&content);

    if let Some(serde_yaml::Value::Sequence(tags)) = fm.get("tags") {
        let tag_strs: Vec<&str> = tags.iter().filter_map(|v| v.as_str()).collect();
        assert!(!tag_strs.contains(&"frontend"));
    }
}

#[test]
fn test_update_nonexistent_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = update_spec(cwd, "999-nonexistent", &[("status", "complete")]);
    assert!(!result.success);
}

#[test]
fn test_update_by_number() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    // Update using just the number
    let result = update_spec(cwd, "001", &[("status", "in-progress")]);
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    let fm = parse_frontmatter(&content);
    assert_eq!(
        fm.get("status").and_then(|v| v.as_str()),
        Some("in-progress")
    );
}

#[test]
fn test_update_completed_timestamp() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    // Update to in-progress first
    update_spec(cwd, "001-my-spec", &[("status", "in-progress")]);

    // Update to complete (with force for completion verification)
    update_spec_force(cwd, "001-my-spec", &[("status", "complete")]);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    let fm = parse_frontmatter(&content);

    // Should have completed timestamp
    assert!(fm.get("completed").is_some() || fm.get("completed_at").is_some());
}
