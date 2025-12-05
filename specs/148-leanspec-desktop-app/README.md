---
status: planned
created: '2025-12-05'
tags:
  - desktop
  - tauri
  - ui
  - multi-project
  - dx
priority: high
created_at: '2025-12-05T04:48:36.682Z'
depends_on:
  - 087-cli-ui-command
  - 109-local-project-switching
updated_at: '2025-12-05T05:02:25.770Z'
---

# LeanSpec Desktop App for Multi-Project Management

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-12-05 · **Tags**: desktop, tauri, ui, multi-project, dx

## Overview

Native desktop application built on `@leanspec/ui` using Tauri for efficient local multi-project LeanSpec management.

**Problem Statement:**
The current web-based UI (`lean-spec ui`) requires:
- Manual server startup per session
- Port management when working with multiple projects
- Browser context switching disrupts workflow
- No system tray / background running
- Web app feels disconnected from local development

**Target Users:**
- Developers managing 3+ LeanSpec projects locally
- Teams preferring native app experience over browser tabs
- Consultants/freelancers juggling multiple client codebases

**What This Is NOT:**
- Web UI deployed to remote servers (spec 082 handles this)
- VS Code extension (spec 017 covers IDE integration)
- Mobile app (future consideration)

## Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    LeanSpec Desktop App                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Tauri Shell (Rust Backend)                │    │
│  │  • Window management                                │    │
│  │  • System tray                                      │    │
│  │  • Native file dialogs                              │    │
│  │  • OS notifications                                 │    │
│  │  • Auto-updates                                     │    │
│  │  • Global keyboard shortcuts                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        @leanspec/ui (Next.js Frontend)              │    │
│  │  • Existing React components                        │    │
│  │  • Multi-project switching (spec 109)               │    │
│  │  • Spec viewing/editing                             │    │
│  │  • Stats dashboard                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         @leanspec/core (Spec Operations)            │    │
│  │  • Filesystem reading                               │    │
│  │  • Spec parsing                                     │    │
│  │  • Search & filtering                               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Why Tauri Over Electron

| Aspect | Tauri | Electron |
|--------|-------|----------|
| Bundle size | ~10-20 MB | ~150-200 MB |
| Memory usage | ~50-100 MB | ~300-500 MB |
| Startup time | <1s | 2-5s |
| Language | Rust backend | Node.js backend |
| Security | Sandboxed by default | Requires careful config |
| Web framework | Any (Next.js works) | Any |

**Decision: Tauri** - Aligns with LeanSpec's lightweight philosophy.

### Package Structure

```
packages/
├── desktop/                    # New Tauri desktop app
│   ├── package.json
│   ├── src-tauri/             # Rust backend
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── main.rs        # Entry point
│   │   │   ├── tray.rs        # System tray
│   │   │   ├── menu.rs        # Native menus
│   │   │   ├── shortcuts.rs   # Global hotkeys
│   │   │   ├── projects.rs    # Project management
│   │   │   └── updater.rs     # Auto-update
│   │   └── tauri.conf.json    # Tauri config
│   └── src/                   # Frontend (imports @leanspec/ui)
│       └── App.tsx            # Desktop-specific wrapper
├── ui/                        # Existing web UI package
└── core/                      # Existing core package
```

### Desktop-Specific Features

**1. System Tray Integration**
```
┌────────────────────────┐
│ 📋 LeanSpec            │
├────────────────────────┤
│ Recent Projects        │
│   → lean-spec          │
│   → my-saas-app        │
│   → client-project     │
├────────────────────────┤
│ Quick Add Project...   │
│ Open Dashboard         │
├────────────────────────┤
│ Preferences...         │
│ Check for Updates      │
│ Quit LeanSpec          │
└────────────────────────┘
```

**2. Global Keyboard Shortcuts**
- `Cmd/Ctrl+Shift+L` → Open/focus LeanSpec window
- `Cmd/Ctrl+Shift+K` → Quick project switcher (global)
- `Cmd/Ctrl+Shift+N` → New spec (in current project)

**3. Native File Dialogs**
- "Open Project" uses native folder picker
- Export specs uses native save dialog
- Drag & drop folders to add projects

**4. OS Notifications**
- Spec status changes (when watching)
- Build/validation errors
- Update available

**5. Auto-Update**
- Background update checks
- One-click update installation
- Rollback capability

### UI Modifications for Desktop

The desktop app wraps `@leanspec/ui` with minimal changes:

