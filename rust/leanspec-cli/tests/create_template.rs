//! E2E Tests: create command template functionality
//!
//! Tests the template-based spec creation:
//! - Template file is properly embedded and loaded
//! - Template variables are correctly replaced
//! - Frontmatter is generated correctly
//! - Template structure is preserved

mod common;
use common::*;

#[test]
fn test_create_uses_embedded_template() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec(cwd, "my-feature");
    assert!(result.success, "create should succeed");

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let content = read_file(&readme_path);

    // Should contain template sections
    assert!(
        content.contains("## Overview"),
        "should contain Overview section from template"
    );
    assert!(
        content.contains("## Design"),
        "should contain Design section from template"
    );
    assert!(
        content.contains("## Plan"),
        "should contain Plan section from template"
    );
    assert!(
        content.contains("## Test"),
        "should contain Test section from template"
    );
    assert!(
        content.contains("## Notes"),
        "should contain Notes section from template"
    );
}

#[test]
fn test_create_replaces_template_variables() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec_with_options(
        cwd,
        "my-feature",
        &[
            ("title", "My Custom Feature"),
            ("status", "in-progress"),
            ("priority", "high"),
        ],
    );
    assert!(result.success, "create with options should succeed");

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let content = read_file(&readme_path);

    // Check title replacement
    assert!(
        content.contains("# My Custom Feature"),
        "should replace {{name}} with title"
    );

    // Check frontmatter variables
    let frontmatter = parse_frontmatter(&content);
    assert_eq!(
        frontmatter.get("status").and_then(|v| v.as_str()),
        Some("in-progress"),
        "should set status in frontmatter"
    );
    assert_eq!(
        frontmatter.get("priority").and_then(|v| v.as_str()),
        Some("high"),
        "should set priority in frontmatter"
    );
    assert!(
        frontmatter.contains_key("created"),
        "should set created date"
    );
    assert!(
        frontmatter.contains_key("created_at"),
        "should set created_at timestamp"
    );
}

#[test]
fn test_create_generates_frontmatter_correctly() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec(cwd, "test-spec");
    assert!(result.success, "create should succeed");

    let readme_path = cwd.join("specs").join("001-test-spec").join("README.md");
    let content = read_file(&readme_path);

    // Check frontmatter format
    assert!(
        content.starts_with("---\n"),
        "should start with frontmatter delimiter"
    );

    let frontmatter = parse_frontmatter(&content);

    // Required fields
    assert!(
        frontmatter.contains_key("status"),
        "should have status field"
    );
    assert!(
        frontmatter.contains_key("created"),
        "should have created field"
    );
    assert!(
        frontmatter.contains_key("priority"),
        "should have priority field"
    );
    assert!(frontmatter.contains_key("tags"), "should have tags field");
    assert!(
        frontmatter.contains_key("created_at"),
        "should have created_at field"
    );
}

#[test]
fn test_create_with_tags_formats_correctly() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result =
        create_spec_with_options(cwd, "tagged-feature", &[("tags", "feature,backend,api")]);
    assert!(result.success, "create with tags should succeed");

    let readme_path = cwd
        .join("specs")
        .join("001-tagged-feature")
        .join("README.md");
    let content = read_file(&readme_path);

    let frontmatter = parse_frontmatter(&content);

    // Check tags array
    if let Some(serde_yaml::Value::Sequence(tags)) = frontmatter.get("tags") {
        let tag_strs: Vec<&str> = tags.iter().filter_map(|v| v.as_str()).collect();
        assert_eq!(tag_strs.len(), 3, "should have 3 tags");
        assert!(
            tag_strs.contains(&"feature"),
            "should contain 'feature' tag"
        );
        assert!(
            tag_strs.contains(&"backend"),
            "should contain 'backend' tag"
        );
        assert!(tag_strs.contains(&"api"), "should contain 'api' tag");
    } else {
        panic!("tags should be a YAML sequence");
    }
}

#[test]
fn test_create_default_priority_is_medium() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec(cwd, "default-priority");
    assert!(result.success, "create should succeed");

    let readme_path = cwd
        .join("specs")
        .join("001-default-priority")
        .join("README.md");
    let content = read_file(&readme_path);

    let frontmatter = parse_frontmatter(&content);

    assert_eq!(
        frontmatter.get("priority").and_then(|v| v.as_str()),
        Some("medium"),
        "default priority should be medium"
    );
}

#[test]
fn test_create_preserves_template_structure() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec(cwd, "structure-test");
    assert!(result.success, "create should succeed");

    let readme_path = cwd
        .join("specs")
        .join("001-structure-test")
        .join("README.md");
    let content = read_file(&readme_path);

    // Check template structure markers
    assert!(
        content.contains("<!-- What are we solving? Why now? -->"),
        "should preserve Overview comment"
    );
    assert!(
        content.contains("<!-- Technical approach, architecture decisions -->"),
        "should preserve Design comment"
    );
    assert!(
        content.contains("<!-- How will we verify this works? -->"),
        "should preserve Test comment"
    );

    // Check template hints
    assert!(
        content.contains("💡 TIP: If your plan has >6 phases"),
        "should preserve tip about sub-spec files"
    );
}

