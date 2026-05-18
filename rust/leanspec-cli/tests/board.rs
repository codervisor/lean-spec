//! E2E Tests: board command
//!
//! Drives `leanspec board` against on-disk markdown specs. The `create` and
//! `update` CLI commands are stubbed during the adapter migration, so the
//! helpers here write spec files directly rather than going through the CLI.

mod common;
use common::*;

use std::fs;
use std::path::Path;

#[derive(Default, Clone)]
struct SpecOpts<'a> {
    status: Option<&'a str>,
    priority: Option<&'a str>,
    tags: &'a [&'a str],
    assignee: Option<&'a str>,
    parent: Option<&'a str>,
}

fn write_md_spec(cwd: &Path, number: u32, name: &str, opts: SpecOpts<'_>) {
    let slug = format!("{:03}-{}", number, name);
    let spec_dir = cwd.join("specs").join(&slug);
    fs::create_dir_all(&spec_dir).expect("create spec dir");

    let status = opts.status.unwrap_or("planned");
    let mut fm = format!("status: {status}\ncreated: '2025-01-01'\n");
    if let Some(p) = opts.priority {
        fm.push_str(&format!("priority: {p}\n"));
    }
    if !opts.tags.is_empty() {
        fm.push_str("tags:\n");
        for t in opts.tags {
            fm.push_str(&format!("  - {t}\n"));
        }
    }
    if let Some(a) = opts.assignee {
        fm.push_str(&format!("assignee: {a}\n"));
    }
    if let Some(p) = opts.parent {
        fm.push_str(&format!("parent: {p}\n"));
    }
    let content = format!("---\n{fm}---\n\n# Test {name}\n\nBody.\n");
    fs::write(spec_dir.join("README.md"), content).expect("write spec");
}

#[test]
fn test_board_default_groups_by_status() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    write_md_spec(cwd, 1, "planned-work", SpecOpts::default());
    write_md_spec(
        cwd,
        2,
        "active-work",
        SpecOpts {
            status: Some("in-progress"),
            ..Default::default()
        },
    );
    write_md_spec(
        cwd,
        3,
        "done-work",
        SpecOpts {
            status: Some("complete"),
            ..Default::default()
        },
    );

    let result = get_board(cwd);
    assert!(result.success, "stderr: {}", result.stderr);

    let stdout_lower = result.stdout.to_lowercase();
    assert!(stdout_lower.contains("planned"));
    assert!(stdout_lower.contains("in-progress") || stdout_lower.contains("in progress"));
    assert!(stdout_lower.contains("complete"));
}

#[test]
fn test_board_group_by_priority() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    write_md_spec(
        cwd,
        1,
        "low-priority",
        SpecOpts {
            priority: Some("low"),
            ..Default::default()
        },
    );
    write_md_spec(
        cwd,
        2,
        "high-priority",
        SpecOpts {
            priority: Some("high"),
            ..Default::default()
        },
    );
    write_md_spec(
        cwd,
        3,
        "critical-fix",
        SpecOpts {
            priority: Some("critical"),
            ..Default::default()
        },
    );

    let result = exec_cli(&["board", "--group-by", "priority"], cwd);
    assert!(result.success, "stderr: {}", result.stderr);

    let stdout_lower = result.stdout.to_lowercase();
    assert!(stdout_lower.contains("low"));
    assert!(stdout_lower.contains("high"));
    assert!(stdout_lower.contains("critical"));
}

#[test]
fn test_board_group_by_assignee() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    write_md_spec(
        cwd,
        1,
        "alice-task",
        SpecOpts {
            assignee: Some("alice"),
            ..Default::default()
        },
    );
    write_md_spec(
        cwd,
        2,
        "bob-task",
        SpecOpts {
            assignee: Some("bob"),
            ..Default::default()
        },
    );

    let result = exec_cli(&["board", "--group-by", "assignee"], cwd);
    assert!(result.success, "stderr: {}", result.stderr);
    assert!(result.stdout.contains("alice"));
    assert!(result.stdout.contains("bob"));
}

