# LeanSpec Desktop

> **Native SPA Mode** - Lightweight Tauri v2 app with Rust backend and React frontend

## Overview

LeanSpec Desktop provides a native application for local multi-project management. Built with Tauri v2, it features a frameless window, menu bar, system tray, notifications, and global shortcuts.

### Architecture

**Pure Native (Spec 169 - December 2025)**:
- 🦀 **Rust backend** - All spec operations in native code
- ⚛️ **React SPA** - Client-side routing with React Router
- 📦 **26 MB bundle** - 83% smaller than previous version
- ⚡ **<1s startup** - No Node.js server to spawn
- 💾 **50-100 MB RAM** - Native memory efficiency

**Key Benefits**:
- No Node.js runtime required
- Faster startup and operations
- Smaller download size
- Better battery life
- True native feel

📚 **Documentation**:
- [Architecture Overview](./ARCHITECTURE.md) - System design and components
- [Migration Guide](./MIGRATION.md) - For contributors working with the new architecture

## Prerequisites

**Linux**: Install system dependencies before building:

```bash
sudo apt-get update && sudo apt-get install -y \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev \
  webkit2gtk-4.1-dev
```

**macOS**: Xcode Command Line Tools

```bash
xcode-select --install
```

**Windows**: Visual Studio Build Tools with C++ desktop development workload

## Local development

```bash
pnpm install
pnpm dev:desktop
```

- `tauri dev` targets the Vite dev server on port `1420`
- The React SPA is served directly (no Node.js server needed)
- Hot reload works for both frontend and backend changes
- Shortcuts: `CommandOrControl+Shift+L` toggles window; `CommandOrControl+Shift+M` opens project manager

## Packaging

```bash
pnpm build:desktop
```

`tauri build` will:

1. Build the React SPA frontend with Vite to `dist/`
2. Compile the Rust backend in release mode
3. Produce platform-specific bundles in `src-tauri/target/release/bundle/`:
   - macOS: `.dmg` installer in `bundle/macos/`
   - Linux: `.deb` package in `bundle/deb/`
   - Windows: `.nsis` installer in `bundle/nsis/`

**Bundle Size**: ~26 MB (including all assets and runtime)

### End-User Requirements

✅ **No Node.js required!** The app is now fully self-contained.

Users only need:
- **macOS**: macOS 11.0+ (Big Sur or later)
- **Linux**: GTK 3.24+ (included in most modern distros)
- **Windows**: Windows 10/11 with WebView2 (auto-installed)

See Prerequisites section above for build-time system dependencies.

## Capabilities and permissions

The Tauri v2 permission model is defined in `src-tauri/capabilities/desktop-main.json`. It grants access to core window controls plus `log`, `dialog`, `notification`, `opener`, `global-shortcut`, `window-state`, and `updater` plugins. Adjust this file (or add new capability files) instead of editing the `tauri.conf.json` allowlist fields.

## Configuration files

- `~/.lean-spec/desktop.json` — Desktop app configuration (window size, shortcuts, theme, etc.)
- `~/.lean-spec/projects.json` — Project registry

These config files are automatically created on first launch and updated as you add/remove projects.

## Features

- ✨ **Native Performance** - Rust backend, 90% faster than Node.js
- 🎨 **Modern UI** - React SPA with dark theme
- 🖼️ **Frameless Window** - Custom title bar and window controls
- 🍎 **Native Menus** - OS menu bar with keyboard shortcuts
- 📂 **Project Manager** - Switch between multiple LeanSpec projects
- 🔍 **Full-Text Search** - Fast spec searching across all projects
- 📊 **Analytics Dashboard** - Project stats and velocity tracking
- 🔗 **Dependency Graphs** - Visualize spec relationships
- 🔔 **Notifications** - Desktop notifications for updates
- 🌐 **System Tray** - Quick access from menu bar
- ⌨️ **Global Shortcuts** - Control app from anywhere
- 🔄 **Auto-Updates** - Built-in update mechanism

### Tauri Commands

The app exposes rich IPC commands for:
- Project management (add, remove, switch, rename)
- Spec operations (list, read, search, validate)
- Dependency analysis and graph generation
- Statistics and analytics
- File system operations

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete API documentation.