#[test]
fn test_create_template_checklist_items() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec(cwd, "checklist-test");
    assert!(result.success, "create should succeed");

    let readme_path = cwd
        .join("specs")
        .join("001-checklist-test")
        .join("README.md");
    let content = read_file(&readme_path);

    // Check for checklist items from template
    assert!(
        content.contains("- [ ] Task 1"),
        "should contain Plan task 1"
    );
    assert!(
        content.contains("- [ ] Task 2"),
        "should contain Plan task 2"
    );
    assert!(
        content.contains("- [ ] Task 3"),
        "should contain Plan task 3"
    );
    assert!(
        content.contains("- [ ] Test criteria 1"),
        "should contain Test criteria 1"
    );
    assert!(
        content.contains("- [ ] Test criteria 2"),
        "should contain Test criteria 2"
    );
}

#[test]
fn test_create_multiple_specs_use_same_template() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // Create first spec
    let result1 = create_spec(cwd, "spec-one");
    assert!(result1.success, "first create should succeed");

    // Create second spec
    let result2 = create_spec(cwd, "spec-two");
    assert!(result2.success, "second create should succeed");

    // Read both specs
    let content1 = read_file(&cwd.join("specs").join("001-spec-one").join("README.md"));
    let content2 = read_file(&cwd.join("specs").join("002-spec-two").join("README.md"));

    // Both should have the same template structure
    for content in &[&content1, &content2] {
        assert!(
            content.contains("## Overview"),
            "both should contain Overview section"
        );
        assert!(
            content.contains("## Design"),
            "both should contain Design section"
        );
        assert!(
            content.contains("## Plan"),
            "both should contain Plan section"
        );
        assert!(
            content.contains("## Test"),
            "both should contain Test section"
        );
    }
}

#[test]
fn test_create_with_all_statuses() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let statuses = ["planned", "in-progress", "complete", "archived"];

    for (idx, status) in statuses.iter().enumerate() {
        let spec_name = format!("spec-{}", status);
        let result = create_spec_with_options(cwd, &spec_name, &[("status", status)]);
        assert!(
            result.success,
            "create with status {} should succeed",
            status
        );

        let spec_dir = format!("{:03}-{}", idx + 1, spec_name);
        let readme_path = cwd.join("specs").join(&spec_dir).join("README.md");
        let content = read_file(&readme_path);

        let frontmatter = parse_frontmatter(&content);
        assert_eq!(
            frontmatter.get("status").and_then(|v| v.as_str()),
            Some(*status),
            "frontmatter should have correct status"
        );
    }
}

#[test]
fn test_create_with_all_priorities() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let priorities = ["low", "medium", "high", "critical"];

    for (idx, priority) in priorities.iter().enumerate() {
        let spec_name = format!("spec-{}", priority);
        let result = create_spec_with_options(cwd, &spec_name, &[("priority", priority)]);
        assert!(
            result.success,
            "create with priority {} should succeed",
            priority
        );

        let spec_dir = format!("{:03}-{}", idx + 1, spec_name);
        let readme_path = cwd.join("specs").join(&spec_dir).join("README.md");
        let content = read_file(&readme_path);

        let frontmatter = parse_frontmatter(&content);
        assert_eq!(
            frontmatter.get("priority").and_then(|v| v.as_str()),
            Some(*priority),
            "frontmatter should have correct priority"
        );
    }
}

#[test]
fn test_create_title_generation_from_name() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec(cwd, "multi-word-feature-name");
    assert!(result.success, "create should succeed");

    let readme_path = cwd
        .join("specs")
        .join("001-multi-word-feature-name")
        .join("README.md");
    let content = read_file(&readme_path);

    // Title should be capitalized
    assert!(
        content.contains("# Multi Word Feature Name"),
        "should auto-generate title with capitalized words"
    );
}

#[test]
fn test_create_explicit_title_overrides_generated() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    let result = create_spec_with_options(cwd, "my-feature", &[("title", "Custom Explicit Title")]);
    assert!(result.success, "create with explicit title should succeed");

    let readme_path = cwd.join("specs").join("001-my-feature").join("README.md");
    let content = read_file(&readme_path);

    assert!(
        content.contains("# Custom Explicit Title"),
        "should use explicit title instead of generated one"
    );
}

#[test]
fn test_template_consistency_with_init() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);

    // Read the template file created by init
    let template_path = cwd
        .join(".lean-spec")
        .join("templates")
        .join("spec-template.md");
    assert!(
        file_exists(&template_path),
        "template file should exist after init"
    );
    let template_content = read_file(&template_path);

    // Create a spec
    create_spec(cwd, "test-spec");
    let spec_content = read_file(&cwd.join("specs").join("001-test-spec").join("README.md"));

    // Check that key template sections are present in created spec
    for section in &["## Overview", "## Design", "## Plan", "## Test", "## Notes"] {
        assert!(
            template_content.contains(section),
            "template should contain {}",
            section
        );
        assert!(
            spec_content.contains(section),
            "created spec should contain {}",
            section
        );
    }
}
