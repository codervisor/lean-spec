---
status: complete
created: '2025-12-10'
tags:
  - desktop
  - config
  - migration
  - breaking-change
  - consistency
priority: high
created_at: '2025-12-10T08:49:08.237Z'
depends_on:
  - 147-json-config-format
  - 148-leanspec-desktop-app
updated_at: '2025-12-18T09:56:48.390Z'
completed_at: '2025-12-18T09:56:48.390Z'
completed: '2025-12-18'
transitions:
  - status: complete
    at: '2025-12-18T09:56:48.390Z'
---

# Migrate Desktop Config from YAML to JSON

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-12-10 · **Tags**: desktop, config, migration, breaking-change, consistency

## Overview

Complete the config format standardization by migrating `desktop.yaml` to `desktop.json` in the Tauri app, aligning with the UI's `projects.json` format (spec 147).

### Current State

**Inconsistent config formats:**
- ✅ `~/.lean-spec/projects.json` - UI project registry (JSON, spec 147)
- ❌ `~/.lean-spec/desktop.yaml` - Desktop preferences (YAML)

**Why JSON everywhere?**
- Native Rust/JavaScript support (no `serde_yaml` dependency)
- Deterministic serialization (no line wrapping issues)
- Consistent with UI package (spec 147)
- Simpler parsing, fewer edge cases

## Design

### File Changes

```diff
- ~/.lean-spec/desktop.yaml
+ ~/.lean-spec/desktop.json
```

### Current Config Structure

```yaml
# ~/.lean-spec/desktop.yaml (current)
window:
  width: 1400
  height: 900
  maximized: false
behavior:
  startMinimized: false
  minimizeToTray: true
  launchAtLogin: false
shortcuts:
  toggleWindow: "CommandOrControl+Shift+L"
  quickSwitcher: "CommandOrControl+Shift+K"
  newSpec: "CommandOrControl+Shift+N"
updates:
  autoCheck: true
  autoInstall: false
  channel: "stable"
appearance:
  theme: "system"
activeProjectId: "abc123def456"
```

### New Config Structure (JSON)

```json
{
  "window": {
    "width": 1400,
    "height": 900,
    "maximized": false
  },
  "behavior": {
    "startMinimized": false,
    "minimizeToTray": true,
    "launchAtLogin": false
  },
  "shortcuts": {
    "toggleWindow": "CommandOrControl+Shift+L",
    "quickSwitcher": "CommandOrControl+Shift+K",
    "newSpec": "CommandOrControl+Shift+N"
  },
  "updates": {
    "autoCheck": true,
    "autoInstall": false,
    "channel": "stable"
  },
  "appearance": {
    "theme": "system"
  },
  "activeProjectId": "abc123def456"
}
```

### Implementation Changes

**1. Update `config.rs`**

```rust
const CONFIG_FILE: &str = "desktop.json";  // was: "desktop.yaml"
const LEGACY_CONFIG_FILE: &str = "desktop.yaml";

impl DesktopConfig {
    fn load_or_default() -> Self {
        let path = config_file_path();
        
        // Try JSON first
        match fs::read_to_string(&path) {
            Ok(raw) => match serde_json::from_str::<DesktopConfig>(&raw) {
                Ok(mut config) => {
                    normalize_config(&mut config);
                    return config;
                }
                Err(error) => {
                    eprintln!("Failed to parse desktop config: {error}");
                }
            },
            Err(_) => {}
        }
        
        // Migration: Try legacy YAML
        if let Some(legacy) = load_legacy_yaml() {
            let config = Self::from_yaml(legacy);
            config.persist();  // Save as JSON
            backup_legacy_yaml();
            return config;
        }
        
        Self::default()
    }

    fn persist(&self) {
        if let Some(dir) = config_dir() {
            if fs::create_dir_all(&dir).is_ok() {
                let file = dir.join(CONFIG_FILE);
                if let Ok(serialized) = serde_json::to_string_pretty(self) {
                    if let Err(error) = fs::write(file, serialized) {
                        eprintln!("Unable to write desktop config: {error}");
                    }
                }
            }
        }
    }
}

fn load_legacy_yaml() -> Option<String> {
    let path = config_dir()?.join(LEGACY_CONFIG_FILE);
    fs::read_to_string(path).ok()
}

fn backup_legacy_yaml() {
    if let Some(dir) = config_dir() {
        let legacy = dir.join(LEGACY_CONFIG_FILE);
        let backup = dir.join("desktop.yaml.bak");
        let _ = fs::rename(legacy, backup);
    }
}
```