#[test]
fn test_board_group_by_tags_multi_value() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    write_md_spec(
        cwd,
        1,
        "frontend-task",
        SpecOpts {
            tags: &["frontend"],
            ..Default::default()
        },
    );
    write_md_spec(
        cwd,
        2,
        "backend-task",
        SpecOpts {
            tags: &["backend"],
            ..Default::default()
        },
    );
    write_md_spec(
        cwd,
        3,
        "fullstack-task",
        SpecOpts {
            tags: &["frontend", "backend"],
            ..Default::default()
        },
    );

    let result = exec_cli(&["board", "--group-by", "tags"], cwd);
    assert!(result.success, "stderr: {}", result.stderr);

    assert!(result.stdout.contains("frontend"));
    assert!(result.stdout.contains("backend"));

    let occurrences = result.stdout.matches("fullstack-task").count();
    assert!(
        occurrences >= 2,
        "multi-tag spec should appear in each tag group; saw {} occurrences in:\n{}",
        occurrences,
        result.stdout
    );
}

#[test]
fn test_board_group_by_unknown_field_errors() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    write_md_spec(cwd, 1, "any-spec", SpecOpts::default());

    let result = exec_cli(&["board", "--group-by", "no-such-field"], cwd);
    assert!(!result.success, "should fail on unknown field");
    assert!(
        result.stderr.contains("no-such-field"),
        "stderr should name the unknown field: {}",
        result.stderr
    );
}

#[test]
fn test_board_by_parent() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    write_md_spec(cwd, 1, "umbrella", SpecOpts::default());
    write_md_spec(
        cwd,
        2,
        "child-a",
        SpecOpts {
            parent: Some("001-umbrella"),
            ..Default::default()
        },
    );
    write_md_spec(
        cwd,
        3,
        "child-b",
        SpecOpts {
            parent: Some("001-umbrella"),
            ..Default::default()
        },
    );
    write_md_spec(cwd, 4, "orphan", SpecOpts::default());

    let result = exec_cli(&["board", "--by-parent"], cwd);
    assert!(result.success, "stderr: {}", result.stderr);
    assert!(
        result.stdout.contains("umbrella") || result.stdout.contains("001"),
        "should mention the umbrella parent in:\n{}",
        result.stdout
    );
    assert!(
        result.stdout.contains("No parent"),
        "should bucket orphans under 'No parent':\n{}",
        result.stdout
    );
}

#[test]
fn test_board_pre_filter_status() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    write_md_spec(cwd, 1, "first", SpecOpts::default());
    write_md_spec(
        cwd,
        2,
        "second",
        SpecOpts {
            status: Some("in-progress"),
            ..Default::default()
        },
    );

    let result = exec_cli(
        &["board", "--group-by", "priority", "--status", "in-progress"],
        cwd,
    );
    assert!(result.success, "stderr: {}", result.stderr);
    assert!(result.stdout.contains("second"));
    assert!(!result.stdout.contains("first"));
}

#[test]
fn test_board_json_output() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    write_md_spec(cwd, 1, "alpha", SpecOpts::default());

    let result = exec_cli(&["--output", "json", "board"], cwd);
    assert!(result.success, "stderr: {}", result.stderr);

    let parsed: serde_json::Value =
        serde_json::from_str(&result.stdout).expect("board --output json must be valid JSON");
    assert_eq!(parsed["group_by"], "status");
    assert!(parsed["groups"].is_array());
    assert_eq!(parsed["total"], 1);
}

#[test]
fn test_board_empty_project() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = get_board(cwd);
    assert!(result.success, "stderr: {}", result.stderr);
}

#[test]
fn test_board_single_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    write_md_spec(cwd, 1, "only-spec", SpecOpts::default());

    let result = get_board(cwd);
    assert!(result.success, "stderr: {}", result.stderr);
    assert!(
        result.stdout.contains("only-spec") || result.stdout.to_lowercase().contains("planned")
    );
}
