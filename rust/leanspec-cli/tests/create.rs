//! E2E Tests: create command with content options
//!
//! Tests the content input options for spec creation:
//! - --content option for passing full markdown content
//! - --file option for reading content from file
//! - Precedence rules between different content sources
//! - Frontmatter merging and CLI option overrides
//!
//! Note: Many tests are marked #[ignore] because the --content, --file,
//! and --description options are not yet implemented in the Rust CLI.
//! These tests document the expected behavior from the TypeScript CLI
//! and will be enabled once the features are implemented.

mod common;
use common::*;

use std::path::Path;

// Helper function to create a spec with content options
#[allow(dead_code)]
fn create_spec_with_content(cwd: &Path, name: &str, content: &str) -> ExecResult {
    exec_cli(&["create", name, "--content", content], cwd)
}

// Helper function to create a spec from file
#[allow(dead_code)]
fn create_spec_from_file(cwd: &Path, name: &str, file_path: &str) -> ExecResult {
    exec_cli(&["create", name, "--file", file_path], cwd)
}

#[test]
#[ignore = "--content option not implemented in Rust CLI yet"]
fn test_create_with_full_markdown_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let content = r#"# My Feature Spec

## Overview

This is a complete spec with custom content.

## Design

Custom design section.

## Implementation

Custom implementation notes."#;

    let result = create_spec_with_content(cwd, "my-feature", content);
    assert!(result.success, "create with content should succeed");

    let spec_dir = cwd.join("specs").join("001-my-feature");
    assert!(dir_exists(&spec_dir), "spec directory should exist");

    let readme_path = spec_dir.join("README.md");
    let file_content = read_file(&readme_path);

    // Should contain the custom content
    assert!(
        file_content.contains("This is a complete spec with custom content"),
        "should contain custom content"
    );
    assert!(
        file_content.contains("Custom design section"),
        "should contain design section"
    );
    assert!(
        file_content.contains("Custom implementation notes"),
        "should contain implementation notes"
    );
}

#[test]
#[ignore = "--content option not implemented in Rust CLI yet"]
fn test_create_with_content_that_has_frontmatter() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let content = r#"---
status: in-progress
priority: high
tags:
  - feature
  - v2.0
---

# My Feature

This spec has frontmatter included."#;

    let result = create_spec_with_content(cwd, "my-feature", content);
    assert!(
        result.success,
        "create with frontmatter content should succeed"
    );

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);
    let frontmatter = parse_frontmatter(&file_content);

    // Frontmatter from content should be present
    assert_eq!(
        frontmatter.get("status").and_then(|v| v.as_str()),
        Some("in-progress")
    );
    assert_eq!(
        frontmatter.get("priority").and_then(|v| v.as_str()),
        Some("high")
    );
    if let Some(serde_yaml::Value::Sequence(tags)) = frontmatter.get("tags") {
        let tag_strs: Vec<&str> = tags.iter().filter_map(|v| v.as_str()).collect();
        assert!(tag_strs.contains(&"feature"));
        assert!(tag_strs.contains(&"v2.0"));
    }
}

#[test]
#[ignore = "--content option not implemented in Rust CLI yet"]
fn test_create_override_content_frontmatter_with_cli_options() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let content = r#"---
status: in-progress
priority: high
tags:
  - old-tag
---

# My Feature

Content with frontmatter."#;

    let result = exec_cli(
        &[
            "create",
            "my-feature",
            "--content",
            content,
            "--priority",
            "critical",
            "--tags",
            "new-tag,urgent",
        ],
        cwd,
    );
    assert!(
        result.success,
        "create with override options should succeed"
    );

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);
    let frontmatter = parse_frontmatter(&file_content);

    // CLI options should override content frontmatter
    assert_eq!(
        frontmatter.get("priority").and_then(|v| v.as_str()),
        Some("critical")
    );
    if let Some(serde_yaml::Value::Sequence(tags)) = frontmatter.get("tags") {
        let tag_strs: Vec<&str> = tags.iter().filter_map(|v| v.as_str()).collect();
        assert!(tag_strs.contains(&"new-tag"));
        assert!(tag_strs.contains(&"urgent"));
        assert!(!tag_strs.contains(&"old-tag"));
    }
}

