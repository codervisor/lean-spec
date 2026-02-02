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

    // Should record transitions for status changes
    let transitions = fm.get("transitions");
    assert!(transitions.is_some(), "expected transitions in frontmatter");
    if let Some(serde_yaml::Value::Sequence(seq)) = transitions {
        // planned -> in-progress -> complete
        assert!(
            seq.len() >= 2,
            "expected at least 2 transitions, got {}",
            seq.len()
        );
        let last = seq.last().and_then(|v| v.as_mapping());
        let last_status = last.and_then(|m| m.get("status")).and_then(|v| v.as_str());
        assert_eq!(last_status, Some("complete"));
    } else {
        panic!("transitions should be a YAML sequence");
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
fn test_update_batch_status() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "api");
    create_spec(cwd, "frontend");

    let result = exec_cli(
        &[
            "update",
            "001-api",
            "002-frontend",
            "--status",
            "in-progress",
        ],
        cwd,
    );
    assert!(result.success);

    let api_content = read_file(&cwd.join("specs").join("001-api").join("README.md"));
    let api_fm = parse_frontmatter(&api_content);
    assert_eq!(
        api_fm.get("status").and_then(|v| v.as_str()),
        Some("in-progress")
    );

    let frontend_content = read_file(&cwd.join("specs").join("002-frontend").join("README.md"));
    let frontend_fm = parse_frontmatter(&frontend_content);
    assert_eq!(
        frontend_fm.get("status").and_then(|v| v.as_str()),
        Some("in-progress")
    );
}

#[test]
fn test_update_batch_mixed_valid_invalid() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "api");

    let result = exec_cli(
        &[
            "update",
            "001-api",
            "999-missing",
            "--status",
            "in-progress",
        ],
        cwd,
    );
    assert!(!result.success);

    let api_content = read_file(&cwd.join("specs").join("001-api").join("README.md"));
    let api_fm = parse_frontmatter(&api_content);
    assert_eq!(
        api_fm.get("status").and_then(|v| v.as_str()),
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
    assert!(fm.contains_key("completed") || fm.contains_key("completed_at"));
}

#[test]
fn test_update_replace_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = exec_cli(
        &[
            "update",
            "001-my-spec",
            "--replace",
            "## Overview",
            "## Overview\n\nReplaced overview.",
        ],
        cwd,
    );
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    assert!(content.contains("Replaced overview."));
}

#[test]
fn test_update_checklist_toggle() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = exec_cli(&["update", "001-my-spec", "--check", "Task 1"], cwd);
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    assert!(content.contains("- [x] Task 1"));
}

#[test]
fn test_update_section_append() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");

    let result = exec_cli(
        &[
            "update",
            "001-my-spec",
            "--section",
            "Overview",
            "--append",
            "Appended details.",
        ],
        cwd,
    );
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("001-my-spec").join("README.md"));
    assert!(content.contains("Appended details."));
}
