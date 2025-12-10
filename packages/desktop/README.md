# LeanSpec Desktop

Native Tauri wrapper around `@leanspec/ui` for local multi-project management. The desktop shell provides a frameless window, system tray integration, native notifications, and global shortcuts while reusing the existing Next.js UI.

## Local development

```bash
pnpm install
pnpm dev:desktop
```

The `tauri dev` pipeline launches Vite for the desktop chrome and automatically spawns a `@leanspec/ui` dev server on a dynamic port. Use `CommandOrControl+Shift+L` to toggle the window and `CommandOrControl+Shift+K` to open the project switcher.

## Packaging

```bash
pnpm build:desktop
```

The packaging workflow builds the Next.js UI (`pnpm --filter @leanspec/ui build`), copies the standalone output into `src-tauri/ui-standalone`, and then runs `tauri build` to produce platform installers. Ensure you have the required system dependencies installed for Tauri targets (Xcode CLT on macOS, Visual Studio Build Tools on Windows, and `libgtk` / `appindicator` stack on Linux).

## Configuration files

- `~/.lean-spec/desktop.yaml` — Desktop window + behavior preferences
- `~/.lean-spec/projects.json` — Shared project registry (auto-updated by UI + desktop)

## Features

- Frameless shell with custom title bar and window controls
- Project switcher connected to the global LeanSpec registry
- Native folder picker + validation for onboarding new projects
- Background Next.js server lifecycle managed via Rust
- System tray with recent projects and quick actions
- Global shortcuts for toggling the window, switching projects, and launching quick actions
- OS notifications on project changes and background tasks
- Auto-update plumbing via the Tauri updater (configurable release channels)
