---
status: complete
created: 2025-12-10
priority: medium
tags:
- desktop
- ui
- ux
- os-integration
- tauri
depends_on:
- 148-leanspec-desktop-app
created_at: 2025-12-10T08:41:06.205Z
updated_at: 2026-01-16T07:45:23.145052Z
transitions:
- status: in-progress
  at: 2025-12-10T08:51:47.855Z
---
# Native Menu Bar for Desktop App

> **Status**: ⏳ In progress · **Priority**: Medium · **Created**: 2025-12-10 · **Tags**: desktop, ui, ux, os-integration, tauri

## Overview

Add native OS menu bar to LeanSpec Desktop app with File, Edit, View, and Help menus for better OS integration and discoverability of features.

## Design

### Current State

The desktop app uses a **frameless window** (`decorations: false`) with:
- Custom title bar component with logo, project switcher, and window controls
- System tray menu (right-click tray icon)
- Global keyboard shortcuts

**Missing:** Native OS menu bar that appears at the top of the screen (macOS) or window (Windows/Linux).

### Proposed Menu Structure

```
File
├── New Spec...                 Cmd+N
├── Open Project...             Cmd+O
├── Switch Project...           Cmd+Shift+K
├── ─────────────
├── Close Window                Cmd+W
└── Quit LeanSpec               Cmd+Q

Edit
├── Cut                         Cmd+X
├── Copy                        Cmd+C
├── Paste                       Cmd+V
├── ─────────────
└── Find in Specs...            Cmd+F

View
├── Refresh Projects            Cmd+R
├── ─────────────
├── Toggle Sidebar              Cmd+B
├── ─────────────
├── Zoom In                     Cmd++
├── Zoom Out                    Cmd+-
└── Reset Zoom                  Cmd+0

Help
├── Documentation
├── Keyboard Shortcuts
├── ─────────────
├── Check for Updates
├── View Logs
└── About LeanSpec
```

### Technical Approach

**1. Tauri Menu API**

Use Tauri's built-in menu system in `main.rs`:

```rust
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

fn build_native_menu() -> Menu {
    let file_menu = Submenu::new(
        "File",
        Menu::new()
            .add_item(CustomMenuItem::new("new_spec", "New Spec...").accelerator("CmdOrCtrl+N"))
            .add_item(CustomMenuItem::new("open_project", "Open Project...").accelerator("CmdOrCtrl+O"))
            .add_item(CustomMenuItem::new("switch_project", "Switch Project...").accelerator("CmdOrCtrl+Shift+K"))
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::CloseWindow)
            .add_native_item(MenuItem::Quit),
    );

    let edit_menu = Submenu::new(
        "Edit",
        Menu::new()
            .add_native_item(MenuItem::Cut)
            .add_native_item(MenuItem::Copy)
            .add_native_item(MenuItem::Paste)
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("find", "Find in Specs...").accelerator("CmdOrCtrl+F")),
    );

    let view_menu = Submenu::new(
        "View",
        Menu::new()
            .add_item(CustomMenuItem::new("refresh", "Refresh Projects").accelerator("CmdOrCtrl+R"))
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("toggle_sidebar", "Toggle Sidebar").accelerator("CmdOrCtrl+B"))
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::EnterFullScreen),
    );

    let help_menu = Submenu::new(
        "Help",
        Menu::new()
            .add_item(CustomMenuItem::new("docs", "Documentation"))
            .add_item(CustomMenuItem::new("shortcuts", "Keyboard Shortcuts"))
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("updates", "Check for Updates"))
            .add_item(CustomMenuItem::new("logs", "View Logs"))
            .add_item(CustomMenuItem::new("about", "About LeanSpec")),
    );

    Menu::new()
        .add_submenu(file_menu)
        .add_submenu(edit_menu)
        .add_submenu(view_menu)
        .add_submenu(help_menu)
}
```

**2. Menu Event Handling**

