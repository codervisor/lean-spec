# LeanSpec Desktop

Tauri v2 shell around `@leanspec/ui` for local multi-project management. The desktop chrome adds a frameless window, menu bar, tray, notifications, and global shortcuts while reusing the existing Next.js UI (served locally by the Rust host).

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

`tauri build --bundles app` relies on `src-tauri/tauri.conf.json` hooks to:

1) build `@leanspec/ui` and sync its standalone output into `src-tauri/ui-standalone`
2) build the desktop Vite shell to `dist/`
3) produce platform bundles (e.g., `.app` on macOS) in `src-tauri/target/release/bundle`

System requirements: Xcode CLT on macOS, Visual Studio Build Tools on Windows, and `libgtk`, `ayatana-appindicator`, and WebKit 4.1 stack on Linux. The bundle includes the standalone UI, so Node.js is not required on end-user machines.

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
