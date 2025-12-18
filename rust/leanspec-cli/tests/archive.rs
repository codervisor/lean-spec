//! E2E Tests: archive command
//!
//! Tests spec archival functionality

mod common;
use common::*;


#[test]
fn test_archive_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "to-archive");
    update_spec(cwd, "001-to-archive", &[("status", "complete")]);

    let original_path = cwd.join("specs").join("001-to-archive");
    assert!(dir_exists(&original_path));

    let result = archive_spec(cwd, "001-to-archive");
    assert!(result.success);

    // Original should be gone
    assert!(!dir_exists(&original_path));

    // Should be in archived folder
    let archived_path = cwd.join("specs").join("archived").join("001-to-archive");
    assert!(dir_exists(&archived_path));
}

#[test]
fn test_archive_by_number() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-spec");
    update_spec(cwd, "001-my-spec", &[("status", "complete")]);

    let result = archive_spec(cwd, "001");
    assert!(result.success);

    let archived_path = cwd.join("specs").join("archived").join("001-my-spec");
    assert!(dir_exists(&archived_path));
}

#[test]
fn test_archive_dry_run() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "to-archive");

    let original_path = cwd.join("specs").join("001-to-archive");
    assert!(dir_exists(&original_path));

    let result = exec_cli(&["archive", "001-to-archive", "--dry-run"], cwd);
    assert!(result.success);

    // Original should still exist (dry run)
    assert!(dir_exists(&original_path));
}

#[test]
fn test_archive_nonexistent_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = archive_spec(cwd, "999-nonexistent");
    assert!(!result.success);
}

#[test]
fn test_archive_creates_archived_directory() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "first-archive");
    update_spec(cwd, "001-first-archive", &[("status", "complete")]);

    // archived/ directory may not exist yet
    let archived_dir = cwd.join("specs").join("archived");
    
    archive_spec(cwd, "001-first-archive");

    // archived/ directory should be created
    assert!(dir_exists(&archived_dir));
}

#[test]
fn test_archive_preserves_spec_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(cwd, "detailed-spec", &[
        ("priority", "high"),
        ("tags", "api,v2"),
    ]);
    update_spec(cwd, "001-detailed-spec", &[("status", "complete")]);

    archive_spec(cwd, "001-detailed-spec");

    // Check archived content exists and has the expected structure
    let archived_readme = cwd.join("specs").join("archived").join("001-detailed-spec").join("README.md");
    let archived_content = read_file(&archived_readme);
    
    // Content body should be preserved (status will be updated to archived)
    assert!(archived_content.contains("# Detailed Spec"));
    assert!(archived_content.contains("## Overview"));
    
    // Status should be updated to archived
    let fm = parse_frontmatter(&archived_content);
    assert_eq!(fm.get("status").and_then(|v| v.as_str()), Some("archived"));
    
    // Priority and tags should be preserved
    assert_eq!(fm.get("priority").and_then(|v| v.as_str()), Some("high"));
}
