---
status: complete
created: 2026-03-24
priority: high
tags:
- cli
- tui
- testing
- rust
- ratatui
- snapshot
- e2e
depends_on:
- 374-tui-realtime-file-watch
created_at: 2026-03-24T08:46:22.648883172Z
updated_at: 2026-03-24T10:08:18.620811004Z
completed_at: 2026-03-24T10:08:18.620811004Z
transitions:
- status: complete
  at: 2026-03-24T10:08:18.620811004Z
---

# TUI Testing: Snapshot Tests and E2E Headless Mode

## Overview

The TUI has 62 unit tests that verify app state logic, but no tests for what the screen looks like or whether user interaction flows work end-to-end. Visual regressions (broken layout, missing sort indicator) and behavioral bugs (filter not preserved after reload, wrong sort after project switch) go undetected until someone manually runs the TUI.

This spec adds two testing layers that AI agents like Claude Code can run and interpret without a real terminal:

- **Layer 2 — Snapshot tests**: render the TUI to an in-memory grid, save as a text file, diff on every run. Equivalent to Storybook/Jest snapshot tests in web development.
- **Layer 3 — E2E headless mode**: drive the TUI with a key sequence script, output app state as JSON. Equivalent to Playwright/Cypress E2E tests in web development.

## Design

### Layer 2: Snapshot Tests

Ratatui provides `TestBackend` — a fake terminal that renders to a 2D grid in memory instead of writing ANSI codes to a real screen. The same `draw()` function that renders to your terminal renders to `TestBackend` unchanged.

```
Normal run:                          Test run (TestBackend):

lean-spec tui                        TestBackend::new(120, 30)
     │                                    │
     ▼                                    ▼
Real terminal                        In-memory grid of cells
\x1b[32m● 374-…\x1b[0m             grid[2][0] = { char:'●', fg:Green }
  (unreadable escape codes)               │
                                     flatten to plain text string
                                          │
                                    "● 374-tui-realtime-file-watch"
                                          │
                                     compare to .snap file ←── saved on first run
```

The `insta` crate manages the `.snap` files. On every `cargo test` run, the current render is compared to the saved snapshot:

```
Saved snapshot (.snap file):
─ List [ID↓] ───────────────────────────────────────────
  S  P  Path                  Title
▶ ●  ↑  374-tui-realtime-…   TUI Realtime File Watch
  ·  -  375-tui-spec-edit…   TUI Spec Editing

After accidentally removing the sort indicator:
─ List ──────────────────────────────────────────────── ← CHANGED
  S  P  Path                  Title
▶ ●  ↑  374-tui-realtime-…   TUI Realtime File Watch   ← same
  ·  -  375-tui-spec-edit…   TUI Spec Editing           ← same

→ ❌ test fails with a readable text diff
→ Claude Code reads the diff, finds and fixes the regression
```

**Views to snapshot:** list (flat + tree), board (expanded + collapsed group), detail pane, search/filter/TOC/help overlays.

### Layer 3: E2E Headless Mode

Add a `--headless <script>` CLI flag. When set, the TUI loads specs, replays the key sequence, then prints app state as JSON and exits — no real terminal needed.

```
Web E2E (Playwright)                TUI E2E (headless mode)
────────────────────────────────────────────────────────────
await page.goto('/specs')           lean-spec tui --headless ""
await page.click('#sort-btn')       send 's'
await page.type('#search', 'tui')   send '/tui\n'
expect(el).toHaveText('4 specs')    assert filtered_count == 4
```

Example invocation and output:

```bash
$ lean-spec tui --headless "ss/tui\n" --specs-dir ./specs
# key sequence: s=sort, s=sort again, /tui\n=search for "tui"
```

```json
{
  "view": "List",
  "mode": "Normal",
  "spec_count": 78,
  "filtered_count": 4,
  "sort": "Priority ↓",
  "search_query": "tui",
  "selected_path": "376-tui-testing-snapshot-e2e",
  "board_groups": [
    { "status": "InProgress", "count": 2, "collapsed": false },
    { "status": "Planned",    "count": 2, "collapsed": false }
  ],
  "tree_mode": false,
  "sidebar_collapsed": false
}
```