**2. Remove `serde_yaml` dependency**

```diff
# packages/desktop/src-tauri/Cargo.toml
[dependencies]
- serde_yaml = "0.9"
+ # serde_yaml removed - using JSON now
```

**3. Update documentation**

- `packages/desktop/README.md`
- `specs/148-leanspec-desktop-app/README.md`
- Any agent instructions referencing `desktop.yaml`

### Migration Strategy

**Auto-migration on first launch:**
1. App starts → looks for `desktop.json`
2. Not found → checks for `desktop.yaml`
3. If YAML exists → parse, convert, save as JSON
4. Rename `desktop.yaml` → `desktop.yaml.bak`
5. Continue with JSON config

**Manual migration (if needed):**
```bash
# If users want to migrate manually
node -e "
  const fs = require('fs');
  const yaml = require('js-yaml');
  const old = yaml.load(fs.readFileSync('desktop.yaml', 'utf8'));
  fs.writeFileSync('desktop.json', JSON.stringify(old, null, 2));
  fs.renameSync('desktop.yaml', 'desktop.yaml.bak');
"
```

## Plan

- [x] Create spec
- [ ] Update `config.rs`:
  - Change `CONFIG_FILE` to `"desktop.json"`
  - Replace `serde_yaml` with `serde_json`
  - Add legacy YAML migration logic
  - Add backup of old YAML file
- [ ] Remove `serde_yaml` from `Cargo.toml`
- [ ] Test migration:
  - Fresh install creates `desktop.json`
  - Existing `desktop.yaml` migrates to `desktop.json`
  - Legacy file backed up as `desktop.yaml.bak`
- [ ] Update documentation:
  - `packages/desktop/README.md`
  - `specs/148-leanspec-desktop-app/README.md`
  - `specs/161-desktop-native-menu-bar/README.md`
- [ ] Update AGENTS.md if it references desktop.yaml

## Test

**Fresh Install:**
- [ ] New user launches desktop app
- [ ] Config created at `~/.lean-spec/desktop.json`
- [ ] No YAML files created
- [ ] Default config values work

**Migration Path:**
- [ ] User has existing `desktop.yaml`
- [ ] Launch desktop app
- [ ] Config migrated to `desktop.json`
- [ ] Legacy file renamed to `desktop.yaml.bak`
- [ ] All settings preserved (window size, shortcuts, theme, etc.)
- [ ] Active project ID preserved

**Config Operations:**
- [ ] Window state saves to JSON
- [ ] Shortcut changes persist
- [ ] Active project updates correctly
- [ ] Theme/appearance settings work
- [ ] JSON format is human-readable (2-space indent)

**Error Handling:**
- [ ] Corrupted JSON → falls back to defaults
- [ ] Invalid YAML during migration → falls back to defaults
- [ ] Missing config dir → creates on first write

**Cross-platform:**
- [ ] Works on macOS (`~/Library/Application Support/dev.leanspec.desktop`)
- [ ] Works on Windows (`%APPDATA%\dev.leanspec.desktop`)
- [ ] Works on Linux (`~/.local/share/dev.leanspec.desktop`)

## Notes

### Why This Matters

**Consistency:** All LeanSpec config files now use JSON:
- `~/.lean-spec/projects.json` (UI)
- `~/.lean-spec/desktop.json` (Desktop)
- `leanspec.json` (per-project config)

**Simplicity:** 
- No YAML parser needed in Rust backend
- `serde_json` is smaller and faster than `serde_yaml`
- Fewer dependencies = smaller binary

**Reliability:**
- JSON has no indentation ambiguity
- No line-wrapping issues (spec 147's motivation)
- Easier to debug/validate

### Breaking Change

This is a **minor breaking change** for existing desktop app users:
- **Impact**: Users with `desktop.yaml` will see it migrate to JSON
- **Mitigation**: Auto-migration on first launch + backup created
- **Severity**: Low - config is auto-managed, users rarely edit manually

### Dependency Cleanup

**Before:**
```toml
serde_yaml = "0.9"  # ~200KB compiled
```

**After:**
```toml
# serde_json already included via Tauri
```

Binary size reduction: ~100-200KB

### Related Work

- **Spec 147**: UI config migration (YAML → JSON) ✅ Complete
- **Spec 148**: Desktop app initial implementation ✅ Complete
- **Spec 161**: Native menu bar (references config, needs update)

### Future: Unified Config System

After this change, consider:
- Shared config schema between desktop and UI
- Sync preferences via cloud (optional)
- Config versioning for future migrations