#[test]
#[ignore = "--content option not implemented in Rust CLI yet"]
fn test_create_content_without_frontmatter_uses_defaults() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let content = r#"# Simple Content

Just body content, no frontmatter."#;

    let result = create_spec_with_content(cwd, "my-feature", content);
    assert!(result.success, "create without frontmatter should succeed");

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);
    let frontmatter = parse_frontmatter(&file_content);

    // Should have default frontmatter
    assert!(
        frontmatter.get("status").is_some(),
        "should have default status"
    );
    assert!(
        frontmatter.get("created").is_some() || frontmatter.get("created_at").is_some(),
        "should have created timestamp"
    );
}

#[test]
#[ignore = "--file option not implemented in Rust CLI yet"]
fn test_create_from_file() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // Create a content file
    let content = r#"# Feature from File

## Overview

This content was read from a file.

## Design

File-based design."#;
    let content_file_path = cwd.join("spec-content.md");
    write_file(&content_file_path, content);

    let result = create_spec_from_file(cwd, "my-feature", "spec-content.md");
    assert!(result.success, "create from file should succeed");

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);

    assert!(
        file_content.contains("This content was read from a file"),
        "should contain file content"
    );
    assert!(
        file_content.contains("File-based design"),
        "should contain design section"
    );
}

#[test]
#[ignore = "--file option not implemented in Rust CLI yet"]
fn test_create_from_file_absolute_path() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // Create a content file with absolute path
    let content = r#"# Absolute Path Content

Content from absolute path."#;
    let content_file_path = cwd.join("absolute-content.md");
    write_file(&content_file_path, content);

    let result = create_spec_from_file(cwd, "my-feature", content_file_path.to_str().unwrap());
    assert!(result.success, "create from absolute path should succeed");

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);

    assert!(
        file_content.contains("Content from absolute path"),
        "should contain file content"
    );
}

#[test]
#[ignore = "--file option not implemented in Rust CLI yet"]
fn test_create_from_nonexistent_file() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec_from_file(cwd, "my-feature", "non-existent.md");
    assert!(!result.success, "create from nonexistent file should fail");
    // Should have error message
    assert!(
        result.stderr.to_lowercase().contains("file")
            || result.stderr.to_lowercase().contains("not found")
            || result.stderr.to_lowercase().contains("error"),
        "should have error message"
    );
}

#[test]
#[ignore = "--file option not implemented in Rust CLI yet"]
fn test_create_from_directory_fails() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // Create a directory instead of a file
    let dir_path = cwd.join("some-directory");
    std::fs::create_dir(&dir_path).expect("Failed to create directory");

    let result = create_spec_from_file(cwd, "my-feature", "some-directory");
    assert!(!result.success, "create from directory should fail");
}

#[test]
#[ignore = "--file and --content options not implemented in Rust CLI yet"]
fn test_create_file_takes_precedence_over_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // Create a content file
    let file_content = r#"# Content from file"#;
    let content_file_path = cwd.join("from-file.md");
    write_file(&content_file_path, file_content);

    // Pass both --file and --content
    let result = exec_cli(
        &[
            "create",
            "my-feature",
            "--file",
            "from-file.md",
            "--content",
            "# Content from argument",
        ],
        cwd,
    );
    assert!(result.success, "create with both options should succeed");

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let spec_content = read_file(&readme_path);

    // Should use file content, not --content argument
    assert!(
        spec_content.contains("Content from file"),
        "should use file content"
    );
    assert!(
        !spec_content.contains("Content from argument"),
        "should not use argument content"
    );
}

#[test]
#[ignore = "--content and --description options not implemented in Rust CLI yet"]
fn test_create_content_takes_precedence_over_description() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = exec_cli(
        &[
            "create",
            "my-feature",
            "--content",
            "# Full content body",
            "--description",
            "This description should be ignored",
        ],
        cwd,
    );
    assert!(result.success, "create with both options should succeed");

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);

    // Should use content, not description
    assert!(
        file_content.contains("Full content body"),
        "should use content"
    );
    assert!(
        !file_content.contains("This description should be ignored"),
        "should not use description"
    );
}

