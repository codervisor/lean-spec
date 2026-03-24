---
status: complete
created: 2026-03-24
priority: high
tags:
- cli
- tui
- ux
- rust
- ratatui
depends_on:
- 373-tui-polish-scrollbar-theme-board
- 372-tui-project-management
created_at: 2026-03-24T09:05:13.302556873Z
updated_at: 2026-03-24T10:09:34.855358265Z
completed_at: 2026-03-24T10:09:34.855358265Z
transitions:
- status: complete
  at: 2026-03-24T10:09:34.855358265Z
---

# TUI UX Feedback: Defaults, Settings Persistence & Scroll Fixes

## Overview

A second round of TUI polish items from real-world use, as follow-up to specs #372–#374. Covers: priority icon sizing, startup CWD resolution, per-project UI settings persistence, archived-hide default, scroll-after-G rendering bug, and scrollbar mouse drag.

## Problems

1. **Critical priority icon is double-width** — `"!!"` takes 2 cells and is visually noisy; should be `"! "` (single `!` + space) to match the 2-cell width of other priority symbols.

2. **Startup ignores CWD** — `resolve_specs_dir` picks the most recently accessed project. If the user `cd`'d into their project directory and launches `lean-spec tui`, they expect *that* project — not whichever was last accessed elsewhere. CWD should be checked first.
   > Overlaps spec #372 startup behavior table — update that spec's table and implement here.

3. **No per-project UI settings persistence** — Sort order, filter state, sidebar width/collapsed are reset on every launch. The web UI persists these per-project. The TUI should save/restore them from `~/.lean-spec/tui-prefs/<project-id>.json`.

4. **Archived specs visible by default** — `FilterState::default()` shows all statuses including `Archived`. Most users don't want archived specs cluttering the list. Default should exclude `Archived`; users opt-in via filter.

5. **Cursor stuck at viewport bottom after `G`** — After pressing `G` (go to last item), pressing `k` to scroll back up leaves the cursor pinned to the last visible row while the viewport scrolls. Root cause: offset formula `offset = list_selected - visible_rows + 1` always keeps the cursor at row N−1 of the viewport. Fix: add a `scrolloff`-style margin (3 rows) and store `list_scroll_offset: usize` in `App` instead of deriving it on each render.

6. **Scrollbar is not draggable** — Spec #373 added visual scrollbars (ratatui `Scrollbar` widget). The widget is render-only; clicking/dragging the thumb does not scroll. Need to handle `MouseEvent::Down/Drag` on the scrollbar gutter column to update scroll position proportionally.

## Design

### 1. Critical Priority Icon

`theme.rs`, `priority_symbol`:
```rust
// Before
Some(SpecPriority::Critical) => "!!",
// After
Some(SpecPriority::Critical) => "! ",
```

### 2. CWD-First Startup

In `mod.rs`, `resolve_specs_dir` — new resolution order:

| Priority | Condition | Action |
|---|---|---|
| 1 | `--specs-dir` given | Use it (unchanged) |
| 2 | `--project` given | Look up in registry (unchanged) |
| 3 | CWD matches a registered project | Use that project |
| 4 | Registry has projects | Use most-recently-accessed |
| 5 | Registry empty | Show add-project prompt (not silent fallback) |

CWD match: check if any registered project's `specs_dir` equals `cwd`, or is a child of `cwd`, or `cwd` itself is inside the project root (parent of `specs_dir`).

### 3. Per-Project Settings Persistence

`TuiPrefs` stored at `~/.lean-spec/tui-prefs/<project-id>.json`:

```json
{
  "sort_option": "IdDesc",
  "filter_statuses": ["InProgress", "Planned", "Draft", "Complete"],
  "filter_priorities": [],
  "filter_tags": [],
  "sidebar_width_pct": 30,
  "sidebar_collapsed": false
}
```

- Load on TUI startup after project is resolved; apply to `App` before first render.
- Save on TUI exit (in `run()`).
- For `--specs-dir` without registry, key by `sha256(specs_dir)[..8]`.
- Missing file → use defaults (item 4).

### 4. Hide Archived Default

