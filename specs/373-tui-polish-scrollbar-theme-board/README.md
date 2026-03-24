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
- 371-tui-sidebar-navigation
created_at: 2026-03-24T02:59:02.524567521Z
updated_at: 2026-03-24T10:09:34.827219694Z
completed_at: 2026-03-24T10:09:34.827219694Z
transitions:
- status: in-progress
  at: 2026-03-24T07:41:23.104405233Z
- status: complete
  at: 2026-03-24T10:09:34.827219694Z
---

# TUI Polish: Scrollbars, Board UX, Theme Modernization

## Overview

A collection of targeted polish items for the TUI identified during real-world use. The existing TUI works but feels rough compared to tools like lazygit or Claude Code — missing visible scrollbars, no board collapsibility, awkward board navigation, hidden sort state, wrong default view, and a dated ASCII-symbol theme.

## Problems

1. **Sidebar truncates long lists** — when specs exceed the visible area the list clips silently with no scroll feedback; the offset calculation exists but a 300-spec project fills far beyond the viewport with no cue
2. **No visible scrollbar** — lazygit, btm, and helix all show a scrollbar gutter; the TUI has none, so users can't tell where they are in a long list
3. **Board groups not collapseable** — all status groups (draft, planned, in-progress, complete, archived) are always expanded; users with many specs can't fold completed/archived groups to reduce noise
4. **Board tab-group navigation unintuitive** — moving between status groups in board view requires knowing undocumented key sequences; there is no visible group header affordance indicating how to jump between groups
5. **Active sort not shown in board view** — list pane title shows `[Sort: ID↓]`; board pane title shows just ` Board ` with no sort indicator, so users applying sort can't see it reflected in board
6. **Default view is Board, should be List** — `PrimaryView` enum has `#[default]` on `Board`; list view is more broadly useful as the entry point
7. **Mouse scroll targets focused pane, not hovered pane** — `ScrollDown`/`ScrollUp` in `keybindings.rs` check `app.focus` instead of `mouse.column`; hovering over the sidebar and scrolling incorrectly scrolls the detail pane when it is focused, and vice versa
8. **No way to navigate sections in long specs** — the detail pane is a single scroll; specs like #373 have 7+ `##` sections but there is no TOC or jump-to-heading affordance
9. **Theme uses plain ASCII symbols, dated colors** — status symbols are single chars (`D`/`P`/`W`/`C`/`A`), priority arrows are box-drawing chars, selection highlight is `DarkGray` bg — the overall palette feels like a 1990s ncurses app

> Note: Detail header stickiness (originally raised) is already implemented via `Constraint::Length(6)` in `detail.rs` — no work needed.

## Design

### 1 & 2. Scrollbar Widget

Use ratatui's built-in `Scrollbar` widget (introduced in ratatui 0.24) in both the list and board left panes.

- Render a vertical scrollbar in the right gutter of each scrollable pane
- Scrollbar state tracks `content_length`, `position`, and `viewport_content_length`
- Style: `▐` track, `█` thumb — same style lazygit uses
- Show scrollbar only when content exceeds viewport height (no empty scrollbar on short lists)
- Sidebar list, board left pane, and detail body all get scrollbars

```
┌─ List [ID↓] ──────────────────────────┐
│ S  P  Path            Title           ║│
│ ─────────────────────────────────────-║│
│ ●  ▲  371-tui-side…   TUI Sidebar N…  ║│
│ ●  ▲  372-tui-proj…   TUI Project …  █│
│ ○  —  369-terminal…   Terminal UI …  █│
│ ○  —  370-tui-ux-e…   TUI UX Enhan…  ║│
│                                       ║│
└────────────────────────────────────────┘
```

### 3. Collapsible Board Groups

Add collapse state to `BoardGroup` struct: `collapsed: bool`.

- **`c`** (or Space when on a group header row) — toggle collapse/expand the current group
- **`C`** — collapse all groups
- **`E`** — expand all groups (symmetrical to tree view `z`/`Z`)
- Collapsed group shows: `▶ Planned (12)  [collapsed]`
- Expanded group shows: `▼ Planned (12)`
- Group headers become navigable rows (group header = a selectable row in board nav)
- Navigation wraps naturally: when all items in a collapsed group are hidden, `j`/`k` jumps to next group header

### 4. Board Group Navigation Affordances

Make group navigation obvious:

