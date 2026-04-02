---
status: planned
created: 2026-03-24
priority: high
tags:
- cli
- tui
- ux
- rust
- ratatui
depends_on:
- 371-tui-sidebar-navigation
- 374-tui-realtime-file-watch
created_at: 2026-03-24T03:08:48.347334170Z
updated_at: 2026-03-24T03:08:52.977776872Z
---

# TUI Spec Editing: Inline Metadata + Editor Integration

## Overview

The TUI is currently read-only. Users must drop to the CLI (`lean-spec update`, `lean-spec create`) or open a text editor separately to make any changes. This breaks the \"stay in the terminal\" workflow — the whole point of a TUI. This spec adds two tiers of editing: quick inline metadata changes (status, priority, tags) via popup pickers, and full content editing via `\$EDITOR` launch.

## Design

### Tier 1: \$EDITOR Launch

The highest-value editing action: open the current spec's `README.md` in the user's `\$EDITOR`.

**Keybinding**: `e` (from any focus state when a spec is selected)

**Flow**:
1. Suspend TUI: call `ratatui::restore()` + `DisableMouseCapture`
2. Launch `\$EDITOR <spec-path>/README.md` via `std::process::Command::new(editor).status()`; fall back to `\$VISUAL`, then `vi` if neither set
3. Block until editor exits
4. Resume TUI: call `ratatui::init()` + `EnableMouseCapture`, redraw
5. Reload the edited spec from disk (spec 374's file watch handles this automatically if running; otherwise force a manual reload of `selected_detail`)

This is the same pattern lazygit uses for commit message editing — suspend, edit, resume.

### Tier 2: Inline Status Picker

**Keybinding**: `S` (capital, to avoid conflict with lowercase `s` = sort cycle)

Opens a small centered popup:

```
┌─ Set Status ──────────────┐
│                            │
│   ○  draft                 │
│ ▶ ·  planned               │
│   ◑  in-progress           │
│   ●  complete              │
│   ⊘  archived              │
│                            │
│ [j/k] select  [Enter] set  │
└────────────────────────────┘
```

- Current status pre-selected (`▶`)
- `j`/`k` navigate; `Enter` calls `App::set_spec_status(path, new_status)`
- `Esc` cancels
- On confirm: write updated frontmatter to disk via `leanspec-core`'s `SpecStore::update_frontmatter` (same function the CLI `update` command uses); reload spec in sidebar + detail

### Tier 3: Inline Priority Picker

**Keybinding**: `P` (capital; lowercase `p` reserved for project switcher in spec 372)

```
┌─ Set Priority ─────────────┐
│                             │
│   !!  critical              │
│ ▶ !   high                  │
│   ·   medium                │
│   ↓   low                   │
│   -   (none)                │
│                             │
│ [j/k] select  [Enter] set   │
└─────────────────────────────┘
```

Same pattern as status picker.

### Tier 4: New Spec

**Keybinding**: `n`

Opens a single-line input prompt (reuse the search input widget style):

```
 New spec name: tui-editing-improvements_
```

- Accepts kebab-case name; `Enter` to confirm, `Esc` to cancel
- On confirm: calls `leanspec-core` create logic (equivalent to `lean-spec create <name>`) with `status: planned`, no content
- Then immediately launches `\$EDITOR` on the new spec file (same as tier 1 flow) so the user can fill in content right away
- Spec 374's file watch picks up the new file and adds it to the sidebar list

### Tier 5: Archive Spec

**Keybinding**: `X` (capital, destructive — requires deliberate shift)

Confirmation prompt before acting:

```
 Archive "373-tui-polish-…"? [y/N]
```

- `y` sets status to `archived` via `SpecStore::update_frontmatter`; `N`/`Esc` cancels
- Does NOT delete files — archive only
- Spec disappears from list if active filter excludes `archived` (default behavior)

### Write Path

All metadata mutations go through `leanspec-core`'s existing `SpecStore` / frontmatter write functions — never via `std::process::Command` shelling out to `lean-spec update`. This avoids subprocess overhead and keeps the write path testable.

The exact function to use: `SpecInfo::with_updated_frontmatter` + write back to `README.md`. If this helper doesn't exist, add it to `leanspec-core` as part of this spec.

## Plan

- [ ] Add `e` keybinding: suspend TUI, launch `\$EDITOR`, resume + reload on exit
- [ ] Resolve editor: check `\$EDITOR`, `\$VISUAL`, fall back to `vi`
- [ ] Add `AppMode::StatusPicker` and `status_picker_selected: usize` to `App`
- [ ] Implement `tui/status_picker.rs` overlay widget
- [ ] Add `S` keybinding to open status picker
- [ ] Implement `App::set_spec_status` — write frontmatter + reload spec
- [ ] Add `AppMode::PriorityPicker` and `priority_picker_selected: usize` to `App`
- [ ] Implement priority picker overlay (reuse status picker structure)
- [ ] Add `P` keybinding to open priority picker
- [ ] Implement `App::set_spec_priority` — write frontmatter + reload spec
- [ ] Add `AppMode::NewSpec` with name input buffer to `App`
- [ ] Implement new-spec name input prompt (reuse search input widget)
- [ ] On confirm: call `leanspec-core` create, then launch `\$EDITOR` on new file
- [ ] Add `X` keybinding with inline `y/N` confirmation for archive
- [ ] Implement `App::archive_spec` — set status archived + reload
- [ ] Add `SpecInfo::with_updated_frontmatter` to `leanspec-core` if not present
- [ ] Update help overlay with all new keybindings
- [ ] Update status bar hints: show `e:edit S:status P:priority n:new X:archive`

## Non-Goals

- Inline markdown body editing (full text editor inside ratatui) — use `\$EDITOR`
- Tag editing from TUI — tags are multi-value, complex to edit inline; use CLI or editor
- Spec deletion (hard delete) — archive only from TUI; deletion is a rare destructive action
- Undo/redo for metadata changes

## Dependencies

- Spec 374 (`tui-realtime-file-watch`) — file watch means `\$EDITOR` saves and new spec creation are automatically reflected without a manual reload trigger; this spec works without 374 but degrades to manual reload

## Test

- [ ] `e` suspends TUI, opens spec file in `\$EDITOR` (or `vi` if `\$EDITOR` unset), resumes on exit
- [ ] After `\$EDITOR` save, detail pane shows updated content (auto via file watch or manual reload)
- [ ] `S` opens status picker with current status pre-selected
- [ ] Changing status via picker updates frontmatter on disk and refreshes sidebar badge
- [ ] `P` opens priority picker; changing priority updates frontmatter and sidebar icon
- [ ] `n` prompts for name, creates spec, opens in `\$EDITOR`
- [ ] After creating via `n`, new spec appears in sidebar list
- [ ] `X` shows confirmation prompt; `y` archives, `N`/`Esc` cancels
- [ ] Archived spec disappears from list when archived filter is not active
- [ ] `Esc` cancels any picker/prompt without writing to disk
- [ ] All pickers close cleanly without leaving terminal in bad state after `\$EDITOR` session