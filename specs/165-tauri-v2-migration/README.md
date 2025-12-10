---
status: in-progress
created: '2025-12-10'
tags:
  - desktop
  - tauri
  - migration
  - breaking-change
  - v2
  - bundling
priority: high
created_at: '2025-12-10T14:17:07.220Z'
depends_on:
  - 148-leanspec-desktop-app
updated_at: '2025-12-10T14:19:51.380Z'
transitions:
  - status: in-progress
    at: '2025-12-10T14:19:51.380Z'
---

# Migrate Desktop App from Tauri v1 to v2

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-10 · **Tags**: desktop, tauri, migration, breaking-change, v2, bundling

**Progress Update (2025-12-10)**: Phases 1-4 complete. All dependencies upgraded to v2, configuration migrated, and Rust/frontend code updated. Next: Fix remaining build errors and begin testing.

## Overview

Upgrade LeanSpec Desktop from Tauri 1.5 to Tauri 2.x to benefit from:

- **Better bundling**: Proper `.app` bundle creation on macOS (fixes current bundling issue)
- **Improved security**: Audited codebase with new permissions system
- **Better performance**: Optimized runtime
- **Modern plugin system**: More maintainable architecture
- **Mobile support**: Future-proofing for iOS/Android

**Current Issue**: Tauri 1.x `build:desktop` only creates raw executable, not proper macOS app bundle. Migration to v2 will fix this and improve distribution.

## Context

**Current Setup**:
- Tauri v1.5 with Next.js 16 standalone mode
- UI server spawns Node.js in production (`ui_server.rs`)
- Resources bundled but no proper app bundle created
- Requires Node.js on user's machine

**Key Constraint**: Must maintain Next.js integration as UI requires server-side API routes for spec operations.

## Design

### Migration Strategy

**Automated + Manual Approach**:
1. Use `tauri migrate` CLI for automatic config/code updates
2. Manual review and adjustment for:
   - Next.js-specific configurations
   - Custom resource handling (`ui-standalone`)
   - Rust code using deprecated APIs

### Critical Changes

#### 1. Configuration Migration

**v1 → v2 Config Changes**:
```yaml
# Major restructuring
- tauri.conf.json → tauri.conf.json (different schema)
- package.productName/version → top-level
- tauri → app
- tauri.allowlist → removed (use permissions system)
- tauri.bundle → top-level bundle
- tauri.systemTray → app.trayIcon
```

#### 2. Plugin System Migration

**APIs Moved to Plugins**:
- ✅ `tauri-plugin-log` - Already using from git (update to v2)
- ✅ `tauri-plugin-window-state` - Already using from git (update to v2)
- 🆕 `tauri-plugin-shell` - For external binaries (if needed)
- 🆕 `tauri-plugin-dialog` - For file dialogs (if needed)

**Not Needed**:
- ❌ Clipboard, notification, http, fs - Not used in desktop app

#### 3. Rust Code Changes

**Key Updates**:
```rust
// Window API
- Window → WebviewWindow
- WindowBuilder → WebviewWindowBuilder
- Manager::get_window → get_webview_window

// Menu API (currently using)
- tauri::Menu → tauri::menu::MenuBuilder
- tauri::MenuItem → tauri::menu::PredefinedMenuItem
- tauri::CustomMenuItem → tauri::menu::MenuItemBuilder
- tauri::Submenu → tauri::menu::SubmenuBuilder
- Builder::on_menu_event → App::on_menu_event

// Tray API (currently using)
- SystemTray → TrayIcon
- SystemTrayMenu → menu::Menu
- on_event → on_menu_event + on_tray_icon_event
```

#### 4. Permissions System

**Replace allowlist** with capability files:
```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "window:default",
    "shell:default"
  ]
}
```

### Next.js Considerations

**UI Server Integration**:
- Keep `ui_server.rs` logic (spawn Node.js server)
- Update API imports to v2
- Verify resource bundling still works
- Test `devPath` and `frontendDist` config