Integration test that spawns the binary and asserts on the JSON:

```rust
#[test]
fn test_sort_cycles_then_search_filters() {
    let output = Command::new("lean-spec")
        .args(["tui", "--headless", "ss/tui\n", "--specs-dir", "tests/fixtures/tui-sample"])
        .output().unwrap();

    let state: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(state["sort"], "Priority ↓");
    assert_eq!(state["filtered_count"], 4);
    assert_eq!(state["search_query"], "tui");
}
```

### Test Fixtures

Both layers need stable, deterministic spec data. Add `tests/fixtures/tui-sample/` — a small specs directory with ~10 fixed specs (one per status, varied priorities) committed to the repo. Snapshots generated from this data are stable across machines and CI runs.

## Plan

### Layer 2: Snapshot Tests

- [ ] Add `insta = "1"` to `leanspec-cli` dev-dependencies
- [ ] Make `draw()` in `tui/mod.rs` `pub(crate)` so snapshot tests can call it
- [ ] Add `tui/test_helpers.rs` with `render_to_string(app: &mut App, width: u16, height: u16) -> String`
- [ ] Create `tests/fixtures/tui-sample/` with ~10 deterministic specs
- [ ] Write snapshot tests for each view and overlay:
  - [ ] List view, default state (flat, sorted by ID desc)
  - [ ] List view with sort indicator changed (`s` pressed once)
  - [ ] List view with filter active (`[F]` shown in title)
  - [ ] List view in tree mode
  - [ ] Board view, all groups expanded
  - [ ] Board view with one group collapsed (`▶`)
  - [ ] Detail pane with spec content rendered
  - [ ] Search overlay open
  - [ ] Filter overlay open
  - [ ] TOC overlay open
  - [ ] Help overlay
- [ ] Run `cargo insta review` to approve initial snapshots, commit `.snap` files

### Layer 3: E2E Headless Mode

- [ ] Add `--headless <script>` argument to `tui` subcommand CLI definition
- [ ] Add `AppDebugState` struct with `#[derive(serde::Serialize)]`
- [ ] Implement `App::debug_state() -> AppDebugState`
- [ ] Add `tui/headless.rs`: parse key sequence string into `Vec<KeyEvent>` (`s`=sort, `/`=search, `\n`=enter, `j`/`k`=nav, `1`/`2`=view, `c`=collapse, `f`=filter, `ESC`=escape)
- [ ] In `run()`: detect `--headless`, replay key sequence via `keybindings::handle_key`, print JSON, exit (skip terminal init)
- [ ] Write E2E integration tests in `tests/tui_e2e.rs`:
  - [ ] Default launch: correct `spec_count` and default sort
  - [ ] `"s"`: sort cycles to ID ↑
  - [ ] `"ss"`: sort cycles to Priority ↓
  - [ ] `"/tui\n"`: filtered_count matches specs containing "tui"
  - [ ] `"2"`: view switches to Board, board_groups populated
  - [ ] `"2c"`: first board group is collapsed
  - [ ] `"jj"`: selected_path changes after 2 down moves
  - [ ] `"ESC"`: mode returns to Normal from any overlay

## Non-Goals

- PTY-based testing (real terminal process with raw keystrokes) — fragile, timing-dependent
- Screenshot image / pixel-level comparison — overkill for a terminal app
- Mouse interaction scripting in headless mode — covered by unit tests
- Headless mode for end-user use (dev/test only)

## Test

- [ ] `cargo test` passes with all snapshot tests on clean checkout
- [ ] Intentionally removing the sort indicator causes a snapshot test to fail with a readable diff
- [ ] `cargo insta review` shows the changed snapshot clearly for human approval
- [ ] `--headless "s"` outputs JSON with `sort == "ID ↑"`
- [ ] `--headless "/tui\n"` outputs JSON with `filtered_count` less than `spec_count`
- [ ] `--headless "2"` outputs JSON with `view == "Board"` and non-empty `board_groups`
- [ ] All E2E tests pass in CI without a TTY available