**Desktop-Specific Components:**
```typescript
// Desktop title bar with native controls
<TitleBar>
  <ProjectSwitcher />  {/* From @leanspec/ui */}
  <WindowControls />   {/* Native minimize/maximize/close */}
</TitleBar>

// Desktop-aware layout
<DesktopLayout>
  <Sidebar />          {/* From @leanspec/ui */}
  <MainContent />      {/* From @leanspec/ui */}
</DesktopLayout>
```

**Frameless Window with Custom Title Bar:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 LeanSpec │ lean-spec ▼ │                    [─] [□] [×] │
├─────────────────────────────────────────────────────────────┤
│  ┌────────┐                                                 │
│  │🏠 Home │  Dashboard content...                           │
│  │📋 Specs│                                                 │
│  │📊 Stats│                                                 │
│  └────────┘                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Project Discovery & Management

**Startup Flow:**
1. Load saved projects from `~/.lean-spec/projects.yaml` (reuse spec 109 format)
2. Validate project paths still exist
3. Show dashboard with recent projects
4. Background scan for new projects (optional)

**Add Project Methods:**
1. Menu → File → Open Project (native dialog)
2. Drag & drop folder onto app
3. System tray → Quick Add
4. CLI: `leanspec-desktop --add /path/to/project`

### Configuration

**Desktop-Specific Config (~/.lean-spec/desktop.yaml):**
```yaml
window:
  width: 1400
  height: 900
  x: 100
  y: 100
  maximized: false

behavior:
  startMinimized: false
  minimizeToTray: true
  launchAtLogin: false
  
shortcuts:
  global:
    toggleWindow: "CommandOrControl+Shift+L"
    quickSwitcher: "CommandOrControl+Shift+K"
    newSpec: "CommandOrControl+Shift+N"
  
updates:
  autoCheck: true
  autoInstall: false
  channel: "stable"  # or "beta"

appearance:
  theme: "system"  # "light", "dark", or "system"
```

### Distribution

**Build Targets:**
- macOS: `.dmg` (Universal binary: Intel + Apple Silicon)
- Windows: `.msi` installer + portable `.exe`
- Linux: `.AppImage`, `.deb`, `.rpm`

**Distribution Channels:**
1. **GitHub Releases** - Primary distribution
2. **Homebrew** (macOS): `brew install leanspec`
3. **Winget** (Windows): `winget install leanspec`
4. **AUR** (Arch Linux): `yay -S leanspec`

**Code Signing:**
- macOS: Apple Developer certificate for notarization
- Windows: Code signing certificate for SmartScreen

## Plan

### Phase 1: Foundation (Week 1)

**Day 1-2: Project Setup**
- [ ] Create `packages/desktop/` directory structure
- [ ] Initialize Tauri project with Next.js frontend
- [ ] Configure Tauri to load `@leanspec/ui` components
- [ ] Set up development workflow (hot reload)
- [ ] Add to pnpm workspace

**Day 3-4: Basic Window**
- [ ] Implement frameless window with custom title bar
- [ ] Add native window controls (minimize/maximize/close)
- [ ] Import existing sidebar and main content from `@leanspec/ui`
- [ ] Verify multi-project switching works
- [ ] Test window state persistence

**Day 5: Project Management**
- [ ] Integrate with `~/.lean-spec/projects.yaml`
- [ ] Implement native "Open Project" dialog
- [ ] Add drag & drop folder support
- [ ] Validate project paths on startup

### Phase 2: Desktop Features (Week 2)

**Day 6-7: System Tray**
- [ ] Implement system tray icon
- [ ] Add recent projects menu
- [ ] Add quick actions (open, add project, quit)
- [ ] Handle minimize to tray
- [ ] Test tray behavior across platforms

**Day 8-9: Global Shortcuts**
- [ ] Register global keyboard shortcuts
- [ ] Implement window toggle shortcut
- [ ] Add quick project switcher shortcut
- [ ] Make shortcuts configurable
- [ ] Handle shortcut conflicts gracefully

**Day 10: Notifications**
- [ ] Implement native OS notifications
- [ ] Add notification preferences
- [ ] Test on all platforms

### Phase 3: Polish & Distribution (Week 3)

**Day 11-12: Auto-Update**
- [ ] Configure Tauri updater
- [ ] Set up update server (GitHub Releases)
- [ ] Implement update UI (check, download, install)
- [ ] Add update channel selection (stable/beta)
- [ ] Test update flow end-to-end

**Day 13-14: Build & Release**
- [ ] Configure build for macOS (Universal binary)
- [ ] Configure build for Windows (MSI + portable)
- [ ] Configure build for Linux (AppImage, deb, rpm)
- [ ] Set up code signing (macOS notarization, Windows)
- [ ] Create GitHub Actions release workflow
- [ ] Write installation documentation