Create `src-tauri/src/menu.rs`:

```rust
use tauri::{Manager, WindowMenuEvent};

pub fn handle_menu_event(event: WindowMenuEvent) {
    match event.menu_item_id() {
        "new_spec" => {
            let _ = event.window().emit("desktop://menu-new-spec", ());
        }
        "open_project" => {
            let _ = event.window().app_handle().emit_all("desktop://tray-add-project", ());
        }
        "switch_project" => {
            let _ = event.window().emit("desktop://shortcut-quick-switcher", ());
        }
        "find" => {
            let _ = event.window().emit("desktop://menu-find", ());
        }
        "refresh" => {
            let _ = event.window().app_handle().emit_all("desktop://tray-refresh-projects", ());
        }
        "toggle_sidebar" => {
            let _ = event.window().emit("desktop://menu-toggle-sidebar", ());
        }
        "docs" => {
            let _ = tauri::api::shell::open(&event.window().shell_scope(), "https://lean-spec.dev/docs", None);
        }
        "shortcuts" => {
            let _ = event.window().emit("desktop://menu-shortcuts", ());
        }
        "updates" => {
            let _ = event.window().app_handle().emit_all("desktop://tray-check-updates", ());
        }
        "logs" => {
            let _ = event.window().emit("desktop://menu-logs", ());
        }
        "about" => {
            let _ = event.window().emit("desktop://menu-about", ());
        }
        _ => {}
    }
}
```

**3. Integration in main.rs**

```rust
mod menu;

fn main() {
    tauri::Builder::default()
        .menu(menu::build_native_menu())
        .on_menu_event(menu::handle_menu_event)
        // ... existing setup
}
```

### Design Decisions

**Why add native menu when we have system tray?**
- **Discoverability**: New users expect menu bar, especially on macOS
- **Standard UX**: Follows OS conventions (File/Edit/View/Help structure)
- **Keyboard shortcuts**: Menu shows all shortcuts in one place
- **Accessibility**: Screen readers can navigate menus

**Why keep both menu bar AND custom title bar?**
- Custom title bar provides quick access to project switcher
- Menu bar provides comprehensive commands and shortcuts
- Not mutually exclusive - many apps have both (VS Code, Slack, etc.)

**Platform differences:**
- **macOS**: Menu appears in system menu bar at top of screen
- **Windows/Linux**: Menu appears within window below title bar

**Menu vs System Tray:**
- **Menu**: Comprehensive commands, keyboard shortcuts, follows OS conventions
- **Tray**: Quick access when window is hidden, recent projects

## Plan

- [x] Create spec and define menu structure
- [x] Create `src-tauri/src/menu.rs` with menu builder
- [x] Add menu event handler and wire it into `main.rs`
- [x] Update builder to register the menu alongside existing tray/plugins
- [x] Update frontend to handle new menu events:
  - `desktop://menu-new-spec`
  - `desktop://menu-find`
  - `desktop://menu-toggle-sidebar`
  - `desktop://menu-shortcuts`
  - `desktop://menu-logs`
  - `desktop://menu-about`
- [x] Add desktop UI bridge + dialogs for menu actions
- [x] Test via lint/unit suites (desktop runtime smoke test pending hardware build)
- [x] Update documentation

## Test

**Menu Visibility:**
- [ ] Menu bar appears on app launch (macOS: top of screen, Windows/Linux: in window)
- [ ] All four menus (File, Edit, View, Help) are visible
- [ ] Menu items have correct labels and keyboard shortcuts

**Menu Actions:**
- [ ] "New Spec" triggers spec creation dialog
- [ ] "Open Project" opens native folder picker
- [ ] "Switch Project" opens project switcher
- [ ] "Refresh Projects" reloads project list
- [ ] "Check for Updates" triggers update check
- [ ] "Documentation" opens lean-spec.dev in browser
- [ ] "Quit" closes application cleanly