- Group header rows are visually distinct: bold + status color + `▼`/`▶` indicator + count badge
- Status bar hint updates when cursor is on a group header: `[Space] expand/collapse  [j/k] navigate`
- `Tab` / `Shift+Tab` jump directly to the next/previous group header (skipping all items)
- Add group header row to the board navigation state machine so it's a proper selectable position
- Help overlay (`?`) documents Tab for group-jump

### 5. Sort Indicator in Board View

Mirror the list pane title format in board:

```
 Board [ID↓][F]
```

- Same `app.sort_option.label()` call used in `list.rs`, applied to `board.rs` title
- Filter indicator `[F]` shown when filters are active (same as list)

### 6. Default to List View

Change the `#[default]` derive on `PrimaryView`:

```rust
pub enum PrimaryView {
    Board,
    #[default]
    List,
}
```

No other changes needed — `App::new` uses `PrimaryView::default()` when no explicit view is passed, and the CLI's `--view board` flag still works.

### 7. TOC Overlay for Detail Pane

Add a `T` keybinding (when detail pane is focused) that opens a Table of Contents popup showing all `##` and `###` headings extracted from the current spec's markdown.

**Extraction**: update `render_markdown` (or a new `extract_headings`) to also return a `Vec<(line_index, level, heading_text)>` alongside the rendered lines. `line_index` is the rendered-line position so jumping is exact.

**Overlay UI** (centered, similar to filter popup):

```
┌─ Contents ─────────────────────────────┐
│                                        │
│   Overview                             │
│   Problems                             │
│ ▶ Design                               │
│     1 & 2. Scrollbar Widget            │
│     3. Collapsible Board Groups        │
│     4. Board Group Navigation          │
│   Plan                                 │
│   Non-Goals                            │
│   Test                                 │
│                                        │
│ [j/k] navigate  [Enter] jump  [Esc]    │
└────────────────────────────────────────┘
```

- `##` headings shown at base indent; `###` shown indented by 2 spaces
- `▶` marks the currently visible section (whichever heading is last above `detail_scroll`)
- `j`/`k` navigate; `Enter` sets `detail_scroll` to that heading's line index and closes
- `Esc` or `T` again closes without jumping
- Store headings in `App` alongside `selected_detail` — recomputed when spec changes

### 8. Mouse Scroll by Cursor Position

Fix `handle_mouse` in `keybindings.rs` to route scroll events based on where the mouse cursor is, not which pane has keyboard focus:

```rust
MouseEventKind::ScrollDown => {
    if mouse.column >= app.layout_right.x {
        app.scroll_detail_down();
    } else {
        app.move_down();
    }
}
MouseEventKind::ScrollUp => {
    if mouse.column >= app.layout_right.x {
        app.scroll_detail_up();
    } else {
        app.move_up();
    }
}
```

- Uses `app.layout_right.x` (already stored each frame) as the pane boundary
- When sidebar is collapsed (`app.sidebar_collapsed`), all columns route to detail scroll
- Keyboard focus (`app.focus`) is unchanged by scrolling — only determines keyboard `j`/`k` behavior

### 9. Modern Theme

Replace ASCII single-char symbols with Unicode equivalents that render in single terminal cell width (avoid full-width emoji that break ratatui layout):

**Status symbols** (replace D/P/W/C/A):

| Status | Old | New | Meaning |
|--------|-----|-----|---------|
| Draft | `D` | `○` | empty circle — not started |
| Planned | `P` | `·` | dot — queued |
| In Progress | `W` | `◑` | half circle — in progress |
| Complete | `C` | `●` | filled circle — done |
| Archived | `A` | `⊘` | circle-slash — retired |

**Priority symbols** (replace ↑/▲/—/▽):

| Priority | Old | New |
|----------|-----|-----|
| Critical | `↑` | `!!` |
| High | `▲` | `!` |
| Medium | `—` | `·` |
| Low | `▽` | `↓` |

**Color palette** — replace raw `Color::X` calls with a palette table in `theme.rs`:

| Token | Current | Proposed |
|-------|---------|----------|
| Selection bg | `DarkGray` | `Color::Rgb(50, 50, 80)` (indigo tint) |
| Inactive selection | `DarkGray` | `Color::Rgb(35, 35, 55)` |
| Border focused | `Cyan` | `Color::Rgb(100, 200, 255)` (bright blue) |
| Border unfocused | `DarkGray` | `Color::Rgb(70, 70, 90)` |
| Status: complete | `Green` | `Color::Rgb(80, 200, 120)` |
| Status: in-progress | `Yellow` | `Color::Rgb(255, 190, 50)` |
| Status: planned | `Blue` | `Color::Rgb(100, 140, 255)` |
| Status: draft | `Cyan` | `Color::Rgb(160, 220, 220)` |
| Status: archived | `DarkGray` | `Color::Rgb(90, 90, 90)` |
| Header/title | `White+Bold` | `Color::Rgb(220, 220, 255)+Bold` |
| Dimmed | `DarkGray` | `Color::Rgb(100, 100, 120)` |