### Phase 4: Launch (Week 4)

**Day 15-16: Testing**
- [ ] Cross-platform testing (macOS, Windows, Linux)
- [ ] Performance benchmarking (memory, startup)
- [ ] Accessibility testing
- [ ] Edge case handling

**Day 17: Documentation**
- [ ] Update main README with desktop app
- [ ] Create desktop-specific documentation
- [ ] Add to docs-site (new Desktop page)
- [ ] Record demo video

**Day 18: Release**
- [ ] Tag v0.4.0-desktop release
- [ ] Publish to GitHub Releases
- [ ] Submit to package managers (Homebrew, Winget)
- [ ] Announce on social/docs

## Test

### Functional Tests

**Window Management:**
- [ ] App launches and displays correctly
- [ ] Window resizes smoothly
- [ ] Window state persists across restarts
- [ ] Frameless title bar works correctly
- [ ] Native window controls function properly

**Project Management:**
- [ ] Existing projects load from config
- [ ] "Open Project" dialog works
- [ ] Drag & drop adds projects
- [ ] Invalid project paths handled gracefully
- [ ] Multi-project switching works (spec 109)

**System Tray:**
- [ ] Tray icon appears
- [ ] Recent projects shown in menu
- [ ] Click opens/focuses window
- [ ] Minimize to tray works
- [ ] Quit from tray works

**Global Shortcuts:**
- [ ] Shortcuts work when app not focused
- [ ] Shortcut conflicts handled
- [ ] Shortcuts configurable
- [ ] Shortcuts persist across restarts

**Auto-Update:**
- [ ] Update check works
- [ ] Download progress shown
- [ ] Update installs correctly
- [ ] Rollback available if needed

### Platform-Specific Tests

**macOS:**
- [ ] Works on Intel Macs
- [ ] Works on Apple Silicon
- [ ] Notarization passes
- [ ] Menu bar integration correct

**Windows:**
- [ ] Works on Windows 10
- [ ] Works on Windows 11
- [ ] SmartScreen doesn't block
- [ ] Installer works correctly

**Linux:**
- [ ] AppImage runs on major distros
- [ ] .deb installs on Ubuntu/Debian
- [ ] .rpm installs on Fedora/RHEL
- [ ] System tray works (various DEs)

### Performance Tests

- [ ] Startup time <2s cold, <1s warm
- [ ] Memory usage <150 MB idle
- [ ] Memory stable during extended use
- [ ] No performance regression from web UI

## Notes

### Design Decisions

**Why desktop app now?**
- Multi-project management is primary use case for local dev
- Web UI requires browser + server management overhead
- Native app provides better DX for power users
- System tray enables always-available quick access

**Why Tauri over Electron?**
- 10x smaller bundle (LeanSpec philosophy: lightweight)
- Lower memory footprint
- Faster startup
- Rust backend is more secure
- Still uses existing React/Next.js frontend

**Why not just improve web UI?**
- Web UI still valuable for remote/server deployment
- Desktop app addresses fundamentally different use case
- Can share 90%+ of UI code via `@leanspec/ui`
- Not either/or - both serve different purposes

**Scope boundaries:**
- Desktop = local multi-project management
- Web UI = remote server deployment, team dashboards
- VS Code = in-editor integration (spec 017)

### Alternatives Considered

**1. Electron**
- Pros: More mature, larger ecosystem
- Cons: Huge bundle size, high memory usage
- **Rejected**: Violates lightweight philosophy

**2. Neutralino.js**
- Pros: Very lightweight
- Cons: Less mature, fewer features
- **Rejected**: Missing auto-update, system tray features

**3. Flutter**
- Pros: True native UI
- Cons: Can't reuse existing React components
- **Rejected**: Would require rewriting entire UI

**4. Progressive Web App (PWA)**
- Pros: No native code needed
- Cons: Limited OS integration, no system tray
- **Rejected**: Doesn't solve the core problem

### Open Questions

- [ ] Should we support plugin system for desktop app?
- [ ] Should we add spec editing capabilities (beyond viewing)?
- [ ] Should we integrate with Git (show status, commits)?
- [ ] Should we add local AI integration (on-device)?
- [ ] Should we support themes beyond system/light/dark?

### Dependencies

**This spec depends on:**
- ✅ Spec 087: CLI UI command - foundation
- ✅ Spec 109: Multi-project switching - core feature

**This spec enables:**
- Future: Offline-first editing
- Future: Local AI integration
- Future: Git integration
