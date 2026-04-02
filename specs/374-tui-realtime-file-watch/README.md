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
created_at: 2026-03-24T03:01:26.076784699Z
updated_at: 2026-03-24T10:08:18.591238522Z
completed_at: 2026-03-24T10:08:18.591238522Z
transitions:
- status: in-progress
  at: 2026-03-24T08:14:09.293627699Z
- status: complete
  at: 2026-03-24T10:08:18.591238522Z
---

# TUI Realtime File Watch: Auto-reload on Spec Changes

## Overview

The TUI event loop uses a blocking `event::read()` call — it only redraws on keyboard/mouse input. Spec files changed externally (by `lean-spec update`, an AI agent, a text editor, or another terminal session) are never reflected until the user quits and relaunches. This breaks any workflow involving concurrent editing alongside TUI browsing.

## Problem

`run_event_loop` in `tui/mod.rs` blocks indefinitely on `event::read()`:

```rust
match event::read()? {          // ← blocks forever; no file watch
    Event::Key(key) => ...
    Event::Mouse(mouse) => ...
    _ => {}
}
```

No `notify` or polling integration exists in `leanspec-cli`. The `notify` crate is not in `Cargo.toml`.

## Design

### Event Loop: Non-blocking Poll

Replace `event::read()` with a `event::poll()` + `event::read()` pattern so the loop has a heartbeat:

```rust
if event::poll(Duration::from_millis(200))? {
    match event::read()? {
        Event::Key(key) => keybindings::handle_key(app, key),
        Event::Mouse(mouse) => keybindings::handle_mouse(app, mouse),
        _ => {}
    }
}
// Check for file-change signals from watcher thread
app.process_file_events();
```

200ms poll interval is imperceptible to users and cheap (no busy loop).

### File Watcher Thread

Add `notify` crate (v6) to `leanspec-cli/Cargo.toml`. Spawn a watcher on TUI start:

```rust
// In App::new / run()
let (tx, rx) = std::sync::mpsc::channel::<notify::Event>();
let mut watcher = notify::recommended_watcher(move |res| {
    if let Ok(event) = res { let _ = tx.send(event); }
})?;
watcher.watch(specs_dir, RecursiveMode::Recursive)?;
// Store rx in App
```

The watcher thread sends filesystem events over a channel. The event loop drains the channel each tick via `rx.try_recv()`.

### Reload Logic

On receiving a file event for a `.md` file under the specs dir:

1. **Debounce**: ignore events within 300ms of the last reload (rapid saves from editors send bursts)
2. **Re-read specs** from disk (`App::reload_specs()`) — same logic as `App::new` but reuses existing `specs_dir`
3. **Preserve selection**: after reload, find the previously selected spec path in the new list and restore `list_selected` / `board_group_idx` / `board_item_idx`; if the spec was deleted, move to the nearest neighbor
4. **Update `selected_detail`**: reload the detail pane for the current spec (picks up any content changes)
5. **Preserve filter/sort state**: `filter` and `sort_option` are not reset on reload
6. **Reload indicator**: flash a brief `[reloaded]` suffix in the status bar for 1 second (cleared on next tick after 1s elapsed)

### What Triggers a Reload

Only `.md` files directly under `<specs_dir>/*/README.md` (or any `.md` under a spec subfolder). Debounce prevents redundant reloads on multi-file saves.

Ignored events:
- Changes to non-`.md` files
- Changes outside the watched specs directory
- `Chmod` / `Access` events (modify + create only)

### Status Bar Indicator

```
 NORMAL   List | Content   42 specs | 95% complete   #373   [↺]  q:quit ...
```

- `[↺]` appears briefly (1 second) after each auto-reload
- Steady-state: no indicator — silent background watching

## Plan

- [x] Add `notify = "6"` to `leanspec-cli/Cargo.toml`
- [x] Replace blocking `event::read()` in `run_event_loop` with `event::poll(200ms)` + `event::read()`
- [x] Add `mpsc::Receiver<notify::Event>` field to `App` (or pass alongside) — passed alongside to `run_event_loop`
- [x] Spawn `notify::recommended_watcher` in `run()`, watch `specs_dir` recursively
- [x] Implement `App::reload_specs()` — re-read from disk, rebuild `filtered_specs`, `board_groups`, `dep_graph`, `stats`
- [x] Implement debounce: track `last_reload: Instant`; skip if < 300ms since last
- [x] Implement selection preservation: store selected path before reload, restore by path after
- [x] Drain `rx.try_recv()` in event loop, call reload when `.md` change detected
- [x] Add `reload_flash_until: Option<Instant>` to App for the `[↺]` indicator
- [x] Render `[↺]` in status bar while `reload_flash_until` is Some and not elapsed
- [x] Update `App::empty_for_test()` to accept `None` for the receiver (test compatibility)

## Non-Goals

- Watching specs dirs of other projects (only current `specs_dir`)
- Live-editing spec content from the TUI
- Syncing with remote/cloud spec changes (handled by cloud sync layer)
- Showing a diff of what changed (just reload silently)

## Test

- [ ] Modify a spec file on disk → TUI reloads within 500ms without keypress
- [ ] Create a new spec dir → new spec appears in list after reload
- [ ] Delete a spec dir → spec removed from list; selection moves to neighbor
- [ ] Rename a spec (title change) → title updates in sidebar and detail
- [ ] Rapid saves (5 writes in 100ms) trigger only one reload (debounce)
- [ ] Filter and sort state preserved across reload
- [ ] Selected spec preserved across reload (same path reselected)
- [ ] `[↺]` flashes in status bar after reload and clears after 1 second
- [ ] No CPU spike during idle watching (verified with `top`)
- [ ] Non-`.md` file change (e.g. `.gitignore`) does not trigger reload

> Test items require manual verification with a running TUI instance.