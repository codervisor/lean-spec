---
status: in-progress
created: 2026-01-14
priority: medium
tags:
- architecture
- refactoring
- simplification
- breaking-change
depends_on:
- 151-multi-project-architecture-refactoring
created_at: 2026-01-14T09:48:44.690848Z
updated_at: 2026-01-14T10:07:32.136856Z
transitions:
- status: in-progress
  at: 2026-01-14T10:07:32.136856Z
---

# Remove Single-Project Mode and SPECS_MODE Environment Variable

## Overview

Remove the legacy single-project mode (`SPECS_MODE=filesystem`) and treat all installations as multi-project mode. This eliminates the `/projects/default` pattern and simplifies the codebase significantly.

### Current State

LeanSpec currently supports two modes:
- **Single-project mode** (`SPECS_MODE=filesystem` or default): One local specs directory, accessed via `/projects/default/*`
- **Multi-project mode** (`SPECS_MODE=multi-project`): Multiple tracked projects with explicit IDs

Spec 151 unified the architecture by treating single-project as "multi-project with one project called 'default'", but this still requires mode branching and the awkward `/projects/default` URL pattern.

### Problem

1. **Confusing URLs**: `/projects/default` is unintuitive for users who only have one project
2. **Unnecessary complexity**: Mode checks still exist throughout the codebase despite the unified architecture
3. **Cognitive overhead**: Developers must understand two conceptual models
4. **User confusion**: The distinction between single-project and multi-project is an implementation detail that shouldn't leak to users

### Proposal

**Treat every installation as multi-project mode by default:**
- First-time users: Automatically create a project when running `lean-spec init`
- Existing single-project users: Auto-migrate their specs directory to a real project on upgrade
- Remove `SPECS_MODE` environment variable entirely
- Use meaningful project IDs (slugified directory name) instead of 'default'

### Benefits

1. **Simpler mental model**: Everything is a project, no special cases
2. **Better URLs**: `/projects/my-app/specs` instead of `/projects/default/specs`
3. **Less code**: Remove all mode branching logic
4. **Future-proof**: Multi-project is the natural evolution (desktop app, team dashboards)
5. **Better UX**: Users can add more projects later without conceptual shift

## Design

### Migration Strategy

#### Phase 1: Auto-migration on Upgrade

When a user upgrades to the new version:

```bash
# Detection: Check if SPECS_DIR exists but no projects are registered
if [ -d "specs" ] && [ ! -f ".leanspec/projects.json" ]; then
  # Auto-create project from current directory
  PROJECT_NAME=$(basename "$PWD")
  lean-spec project add . --name "$PROJECT_NAME" --auto-migrate
fi
```

**Migration creates:**
```json
// .leanspec/projects.json
{
  "projects": [
    {
      "id": "my-app-specs",  // slug of directory name
      "displayName": "My App",
      "specsDir": "./specs",
      "createdAt": "2026-01-14T10:00:00Z",
      "lastAccessed": "2026-01-14T10:00:00Z"
    }
  ]
}
```

#### Phase 2: Update Init Command

```bash
# Old behavior
lean-spec init
# → Creates specs/ directory, uses single-project mode

# New behavior
lean-spec init
# → Prompts: "Project name (detected: my-app): "
# → Creates specs/ directory
# → Registers project in .leanspec/projects.json
```

#### Phase 3: Remove Legacy Code

**Files to remove/simplify:**
- Legacy default-project constants (remove any remaining `DEFAULT_PROJECT_ID` usage)
- All `isDefaultProject()` checks
- All `SPECS_MODE` environment variable checks
- All mode branching logic

**API routes to simplify:**
- `/api/projects` - Remove mode check, always return project registry
- `/api/projects/[id]/*` - Remove special handling for 'default' ID

**Frontend changes:**
- Remove conditional rendering based on mode
- Always show project switcher (even for single project)
- Update routing to never use 'default' as fallback

### URL Structure (After)

```
# Before (awkward)
http://localhost:3000/projects/default/specs
http://localhost:3000/projects/default/specs/045-feature

# After (intuitive)
http://localhost:3000/projects/my-app-specs/specs
http://localhost:3000/projects/my-app-specs/specs/045-feature

# Single project users: auto-redirected to their project
http://localhost:3000/ → /projects/my-app-specs/specs
```

### Backward Compatibility