**Build Process**:
- Maintain `beforeBuildCommand` pattern
- Ensure `prepare:ui` script compatibility
- Verify standalone build still works

### Bundling Improvements

**Expected Outcomes**:
- ✅ Proper macOS `.app` bundle creation
- ✅ DMG installer generation (optional)
- ✅ Embedded resources in bundle
- ✅ Code signing preparation

## Plan

### Phase 1: Pre-Migration Preparation

- [x] Create migration branch: `feat/tauri-v2-migration`
- [x] Document current working state (take screenshots, test flows)
- [x] Backup current Cargo.lock and package-lock.json
- [x] Review [Tauri v2 migration guide](https://tauri.app/start/migrate/from-tauri-1/)

### Phase 2: Dependency Updates

- [x] Update `@tauri-apps/cli` to latest v2 in `packages/desktop/package.json`
- [x] Update `@tauri-apps/api` to latest v2 in `packages/desktop/package.json`
- [x] Update Rust `tauri` to v2 in `src-tauri/Cargo.toml`
- [x] Update `tauri-build` to v2 in `[build-dependencies]`
- [x] Update plugins:
  - [x] `tauri-plugin-log` to v2 (from npm registry instead of git)
  - [x] `tauri-plugin-window-state` to v2 (from npm registry instead of git)
  - [x] Added: `tauri-plugin-shell`, `tauri-plugin-dialog`, `tauri-plugin-opener`, `tauri-plugin-updater`, `tauri-plugin-global-shortcut`, `tauri-plugin-notification`

### Phase 3: Run Automated Migration

- [x] Run `pnpm tauri migrate` from `packages/desktop`
- [x] Review generated changes:
  - [x] `tauri.conf.json` schema updates (moved identifier, bundle, permissions)
  - [x] Rust code API changes (reviewed and updated)
  - [x] Capability files created in `src-tauri/capabilities/`
- [x] Commit automated changes separately for tracking

### Phase 4: Manual Code Updates

**Rust Code**:
- [x] Update `src-tauri/src/main.rs`:
  - [x] Replace `Window` with `WebviewWindow`
  - [x] Update imports
  - [x] Update menu event handler signature to `(AppHandle, MenuEvent)`
  - [x] Update window event handler signature to `(Window, WindowEvent)`
- [x] Update `src-tauri/src/menu.rs`:
  - [x] Migrate to `tauri::menu::MenuBuilder`
  - [x] Update PredefinedMenuItem to require text parameter (None)
  - [x] Update menu event handler to accept `(AppHandle, MenuEvent)`
  - [x] Add `emit_to_main` helper for event emission
- [x] Update `src-tauri/src/tray.rs`:
  - [x] Migrate `SystemTray` to `TrayIconBuilder`
  - [x] Split event handlers (menu vs tray icon events)
  - [x] Update to `emit()` instead of `emit_all()`
- [x] Update `src-tauri/src/ui_server.rs`:
  - [x] Add `Manager` trait import for `.path()` method
  - [x] Verify resource path resolution still works
- [x] Update `src-tauri/src/commands.rs`:
  - [x] Update updater API: `.check()` → `.check()?`
  - [x] Update event emission to use `emit()` instead of `emit_all()`
- [x] Update `src-tauri/src/shortcuts.rs`:
  - [x] Update to use `emit()` instead of `emit_all()`

**Frontend Code**:
- [x] Update imports from `@tauri-apps/api/tauri` to `@tauri-apps/api/core`
- [x] Update window API: `appWindow` → `WebviewWindow.getCurrent()`
- [x] Update shell.open → `tauri-plugin-opener` `revealItemInDir()`
- [x] Update `App.tsx`: Use `getDesktopVersion()` IPC instead of `getVersion()`
- [x] Update `lib/ipc.ts`: Switch to core invoke, add `getDesktopVersion()`
- [x] Update `TitleBar.tsx` & `WindowControls.tsx`: Use WebviewWindow API

### Phase 5: Configuration Fine-Tuning

- [ ] Review `tauri.conf.json` v2 schema:
  - [ ] Verify `identifier` moved to top-level
  - [ ] Set `mainBinaryName` to match `productName`
  - [ ] Update `bundle` configuration
  - [ ] Configure `bundle.macOS.dmg` if needed
  - [ ] Update resource paths if changed
- [ ] Update `beforeBuildCommand` and `beforeDevCommand` if needed
- [ ] Configure permissions in capability files:
  - [ ] Window permissions
  - [ ] Shell permissions (if using external binaries)
  - [ ] Custom command permissions

### Phase 6: Build Script Updates

- [ ] Update `package.json` scripts:
  - [ ] Ensure `build:desktop` works with v2
  - [ ] Test `dev:desktop` command
- [ ] Update `sync-ui-build.mjs` if resource handling changed
- [ ] Verify UI build integration still works

### Phase 7: Testing

**Development Mode**:
- [ ] `pnpm dev:desktop` launches successfully
- [ ] UI loads and connects to backend
- [ ] All menu items work
- [ ] System tray functions correctly
- [ ] Project switching works
- [ ] All Tauri commands execute

**Production Build**:
- [ ] `pnpm build:desktop` completes successfully
- [ ] Creates proper `.app` bundle in `target/release/bundle/macos/`
- [ ] Bundle includes `ui-standalone` resources
- [ ] Double-click `.app` launches successfully
- [ ] UI server spawns correctly
- [ ] All features work in bundled app
- [ ] Test on clean machine (or VM) without Node.js to verify embedding

### Phase 8: Documentation Updates

- [ ] Update `packages/desktop/README.md` with v2 info
- [ ] Update build instructions
- [ ] Document new capability system
- [ ] Update troubleshooting guide

### Phase 9: CI/CD Updates

- [ ] Update GitHub Actions workflow for Tauri v2
- [ ] Verify artifact generation
- [ ] Test distribution process

## Test

**Functionality Tests**:
- [ ] Desktop app launches in development mode
- [ ] Desktop app builds and bundles correctly
- [ ] `.app` bundle can be opened and runs
- [ ] UI loads from embedded Next.js server
- [ ] All menu commands work
- [ ] System tray icon and menu work
- [ ] Project switching functions correctly
- [ ] Window state persists (plugin works)
- [ ] Logs are captured (plugin works)

**Regression Tests**:
- [ ] All features from v1 still work
- [ ] No performance degradation
- [ ] Memory usage is acceptable
- [ ] Build times are reasonable

**Distribution Tests**:
- [ ] Bundle size is reasonable
- [ ] App can be moved to Applications folder
- [ ] Works on different macOS versions (11.0+)
- [ ] Code signing preparation works (for future)

## Notes

### Migration Resources

- [Official Tauri v2 Migration Guide](https://tauri.app/start/migrate/from-tauri-1/)
- [Tauri v2 Configuration Reference](https://tauri.app/reference/config/)
- [Tauri v2 Security/Permissions](https://tauri.app/security/)

### Known Challenges

1. **Next.js Server Integration**: Most Tauri apps are static, ours spawns Node.js
   - Verify resource embedding still works
   - Test server spawn in bundled app

2. **Resource Paths**: V2 changes how resources are resolved
   - May need to update `find_embedded_standalone_dir()` in `ui_server.rs`

3. **Menu/Tray API**: Complete API rewrite
   - More code changes needed
   - New event system

4. **Permissions**: New ACL system
   - Must define capabilities correctly
   - May need adjustment during testing

### Future Considerations

- **Mobile Support**: Tauri v2 enables mobile (iOS/Android)
  - Would require significant UI adaptations
  - Not in scope for this migration

- **Static UI Export**: Could eliminate Node.js dependency
  - Requires converting Next.js to static export
  - Loses server-side features (API routes)
  - Consider for future if Node.js dependency problematic

### Alternative: Embed Node.js

If Tauri v2 doesn't improve bundling enough, consider:
- Bundle Node.js binary with app
- Use `@vercel/pkg` or similar to create executable
- Fully self-contained distribution