```rust
impl Default for FilterState {
    fn default() -> Self {
        Self {
            statuses: vec![
                SpecStatus::InProgress,
                SpecStatus::Planned,
                SpecStatus::Draft,
                SpecStatus::Complete,
            ],
            priorities: vec![],
            tags: vec![],
        }
    }
}
```

Add a **Show All** option in the filter popup (`A` key) that clears all status filters (shows everything including archived).

Update status bar: when archived are filtered out, show `[no archived]` hint next to `[F]`.

### 5. Scrolloff Margin

Add `pub list_scroll_offset: usize` to `App` (replaces the on-render derivation in `list.rs`).

Update all navigation methods (`move_up`, `move_down`, `move_first`, `move_last`, `page_up`, `page_down`) to call a shared helper:

```rust
const SCROLLOFF: usize = 3;

fn clamp_scroll_offset(&mut self, visible_rows: usize) {
    let sel = self.list_selected;
    // Scroll down: keep SCROLLOFF rows below cursor visible
    let max_offset = sel.saturating_sub(SCROLLOFF);
    // Scroll up: keep SCROLLOFF rows above cursor visible
    let min_offset = sel + SCROLLOFF + 1 - visible_rows.min(sel + SCROLLOFF + 1);
    self.list_scroll_offset = self.list_scroll_offset.clamp(min_offset, max_offset);
    // Also clamp to valid range
    let max_scroll = self.visible_list_len().saturating_sub(visible_rows);
    self.list_scroll_offset = self.list_scroll_offset.min(max_scroll);
}
```

`list.rs` uses `app.list_scroll_offset` directly instead of deriving it. The scrolloff clamp needs the current viewport height — pass it via `app.layout_left.height` (already stored).

### 6. Scrollbar Mouse Drag

Add to `App`:
- `list_scrollbar_col: u16` — right column of list pane (set during render)
- `scrollbar_drag_active: bool`

In `keybindings.rs` mouse handler, on `MouseEvent::Down { column, row, .. }`:
```rust
if column == app.list_scrollbar_col && app.primary_view == PrimaryView::List {
    let inner_top = app.layout_left.y + 3; // skip header rows
    let inner_height = app.layout_left.height.saturating_sub(4) as usize;
    let total = app.filtered_specs.len();
    let new_sel = ((row - inner_top) as usize * total / inner_height).min(total - 1);
    app.list_selected = new_sel;
    app.scrollbar_drag_active = true;
    app.load_selected_detail();
}
```

On `MouseEvent::Drag`: same calculation while `scrollbar_drag_active`.
On `MouseEvent::Up`: clear `scrollbar_drag_active`.

## Plan

- [x] Fix critical priority icon: `"!!"` → `"! "` in `theme.rs`
- [x] Update `resolve_specs_dir` in `mod.rs` to prefer CWD match before most-recently-accessed
- [x] Update startup behavior table in spec #372
- [x] Add `TuiPrefs` struct with serde; save/load from `~/.lean-spec/tui-prefs/`
- [x] Wire prefs load into `App::new` and save into `run()` on exit
- [x] Change `FilterState::default()` to exclude `Archived`; add `A` = show-all in filter popup
- [x] Add `list_scroll_offset: usize` to `App`; update nav methods to call `clamp_scroll_offset`
- [x] Update `list.rs` to use `app.list_scroll_offset` instead of deriving offset
- [x] Add scrollbar drag fields; handle `MouseEvent::Down/Drag/Up` on gutter column in `keybindings.rs`

## Non-Goals

- Syncing TUI prefs to the web UI (each client is independent)
- Animated scrolling
- Configurable scrolloff value (hardcode 3)
- Dragging the detail pane scrollbar (keyboard-only for now)

## Test

- [x] Critical priority shows single `!` in list, board, and filter views
- [x] `lean-spec tui` from a project directory opens that project (not most-recently-accessed)
- [x] `lean-spec tui` from non-project dir opens most-recently-accessed
- [x] `lean-spec tui` with empty registry shows add-project prompt
- [x] Sort, filter, sidebar state are restored on next launch for the same project
- [x] Archived specs are hidden by default on fresh launch
- [x] After `G`, pressing `k` produces visible upward scroll (cursor has scrolloff context above/below)
- [x] Clicking scrollbar gutter jumps to that position in the list
- [x] Dragging scrollbar thumb scrolls proportionally