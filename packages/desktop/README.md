# LeanSpec Desktop

Tauri v2 shell around `@leanspec/ui` for local multi-project management. The desktop chrome adds a frameless window, menu bar, tray, notifications, and global shortcuts while reusing the existing Next.js UI (served locally by the Rust host).

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

- `tauri dev` now targets the Vite dev server on port `1420`.
- The Rust host spawns the `@leanspec/ui` dev server on a dynamic port (or uses `LEAN_SPEC_UI_URL` when set).
- Shortcuts: `CommandOrControl+Shift+L` toggles the window; `CommandOrControl+Shift+K` opens the project switcher.

## Packaging

```bash
pnpm build:desktop
```

`tauri build` relies on `src-tauri/tauri.conf.json` hooks to:

1) build `@leanspec/ui` and sync its standalone output into `src-tauri/ui-standalone`
2) build the desktop Vite shell to `dist/`
3) produce platform-specific bundles in `src-tauri/target/release/bundle`:
   - macOS: `.app` bundle in `bundle/macos/`
   - Linux: `.deb`, `.rpm`, and `.AppImage` in `bundle/deb/`, `bundle/rpm/`, `bundle/appimage/`
   - Windows: `.msi` installer in `bundle/msi/`

**IMPORTANT**: The bundle includes the standalone Next.js UI, which **requires Node.js >= 20 on the end-user machine**. 

### End-User Requirements

Users installing LeanSpec Desktop must have Node.js installed:

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install nodejs

# Fedora/RHEL
sudo dnf install nodejs

# Arch
sudo pacman -S nodejs
```

**macOS:**
```bash
brew install node
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/)

The `.deb` package lists `nodejs (>= 20)` as a dependency, so it will be installed automatically on Debian/Ubuntu systems when using `apt install`.

See Prerequisites section above for build-time system dependencies.

## Capabilities and permissions

The Tauri v2 permission model is defined in `src-tauri/capabilities/desktop-main.json`. It grants access to core window controls plus `log`, `dialog`, `notification`, `opener`, `global-shortcut`, `window-state`, and `updater` plugins. Adjust this file (or add new capability files) instead of editing the `tauri.conf.json` allowlist fields.

## Configuration files

- `~/.lean-spec/desktop.yaml` — Desktop window + behavior preferences
- `~/.lean-spec/projects.json` — Shared project registry (auto-updated by UI + desktop)

## Features

- Frameless shell with custom title bar and window controls
- Native OS menu bar (File/Edit/View/Help) with accelerators and command routing
- Project switcher connected to the global LeanSpec registry
- Native folder picker + validation for onboarding new projects
- Background Next.js server lifecycle managed via Rust
- System tray with recent projects and quick actions
- Global shortcuts for toggling the window, switching projects, and launching quick actions
- OS notifications on project changes and background tasks
- Auto-update plumbing via the Tauri updater (configurable release channels)