**CLI environment variables:**
```bash
# Deprecated (warning shown, but still works during grace period)
SPECS_MODE=filesystem lean-spec ui
# → Warning: SPECS_MODE is deprecated. All projects use multi-project mode.
# → Automatically migrates to multi-project

# Deprecated
SPECS_DIR=./custom-specs lean-spec ui
# → Warning: SPECS_DIR is deprecated. Use .leanspec/projects.json instead.
# → Auto-creates project with custom specs directory
```

**Config files:**
```yaml
# Old .leanspec/config.yaml (deprecated)
specsDir: ./specs

# New .leanspec/projects.json (auto-generated)
{
  "projects": [{
    "id": "my-project",
    "specsDir": "./specs"
  }]
}
```

## Plan

### Phase 1: Auto-Migration Logic
- [x] Add migration detection logic to CLI (auto-registers projects when specs exist and registry is empty)
- [x] Create project from SPECS_DIR on first run (CLI bootstrap writes registry entry)
- [x] Generate meaningful project ID (slug of directory name)
- [x] Write migration to `.leanspec/projects.json`
- [ ] Add migration test cases

### Phase 2: Update Init Command
- [x] Prompt for project name during init
- [x] Register project in `.leanspec/projects.json`
- [ ] Update init tests
- [ ] Update documentation

### Phase 3: Remove Legacy Mode Code
- [x] Remove `SPECS_MODE` checks from CLI UI launcher; always run multi-project
- [x] Remove `SPECS_MODE` checks from UI server
- [x] Remove `isDefaultProject()` utility
- [x] Remove `DEFAULT_PROJECT_ID` constant
- [ ] Update API routes to remove mode branching
- [x] Remove fallback to 'default' in frontend

### Phase 4: Update Desktop & Web UI
- [ ] Remove mode conditional rendering
- [ ] Always show project switcher
- [x] Update root redirect logic
- [ ] Test single-project user experience

### Phase 5: Documentation & Communication
- [ ] Add migration guide to docs
- [ ] Update all tutorials to reflect new model
- [ ] Add release notes with migration instructions
- [ ] Update AGENTS.md

### Phase 6: Deprecation Period
- [ ] Show deprecation warnings for SPECS_MODE
- [ ] Show deprecation warnings for SPECS_DIR
- [ ] Provide grace period (1-2 releases)
- [ ] Auto-migrate on first run

### Phase 7: Complete Removal
- [ ] Remove all deprecated code paths
- [ ] Remove environment variable support
- [ ] Final cleanup and simplification

### Test

- [ ] Fresh init creates project automatically
- [ ] Existing single-project users auto-migrate seamlessly
- [ ] Multi-project users unaffected by changes
- [ ] Desktop app works with new structure
- [ ] Web UI works with new structure
- [x] CLI commands work without SPECS_MODE (CLI no longer sets/reads SPECS_MODE)
- [x] URLs are intuitive (no /projects/default)
- [ ] Migration guide is clear and tested

## Implementation Notes

- CLI now resolves project context and auto-registers a slugged project in the registry when specs exist but the registry is empty (covers single-project migration path).
- `lean-spec init` prompts for a project name (defaults to detected folder), writes config under project root, and registers the project.
- CLI UI command always runs in multi-project mode and drops `SPECS_MODE` usage; deprecated `SPECS_MODE`/`SPECS_DIR` envs emit warnings only.

## Notes

### Breaking Changes

**Major version bump required (v1.0.0)**

**What breaks:**
- `SPECS_MODE` environment variable no longer supported (after grace period)
- `SPECS_DIR` environment variable deprecated (auto-migrated)
- Direct `/projects/default/*` URLs (auto-redirected)

**What doesn't break:**
- Existing specs content (untouched)
- CLI commands (auto-migrate on first run)
- Desktop/Web UI (auto-migration built-in)

### User Communication

**Migration announcement:**
```
🎉 LeanSpec now treats everything as projects!

Your specs have been automatically migrated to a project.
No action needed - everything works the same.

What's new:
- Better URLs: /projects/my-app instead of /projects/default
- Easier to add more projects later
- Simplified configuration

Learn more: https://leanspec.dev/docs/migration/v1
```

### Alternative Considered: Keep Single-Project Mode

**Why we're not doing this:**
- Adds permanent complexity to maintain two modes
- Users inevitably need multi-project (work, side projects, examples)
- Desktop app benefits from consistent multi-project model
- The abstraction is already leaky (/projects/default proves this)

### Related Specs

- Spec 151: Multi-Project Architecture Deep Refactoring (made this possible)
- Spec 109: Local Multi-Project Switching (introduced multi-project mode)
- Spec 148: LeanSpec Desktop App (benefits from simplified model)