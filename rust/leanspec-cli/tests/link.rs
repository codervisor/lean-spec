//! E2E Tests: link/unlink commands
//!
//! Tests dependency linking functionality:
//! - Link specs with depends_on
//! - Unlink specs
//! - Multiple dependencies
//! - Dependency chains

mod common;
use common::*;


#[test]
fn test_link_depends_on() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "database");
    create_spec(cwd, "api");

    let result = link_specs(cwd, "002-api", "001-database");
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("002-api").join("README.md"));
    let fm = parse_frontmatter(&content);

    if let Some(serde_yaml::Value::Sequence(deps)) = fm.get("depends_on") {
        let dep_strs: Vec<&str> = deps.iter().filter_map(|v| v.as_str()).collect();
        assert!(dep_strs.contains(&"001-database"));
    } else {
        // Might be stored differently, check content contains the dependency
        assert!(content.contains("001-database"), "should contain dependency reference");
    }
}

#[test]
fn test_link_multiple_dependencies() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "auth");
    create_spec(cwd, "database");
    create_spec(cwd, "api");

    // API depends on both auth and database
    link_specs(cwd, "003-api", "001-auth");
    link_specs(cwd, "003-api", "002-database");

    let content = read_file(&cwd.join("specs").join("003-api").join("README.md"));
    // Should contain both dependencies
    assert!(content.contains("001-auth") || content.contains("auth"));
    assert!(content.contains("002-database") || content.contains("database"));
}

#[test]
fn test_link_chain() {
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
    assert!(api_content.contains("001-database") || api_content.contains("database"));

    let frontend_content = read_file(&cwd.join("specs").join("003-frontend").join("README.md"));
    assert!(frontend_content.contains("002-api") || frontend_content.contains("api"));
}

#[test]
fn test_unlink_depends_on() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "database");
    create_spec(cwd, "api");

    // Link first
    link_specs(cwd, "002-api", "001-database");

    // Then unlink
    let result = unlink_specs(cwd, "002-api", "001-database");
    assert!(result.success);

    let content = read_file(&cwd.join("specs").join("002-api").join("README.md"));
    let fm = parse_frontmatter(&content);

    // depends_on should be empty or not contain the unlinked spec
    if let Some(serde_yaml::Value::Sequence(deps)) = fm.get("depends_on") {
        let dep_strs: Vec<&str> = deps.iter().filter_map(|v| v.as_str()).collect();
        assert!(!dep_strs.contains(&"001-database"));
    }
}

#[test]
fn test_link_nonexistent_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "api");

    // Try to link to nonexistent spec
    let result = link_specs(cwd, "001-api", "999-nonexistent");
    // Should fail
    assert!(!result.success || result.exit_code != 0);
}

#[test]
fn test_unlink_nonexistent_dependency() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    init_project(cwd, true);
    create_spec(cwd, "api");

    // Try to unlink something that was never linked
    let result = unlink_specs(cwd, "001-api", "999-nonexistent");
    // May succeed (no-op) or fail, but shouldn't crash
    assert!(result.exit_code >= 0);
}
