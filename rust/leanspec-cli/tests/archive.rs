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

    // Spec should still exist (status-only archive)
    assert!(dir_exists(&original_path));

    // Status should be updated to archived
    let readme_path = original_path.join("README.md");
    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);
    assert_eq!(fm.get("status").and_then(|v| v.as_str()), Some("archived"));
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

    let spec_path = cwd.join("specs").join("001-my-spec");
    assert!(dir_exists(&spec_path));

    let readme_path = spec_path.join("README.md");
    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);
    assert_eq!(fm.get("status").and_then(|v| v.as_str()), Some("archived"));
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
fn test_archive_does_not_create_archived_directory() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "first-archive");
    update_spec(cwd, "001-first-archive", &[("status", "complete")]);

    archive_spec(cwd, "001-first-archive");

    // archived/ may exist, but spec should not be moved there
    let archived_dir = cwd.join("specs").join("archived");
    assert!(!dir_exists(&archived_dir.join("001-first-archive")));

    let spec_path = cwd.join("specs").join("001-first-archive");
    let readme_path = spec_path.join("README.md");
    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);
    assert_eq!(fm.get("status").and_then(|v| v.as_str()), Some("archived"));
}

#[test]
fn test_archive_preserves_spec_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec_with_options(
        cwd,
        "detailed-spec",
        &[("priority", "high"), ("tags", "api,v2")],
    );
    update_spec(cwd, "001-detailed-spec", &[("status", "complete")]);

    archive_spec(cwd, "001-detailed-spec");

    // Check archived content exists and has the expected structure
    let archived_readme = cwd
        .join("specs")
        .join("001-detailed-spec")
        .join("README.md");
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

#[test]
fn test_archive_batch() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "first-spec");
    create_spec(cwd, "second-spec");
    create_spec(cwd, "third-spec");

    // Archive multiple specs at once
    let result = exec_cli(&["archive", "001-first-spec", "002-second-spec"], cwd);
    assert!(result.success);

    // Both should be archived in place
    let first_spec = cwd.join("specs").join("001-first-spec");
    let second_spec = cwd.join("specs").join("002-second-spec");
    assert!(dir_exists(&first_spec));
    assert!(dir_exists(&second_spec));

    let first_readme = first_spec.join("README.md");
    let first_content = read_file(&first_readme);
    let first_fm = parse_frontmatter(&first_content);
    assert_eq!(
        first_fm.get("status").and_then(|v| v.as_str()),
        Some("archived")
    );

    let second_readme = second_spec.join("README.md");
    let second_content = read_file(&second_readme);
    let second_fm = parse_frontmatter(&second_content);
    assert_eq!(
        second_fm.get("status").and_then(|v| v.as_str()),
        Some("archived")
    );

    // Third spec should still be in specs/
    assert!(dir_exists(&cwd.join("specs").join("003-third-spec")));
}

#[test]
fn test_archive_batch_with_errors() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "valid-spec");

    // Try to archive mix of valid and invalid specs
    let result = exec_cli(&["archive", "001-valid-spec", "999-nonexistent"], cwd);

    // Should fail due to nonexistent spec
    assert!(!result.success);

    // Valid spec should NOT be archived (all-or-nothing is not enforced, but command should fail)
    // Actually, looking at the code, it will archive valid ones and report errors
    // Let's verify the actual behavior
    let spec_path = cwd.join("specs").join("001-valid-spec");
    assert!(dir_exists(&spec_path));

    let readme_path = spec_path.join("README.md");
    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);
    assert_eq!(fm.get("status").and_then(|v| v.as_str()), Some("archived"));
}

#[test]
fn test_archive_requires_exact_match() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "my-feature-spec");

    // Fuzzy matching should not work - must provide exact path
    let result = exec_cli(&["archive", "feature"], cwd);
    assert!(!result.success);

    // Original should still exist
    assert!(dir_exists(&cwd.join("specs").join("001-my-feature-spec")));

    // Exact match by number should work
    let result = exec_cli(&["archive", "001"], cwd);
    assert!(result.success);

    // Now it should be archived
    let spec_path = cwd.join("specs").join("001-my-feature-spec");
    assert!(dir_exists(&spec_path));

    let readme_path = spec_path.join("README.md");
    let content = read_file(&readme_path);
    let fm = parse_frontmatter(&content);
    assert_eq!(fm.get("status").and_then(|v| v.as_str()), Some("archived"));
}
