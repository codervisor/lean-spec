//! End-to-end coverage for `leanspec crystallize`.
//!
//! These tests exercise the CLI as a black box — they assert the published
//! command surface, the `--dry-run` contract, the `--update` merge behaviour,
//! and the no-panic-on-empty-repo guarantee.

mod common;

use common::{exec_cli, TestContext};
use std::fs;

const BEGIN_MARK: &str = "<!-- BEGIN crystallize:generated -->";
const END_MARK: &str = "<!-- END crystallize:generated -->";

#[test]
fn crystallize_dry_run_writes_nothing() {
    let ctx = TestContext::new();
    // Drop some plausible source files so the scanners have something to do.
    let src = ctx.path().join("rust/leanspec-core/src");
    fs::create_dir_all(&src).unwrap();
    fs::write(
        src.join("lib.rs"),
        "pub struct MarkdownAdapter;\npub struct GitHubAdapter;\nimpl Adapter for MarkdownAdapter {}\nimpl Adapter for GitHubAdapter {}\n",
    )
    .unwrap();

    let result = exec_cli(&["crystallize", "--dry-run"], ctx.path());
    assert!(result.success, "stderr: {}", result.stderr);
    assert!(result.stdout.contains("Project Rules"));
    assert!(!ctx.path().join("AGENTS.md").exists());
    assert!(!ctx.path().join(".claude/skills").exists());
}

#[test]
fn crystallize_writes_agents_and_skills() {
    let ctx = TestContext::new();
    let src = ctx.path().join("rust/leanspec-core/src");
    fs::create_dir_all(&src).unwrap();
    fs::write(
        src.join("lib.rs"),
        "pub struct MarkdownAdapter;\npub struct GitHubAdapter;\nimpl Adapter for MarkdownAdapter {}\nimpl Adapter for GitHubAdapter {}\n",
    )
    .unwrap();

    let result = exec_cli(&["crystallize"], ctx.path());
    assert!(result.success, "stderr: {}", result.stderr);

    let agents = fs::read_to_string(ctx.path().join("AGENTS.md")).expect("AGENTS.md written");
    assert!(agents.contains(BEGIN_MARK));
    assert!(agents.contains(END_MARK));
    assert!(agents.contains("Project Rules"));

    let adapter_skill =
        fs::read_to_string(ctx.path().join(".claude/skills/adding-a-new-adapter.md"))
            .expect("adapter skill written");
    assert!(adapter_skill.contains("How to Add a New Adapter"));
}

#[test]
fn crystallize_update_preserves_manual_content_outside_markers() {
    let ctx = TestContext::new();

    // Pre-seed AGENTS.md with manual content + an old generated block.
    let manual = format!(
        "# Manual top\n\nKeep this content.\n\n{}\nOLD STALE BLOCK\n{}\n\n# Manual bottom\nAlso keep.\n",
        BEGIN_MARK, END_MARK
    );
    fs::write(ctx.path().join("AGENTS.md"), &manual).unwrap();

    let result = exec_cli(&["crystallize", "--update"], ctx.path());
    assert!(result.success, "stderr: {}", result.stderr);

    let after = fs::read_to_string(ctx.path().join("AGENTS.md")).unwrap();
    assert!(after.contains("# Manual top"));
    assert!(after.contains("Keep this content."));
    assert!(after.contains("# Manual bottom"));
    assert!(after.contains("Also keep."));
    assert!(!after.contains("OLD STALE BLOCK"));
    assert!(after.contains("Project Rules"));
}

#[test]
fn crystallize_handles_empty_repo() {
    let ctx = TestContext::new();
    let result = exec_cli(&["crystallize", "--dry-run"], ctx.path());
    assert!(result.success, "stderr: {}", result.stderr);
    // The output is allowed to say "no rules detected" but must not panic.
    assert!(result.stdout.contains(BEGIN_MARK));
}
