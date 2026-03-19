//! Integration tests for the TUI command.
//!
//! Since the TUI requires a TTY and cannot run interactively in CI,
//! we only test that the subcommand is recognized and --help works.
//! Widget rendering is covered by unit tests using ratatui's TestBackend.

mod common;
use common::*;

#[test]
fn test_tui_help_output() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    let result = exec_cli(&["tui", "--help"], cwd);
    assert!(result.success, "tui --help should succeed");
    assert!(
        result.stdout.contains("terminal UI")
            || result.stdout.contains("Terminal UI")
            || result.stdout.contains("terminal"),
        "help text should mention terminal UI, got: {}",
        result.stdout
    );
}

#[test]
fn test_tui_accepts_view_flag() {
    let ctx = TestContext::new();
    let cwd = ctx.path();

    // Verify the --view flag is recognized (--help shows it)
    let result = exec_cli(&["tui", "--help"], cwd);
    assert!(result.success);
    assert!(
        result.stdout.contains("--view"),
        "help should mention --view flag, got: {}",
        result.stdout
    );
}
