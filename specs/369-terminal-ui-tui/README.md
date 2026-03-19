---
status: planned
created: '2026-03-11'
tags:
  - cli
  - tui
  - ux
  - rust
  - ratatui
priority: high
created_at: '2026-03-11T09:00:20.459758+00:00'
---

# Terminal User Interface (TUI) for Spec Management

> **Status**: planned · **Priority**: high · **Created**: 2026-03-11

## Overview

Developers using AI coding tools (Claude Code, Cursor, etc.) work primarily in the terminal. Currently, viewing specs with rich visuals requires switching to the web UI — a context switch that breaks flow. The CLI provides text output but lacks interactivity. A TUI bridges this gap: rich, interactive spec management without leaving the terminal.

**Goal**: Build a `lean-spec tui` command that provides an interactive terminal interface for browsing, searching, and viewing specs — optimized for developers who live in the terminal.

## Design

### Stack

- **ratatui** + **crossterm**: Standard Rust TUI stack, well-maintained, battle-tested
- **leanspec-core**: Already provides all data access (SpecLoader, SpecInfo, relationships)
- Ships as part of the existing `lean-spec` binary — no separate install

### Architecture

```
rust/leanspec-cli/src/commands/
  tui/
    mod.rs          # Entry point, app state, event loop
    board.rs        # Board view widget
    detail.rs       # Spec detail widget
    search.rs       # Search/filter overlay
    deps.rs         # Dependency tree widget
    layout.rs       # Split-pane responsive layout
    keybindings.rs  # Input handling
```

### Key Decisions

1. **Read-only first**: Viewing/browsing only. Editing stays in the editor or CLI.
2. **Reuse leanspec-core**: All spec loading, filtering, and relationship logic already exists.
3. **Single binary**: Compiles into the existing CLI binary behind the `tui` subcommand.
4. **Lazy loading**: Only load spec content when selected (board shows titles/metadata only).

### Views

| View | Description | Navigation |
|------|-------------|------------|
| Board | Specs grouped in columns by status | Tab between groups, j/k within |
| List | Flat spec list with sort/filter | j/k navigate, / to search |
| Detail | Full spec content with metadata | Scroll with j/k, links navigable |
| Deps | Dependency tree visualization | Arrow keys to traverse |

### Layout

Split-pane (similar to lazygit): board/list on left, spec detail on right. Responsive — collapses to single pane on narrow terminals.

## Plan

- [ ] Add `ratatui` and `crossterm` dependencies to `leanspec-cli/Cargo.toml`
- [ ] Implement app state struct and event loop (`tui/mod.rs`)
- [ ] Build board view widget with status grouping and keyboard navigation
- [ ] Build spec detail pane with markdown rendering and metadata display
- [ ] Implement split-pane responsive layout
- [ ] Add live search/filter overlay
- [ ] Add dependency tree view
- [ ] Wire up `lean-spec tui` subcommand
- [ ] Test with 300+ specs for performance

## Non-Goals

- Spec editing (use editor or CLI `update` command)
- Session management UI (future enhancement)
- Chat/AI integration in the TUI
- Replacing the web UI — TUI is a complementary interface for terminal-native workflows

## Test

- [ ] `lean-spec tui` launches without errors
- [ ] Board view renders all specs grouped by status
- [ ] Selecting a spec shows full content, metadata, and relationships
- [ ] Search filters specs in real-time as the user types
- [ ] All navigation is keyboard-driven with discoverable keybindings (? for help)
- [ ] Renders correctly in standard terminal sizes (80x24 minimum)
- [ ] Loads and renders 300+ specs without noticeable lag