Note: Use 24-bit RGB only when terminal supports it. Fall back gracefully via ratatui's `Color::Reset` or ANSI 256 if needed. Check with `crossterm`'s `supports_color` before applying RGB.

## Plan

- [x] Add `Scrollbar` widget from ratatui to `list.rs` (vertical, right gutter)
- [x] Add `Scrollbar` widget to `board.rs` (vertical, right gutter)
- [x] Add `Scrollbar` widget to `detail.rs` body section
- [x] Track scrollbar state (`ScrollbarState`) in `App` for list, board, and detail
- [x] Add `collapsed: bool` field to `BoardGroup` struct
- [x] Implement `c` keybinding to toggle current board group collapse
- [x] Implement `C`/`E` to collapse/expand all board groups
- [x] Update board render to skip items in collapsed groups
- [x] Make group header rows navigable (add to board nav state machine)
- [x] Add `Tab`/`Shift+Tab` keybindings for group-to-group jump in board
- [x] Update board pane title to show sort + filter indicator
- [x] Change `PrimaryView` default from `Board` to `List`
- [x] Update `theme.rs`: replace ASCII status symbols with Unicode circle set
- [x] Update `theme.rs`: replace priority symbols
- [x] Update `theme.rs`: replace `Color::X` constants with RGB palette
- [x] Add terminal color support check before applying RGB colors
- [x] Update help overlay with new keybindings (`c`/`C`/`E`, Tab/Shift+Tab)
- [x] Update status bar hints to reflect board group header context
- [x] Update `render_markdown` (or add `extract_headings`) to return heading positions alongside rendered lines
- [x] Store `Vec<(usize, u8, String)>` (line_idx, level, text) in `App` as `detail_toc`
- [x] Add `AppMode::Toc` variant and `toc_selected: usize` to `App`
- [x] Implement `tui/toc.rs` overlay widget (centered popup with heading list)
- [x] Mark currently visible section with `▶` based on `detail_scroll`
- [x] `T` keybinding opens TOC when detail pane is focused; `Enter` jumps, `Esc`/`T` closes
- [x] Fix `handle_mouse`: route `ScrollDown`/`ScrollUp` by `mouse.column` vs `layout_right.x`, not by `app.focus`
- [x] Handle collapsed sidebar edge case: all columns scroll detail when sidebar is hidden

## Non-Goals

- Emoji (multi-codepoint or wide-char) — ratatui cell-width issues make these unreliable
- Custom color themes or theme files — single curated palette only
- Animated transitions (collapse/expand) — static render only
- True 256-color fallback map — RGB or terminal default only

## Test

- [x] Scrollbar appears in list pane when spec count exceeds viewport height
- [x] Scrollbar thumb moves proportionally as selection moves through the list
- [x] Scrollbar appears in board pane and detail body independently
- [x] No scrollbar rendered when all content fits in viewport
- [x] `c` collapses/expands current board group; collapsed group shows `▶`
- [x] `C` collapses all; `E` expands all
- [x] Navigation skips items in collapsed groups
- [x] Tab jumps to next group header; Shift+Tab to previous
- [x] Board pane title shows `[Sort: ID↓]` when sorted
- [x] Board pane title shows `[F]` when filter active
- [x] Default launch opens list view (not board)
- [x] `--view board` flag still opens board view
- [x] Status symbols show `○·◑●⊘` not `DPWCA`
- [x] Selection highlight is indigo-tinted, not plain DarkGray
- [x] RGB colors applied only when terminal supports color
- [x] `T` opens TOC overlay showing all `##`/`###` headings for current spec
- [x] Currently visible section is marked with `▶` in TOC
- [x] `Enter` on a TOC entry scrolls detail pane to that heading's exact line
- [x] TOC overlay closes on `Esc` or `T` without changing scroll position
- [x] Mouse scroll over sidebar scrolls sidebar list, regardless of keyboard focus
- [x] Mouse scroll over detail pane scrolls detail content, regardless of keyboard focus
- [x] Mouse scroll works correctly when sidebar is collapsed (all area routes to detail)