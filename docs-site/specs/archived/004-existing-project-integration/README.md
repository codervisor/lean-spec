---
status: complete
created: 2025-11-01
tags: [integration, init, migration]
priority: high
completed: 2025-11-01
---

# Existing Project Integration

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-01 · **Tags**: integration, init, migration

## Goal

Support `lean-spec init` on projects with existing `AGENTS.md` or system prompts without clobbering their content.

## Key Scenarios

1. **Merge Mode**: User has `AGENTS.md` → detect, offer to merge LeanSpec section ✅
2. **Backup Mode**: User chooses not to merge → backup existing, create new ✅
3. **Skip Mode**: User wants to keep their setup → just add .lean-spec config and specs/ ✅

## Acceptance Criteria

- [x] Detect existing `AGENTS.md`, `.cursorrules`, `.github/copilot-instructions.md`
- [x] Interactive prompt: merge, backup, or skip
- [x] If merge: append LeanSpec section with clear delimiter
- [x] If backup: rename to `AGENTS.md.backup`, create new
- [x] If skip: don't touch existing files, only add lean-spec structure

## Implementation

Added three helper functions in `src/commands.ts`:

1. `detectExistingSystemPrompts()` - Checks for common system prompt files
2. `handleExistingFiles()` - Implements merge/backup/skip logic
3. Updated `copyDirectory()` - Supports skipping specified files

Interactive flow in `initProject()`:
- Detects existing files before copying templates
- Prompts user with 3 options: merge, backup, or skip
- Handles each option appropriately
- Only copies non-conflicting files from template

## Non-Goals

- Auto-detecting project type from existing files (just handle conflicts) ✓
- Parsing/understanding existing AGENTS.md content (simple append) ✓
- Supporting every possible system prompt variant (start with common ones) ✓

## Testing

Basic test script created: `test-integration.sh`

Manual testing:
```bash
cd /tmp/lspec-test-existing
node /path/to/lean-spec init
# Choose merge/backup/skip and verify behavior
```

## Notes

Supported system prompt files:
- `AGENTS.md` (merge supported)
- `.cursorrules` (backup/skip only)
- `.github/copilot-instructions.md` (backup/skip only)

Future: Could extend merge support to other file types if needed.