#[test]
#[ignore = "--description option not implemented in Rust CLI yet"]
fn test_create_with_description_when_no_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = exec_cli(
        &[
            "create",
            "my-feature",
            "--description",
            "This description should be used",
        ],
        cwd,
    );
    assert!(result.success, "create with description should succeed");

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);

    assert!(
        file_content.contains("This description should be used"),
        "should use description"
    );
}

#[test]
#[ignore = "--content option not implemented in Rust CLI yet"]
fn test_create_with_large_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // Create content larger than 10KB
    let large_content = format!("# Large Content\n\n{}", "A".repeat(15000));

    let result = create_spec_with_content(cwd, "my-feature", &large_content);
    assert!(result.success, "create with large content should succeed");

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);

    assert!(
        file_content.contains("Large Content"),
        "should contain large content"
    );
    assert!(
        file_content.len() > 15000,
        "file should be larger than 15KB"
    );
}

#[test]
#[ignore = "--file option not implemented in Rust CLI yet"]
fn test_create_with_special_characters() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // Write content to file to avoid shell escaping issues
    let content = r#"# Special Characters Test

Content with $pecial ch@racters & symbols: <>, [], {}, |, \, /, etc.

Code blocks with backticks:
```javascript
const x = `template ${string}`;
```"#;
    let content_file_path = cwd.join("special-content.md");
    write_file(&content_file_path, content);

    let result = create_spec_from_file(cwd, "my-feature", "special-content.md");
    assert!(
        result.success,
        "create with special characters should succeed"
    );

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);

    assert!(
        file_content.contains("$pecial ch@racters"),
        "should contain special characters"
    );
}

#[test]
#[ignore = "--content option not implemented in Rust CLI yet"]
fn test_create_with_title_and_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let content = r#"# Will be replaced

This is the content body."#;

    let result = exec_cli(
        &[
            "create",
            "my-feature",
            "--content",
            content,
            "--title",
            "Custom Title",
        ],
        cwd,
    );
    assert!(
        result.success,
        "create with title and content should succeed"
    );

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);

    assert!(
        file_content.contains("This is the content body"),
        "should contain content body"
    );
}

#[test]
#[ignore = "--content option not implemented in Rust CLI yet"]
fn test_create_with_assignee_and_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let content = r#"# Feature Content

Content for the spec."#;

    let result = exec_cli(
        &[
            "create",
            "my-feature",
            "--content",
            content,
            "--assignee",
            "john.doe",
        ],
        cwd,
    );
    assert!(
        result.success,
        "create with assignee and content should succeed"
    );

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let file_content = read_file(&readme_path);
    let frontmatter = parse_frontmatter(&file_content);

    assert_eq!(
        frontmatter.get("assignee").and_then(|v| v.as_str()),
        Some("john.doe")
    );
    assert!(
        file_content.contains("Content for the spec"),
        "should contain content"
    );
}

#[test]
#[ignore = "--file option not implemented in Rust CLI yet"]
fn test_create_with_minimal_content() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // Create a file with minimal but valid content
    let content = r#"# Minimal Content"#;
    let content_file_path = cwd.join("minimal-content.md");
    write_file(&content_file_path, content);

    let result = create_spec_from_file(cwd, "my-feature", "minimal-content.md");
    assert!(result.success, "create with minimal content should succeed");

    let spec_dir = cwd.join("specs").join("001-my-feature");
    assert!(dir_exists(&spec_dir), "spec directory should exist");

    let readme_path = spec_dir.join("README.md");
    let file_content = read_file(&readme_path);
    let frontmatter = parse_frontmatter(&file_content);

    // Should still have frontmatter
    assert!(
        frontmatter.get("status").is_some(),
        "should have default status"
    );

    // Should contain the minimal content
    assert!(
        file_content.contains("Minimal Content"),
        "should contain minimal content"
    );
}