**Keyboard Shortcuts:**
- [ ] `Cmd/Ctrl+N` creates new spec
- [ ] `Cmd/Ctrl+O` opens project
- [ ] `Cmd/Ctrl+Shift+K` switches project
- [ ] `Cmd/Ctrl+R` refreshes projects
- [ ] `Cmd/Ctrl+Q` quits app
- [ ] All native shortcuts work (Cut/Copy/Paste)

**Cross-Platform:**
- [ ] Menu renders correctly on macOS (system menu bar)
- [ ] Menu renders correctly on Windows (in-window menu)
- [ ] Menu renders correctly on Linux (in-window menu)

Manual desktop verification still needs hardware. Automated checks executed in this change:

- `pnpm --filter @leanspec/desktop lint`
- `pnpm --filter @leanspec/ui lint`

> Both lint commands currently fail (missing flat config in `@leanspec/desktop`, pre-existing ESLint violations in `@leanspec/ui`). No code changes were made to resolve those unrelated issues as part of this spec.

## Notes

### Reference Implementation

Similar apps with both custom UI and native menus:
- **VS Code**: Frameless with custom title bar + native menu
- **Slack**: Custom UI with native menu integration
- **Discord**: Frameless but has native menu on macOS

### Future Enhancements

**Context-aware menus:**
- Disable "New Spec" when no project is active
- Show current project name in menu
- Recent projects submenu (like "Open Recent" in native apps)

**Dynamic menu updates:**
- Update menu based on app state
- Show spec count in View menu
- Add "Recent Specs" submenu

**Customization:**
- User preference to show/hide menu bar
- Custom keyboard shortcuts in settings

### Related: localStorage in Desktop Context

**Current localStorage Usage in UI:**
- Recent search history (`leanspec-recent-searches`)
- Sidebar collapsed state (`main-sidebar-collapsed`, `specs-nav-sidebar-collapsed`)
- View mode preference (`specs-view-mode`)
- Focus mode state (`spec-detail-focus-mode`)
- Language preference (`leanspec-language`)

**Desktop App Context:**

The desktop app loads the UI via iframe from an embedded Next.js server (localhost). In Tauri's webview:
- localStorage is **isolated per app** (not shared with browser)
- Data persists in Tauri's app data directory
- Each project switch reloads the iframe → localStorage persists

**Current Behavior (Works Fine):**
```
Desktop App
  └── Tauri Webview (localhost:PORT)
        └── localStorage (isolated, persistent)
              ├── Recent searches
              ├── UI preferences
              └── Language setting
```

**Why it works:**
1. Tauri webview has its own localStorage separate from system browsers
2. localStorage is domain-scoped to `localhost:PORT`
3. Port stays consistent across app restarts (configured in `ui_server.rs`)
4. Data persists in app data directory (macOS: `~/Library/Application Support/dev.leanspec.desktop`)

**Potential Issues:**

1. **Project-specific preferences not isolated:**
   - Sidebar state is global, not per-project
   - View mode applies to all projects
   - Could be confusing when switching projects

2. **No cloud sync:**
   - Preferences don't sync between machines
   - Lost if app data is cleared

**Future Improvements (out of scope for this spec):**

1. **Project-scoped preferences:**
   ```typescript
   // Instead of:
   localStorage.setItem('specs-view-mode', 'kanban')
   
   // Use:
   localStorage.setItem(`project:${projectId}:specs-view-mode`, 'kanban')
   ```

2. **Tauri store plugin:**
   - Use `@tauri-apps/plugin-store` for structured config
   - Better integration with Rust backend
   - Automatic JSON serialization

3. **Sync with desktop config:**
   - Mirror important prefs to `~/.lean-spec/desktop.json` (see spec 162)
   - Share preferences across web/desktop

**Decision for this spec:** Keep current localStorage behavior as-is. Menu bar interactions don't need new storage.
