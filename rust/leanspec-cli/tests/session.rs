//! E2E Tests: session lifecycle through the lean-spec CLI
//!
//! Tests use a temporary HOME directory to isolate the session SQLite database
//! from the real user environment.  A custom `test-echo` runner (backed by the
//! system `echo` command) is injected via the project's `.lean-spec/runners.json`
//! so that sessions complete quickly without requiring any real AI tool.

mod common;
use common::*;
use tempfile::TempDir;

/// Returns an isolated (empty) home directory as a `TempDir`.
/// All CLI calls should pass `HOME=<tmp_home>` so that the session DB and
/// global runner config are written there instead of the real `~/.lean-spec`.
fn isolated_home() -> TempDir {
    TempDir::new().expect("Failed to create temp home dir")
}

// ─── session create ───────────────────────────────────────────────────────────

#[test]
fn test_session_create_pending() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    let home = isolated_home();

    init_project(cwd, true);
    write_test_runner(cwd, "test-echo");

    let result = session_create(
        cwd,
        home.path(),
        cwd.to_str().unwrap(),
        Some("test-echo"),
        &[],
        None,
    );
    assert!(
        result.success,
        "session create should succeed\nstdout: {}\nstderr: {}",
        result.stdout, result.stderr
    );
    assert!(
        result.stdout.contains("Created session"),
        "output should confirm creation: {}",
        result.stdout
    );

    // Session ID should be parseable
    let id = parse_session_id(&result.stdout);
    assert!(
        id.is_some(),
        "should parse session ID from output: {}",
        result.stdout
    );
}

#[test]
fn test_session_create_with_spec_and_prompt() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    let home = isolated_home();

    init_project(cwd, true);
    write_test_runner(cwd, "test-echo");
    create_spec(cwd, "my-feature");

    let result = session_create(
        cwd,
        home.path(),
        cwd.to_str().unwrap(),
        Some("test-echo"),
        &["001"],
        Some("implement the feature"),
    );
    assert!(
        result.success,
        "session create with spec+prompt should succeed\nstdout: {}\nstderr: {}",
        result.stdout, result.stderr
    );
    assert!(
        result.stdout.contains("Created session"),
        "{}",
        result.stdout
    );
}

// ─── session list ─────────────────────────────────────────────────────────────

#[test]
fn test_session_list_shows_created_session() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    let home = isolated_home();

    init_project(cwd, true);
    write_test_runner(cwd, "test-echo");

    let create_result = session_create(
        cwd,
        home.path(),
        cwd.to_str().unwrap(),
        Some("test-echo"),
        &[],
        None,
    );
    assert!(create_result.success, "create: {}", create_result.stderr);
    let session_id = parse_session_id(&create_result.stdout).expect("session ID");

    let list_result = session_list(cwd, home.path());
    assert!(list_result.success, "list: {}", list_result.stderr);
    assert!(
        list_result.stdout.contains(&session_id),
        "list should contain session ID {}\n{}",
        session_id,
        list_result.stdout
    );
    assert!(
        list_result.stdout.contains("test-echo"),
        "list should show runner name\n{}",
        list_result.stdout
    );
}

// ─── session view ─────────────────────────────────────────────────────────────

#[test]
fn test_session_view_details() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    let home = isolated_home();

    init_project(cwd, true);
    write_test_runner(cwd, "test-echo");

    let create_result = session_create(
        cwd,
        home.path(),
        cwd.to_str().unwrap(),
        Some("test-echo"),
        &[],
        Some("hello world"),
    );
    assert!(create_result.success, "{}", create_result.stderr);
    let session_id = parse_session_id(&create_result.stdout).expect("session ID");

    let view_result = session_view(cwd, home.path(), &session_id);
    assert!(
        view_result.success,
        "view: {}\n{}",
        view_result.stdout, view_result.stderr
    );
    assert!(
        view_result.stdout.contains("test-echo"),
        "{}",
        view_result.stdout
    );
    assert!(
        view_result.stdout.contains("hello world"),
        "{}",
        view_result.stdout
    );
    assert!(
        view_result.stdout.contains(&session_id),
        "{}",
        view_result.stdout
    );
}

// ─── session run ──────────────────────────────────────────────────────────────

#[test]
fn test_session_run_completes() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    let home = isolated_home();

    init_project(cwd, true);
    write_test_runner(cwd, "test-echo");

    let result = session_run(
        cwd,
        home.path(),
        cwd.to_str().unwrap(),
        Some("test-echo"),
        &[],
        Some("say hello"),
    );
    assert!(
        result.success,
        "session run should succeed\nstdout: {}\nstderr: {}",
        result.stdout, result.stderr
    );
    assert!(
        result.stdout.contains("completed"),
        "session run should report completion\n{}",
        result.stdout
    );
}

#[test]
fn test_session_run_creates_and_completes_with_spec() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    let home = isolated_home();

    init_project(cwd, true);
    write_test_runner(cwd, "test-echo");
    create_spec(cwd, "session-feature");

    let result = session_run(
        cwd,
        home.path(),
        cwd.to_str().unwrap(),
        Some("test-echo"),
        &["001"],
        None,
    );
    assert!(
        result.success,
        "session run with spec should succeed\nstdout: {}\nstderr: {}",
        result.stdout, result.stderr
    );

    // After run, listing should show the completed session
    let session_id = parse_session_id(&result.stdout).expect("session ID");
    let list_result = session_list(cwd, home.path());
    assert!(
        list_result.stdout.contains(&session_id),
        "{}",
        list_result.stdout
    );
    assert!(
        list_result.stdout.contains("Completed"),
        "{}",
        list_result.stdout
    );
}

// ─── session delete ───────────────────────────────────────────────────────────

#[test]
fn test_session_delete() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    let home = isolated_home();

    init_project(cwd, true);
    write_test_runner(cwd, "test-echo");

    let create_result = session_create(
        cwd,
        home.path(),
        cwd.to_str().unwrap(),
        Some("test-echo"),
        &[],
        None,
    );
    assert!(create_result.success, "{}", create_result.stderr);
    let session_id = parse_session_id(&create_result.stdout).expect("session ID");

    let delete_result = session_delete(cwd, home.path(), &session_id);
    assert!(
        delete_result.success,
        "delete: {}\n{}",
        delete_result.stdout, delete_result.stderr
    );

    // Session should no longer appear in list
    let list_result = session_list(cwd, home.path());
    assert!(
        !list_result.stdout.contains(&session_id),
        "deleted session should not appear in list\n{}",
        list_result.stdout
    );
}

// ─── error handling ───────────────────────────────────────────────────────────

#[test]
fn test_session_create_unknown_runner_fails() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    let home = isolated_home();

    init_project(cwd, true);

    let result = session_create(
        cwd,
        home.path(),
        cwd.to_str().unwrap(),
        Some("nonexistent-runner-xyz"),
        &[],
        None,
    );
    assert!(
        !result.success,
        "create with unknown runner should fail\n{}",
        result.stdout
    );
}

#[test]
fn test_session_view_nonexistent_fails() {
    let ctx = TestContext::new();
    let cwd = ctx.path();
    let home = isolated_home();

    let result = session_view(cwd, home.path(), "00000000-0000-0000-0000-000000000000");
    assert!(
        !result.success,
        "view of nonexistent session should fail\n{}",
        result.stdout
    );
}
