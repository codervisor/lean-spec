---
status: complete
created: '2025-11-03'
tags: [structure, migration, breaking-change, enhancement]
priority: high
---

# Flat Structure Migration

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-03

**Project**: lean-spec  
**Team**: Core Development

## Overview

Migrate the default folder structure from date-based grouping (`{date}/{seq}-{name}/`) to a **flat structure with global numbering** (`{seq}-{name}/`). This simplifies the spec organization for most projects while maintaining date-based grouping as an optional pattern for those who need it.

**Why now?**
- Current date-based folders add unnecessary complexity for small/medium projects
- Most users don't need date-based organization
- **Flat structure with global numbering is simpler** to navigate and reference
- Easier to reference specs by number alone (e.g., "spec 024" instead of "specs/20251103/024")
- Other patterns (custom grouping) already available via config

**Current structure**: `specs/20251103/024-flat-structure-migration/`  
**Target structure**: `specs/024-flat-structure-migration/`

**Key change**: Global unique sequence numbers (001, 002, 003...) across the entire project, not per-date folder.

## Design

### Configuration Changes

**Default config becomes:**
```json
{
  "structure": {
    "pattern": "flat",
    "prefix": "",  // No prefix by default - just global sequence numbers
    "sequenceDigits": 3,
    "defaultFile": "README.md"
  }
}
```

**Example folder structure:**
```
specs/
├── 001-typescript-cli-migration/
├── 002-template-system-redesign/
├── 024-flat-structure-migration/
├── 025-next-feature/
└── archived/
```

**Migration paths:**
1. **New projects** - Use flat structure by default
2. **Existing projects** - Keep current structure, provide migration guide
3. **Date grouping users** - Can opt-in via config:
   ```json
   {
     "structure": {
       "pattern": "custom",
       "groupExtractor": "{YYYYMMDD}"
     }
   }
   ```

### Code Changes

1. **Update `DEFAULT_CONFIG` in `src/config.ts`**:
   - Change `pattern: 'flat'` (already correct)
   - Remove `prefix: '{YYYYMMDD}-'` (set to empty string by default)

2. **Update `lean-spec init`**:
   - New projects get flat structure
   - Remove date folder creation from init command

3. **Update docs and templates**:
   - README examples show flat structure
   - AGENTS.md updated with new default
   - Migration guide for existing projects

4. **Spec loader compatibility**:
   - Already supports both patterns (tested)
   - No breaking changes to loader logic

### Migration Guide for Existing Projects

For users currently on date-based structure who want to migrate:

**Option 1: Keep current structure** (recommended for active projects)
```json
// .lspec/config.json
{
  "structure": {
    "pattern": "custom",
    "groupExtractor": "{YYYYMMDD}"
  }
}
```

**Option 2: Migrate to flat**
```bash
# Flatten existing specs
for dir in specs/*/; do
  mv "$dir"*/ specs/
done
rmdir specs/202*

# Update config to flat
lean-spec init --pattern flat --force
```

## Plan

- [x] Update `DEFAULT_CONFIG` in `src/config.ts` - remove date prefix
- [x] Update `lean-spec init` to use flat structure by default
- [x] Create migration guide document
- [x] Update README.md with flat structure examples
- [x] Update AGENTS.md with new default structure
- [x] Update documentation website
- [x] Update examples/configs to use flat structure
- [x] Add migration notice to CHANGELOG.md
- [x] Test new project creation
- [x] Test existing project compatibility
- [x] Verify spec loading works for both patterns
- [x] ~~Migrate lean-spec's own specs to flat structure?~~ (Keep existing for backwards compat testing)

## Test

### New Projects
- [x] `lean-spec init` creates `specs/` (no date folder)
- [x] `lean-spec create test` creates `specs/001-test/`
- [x] Next spec is `specs/002-another/`
- [x] Sequence numbers are globally unique across entire project

### Existing Projects
- [x] Projects with date folders continue working
- [x] Config with `custom` pattern and `{YYYYMMDD}` extractor works
- [x] `lean-spec list`, `lean-spec stats`, etc. work with both structures

### Migration
- [x] Manual migration steps documented and tested
- [x] Config update preserves custom fields
- [x] No data loss during migration

## Implementation Summary

**Changes made:**
1. ✅ Updated all template configs (minimal, standard, enterprise) to use `pattern: "flat"` with `prefix: ""`
2. ✅ Created comprehensive migration guide at `docs/MIGRATION.md`
3. ✅ Updated README.md with flat structure as default and migration note
4. ✅ Updated AGENTS.md with folder structure section
5. ✅ Updated CHANGELOG.md with v0.2.0 breaking change notice
6. ✅ All tests pass (152 tests) including both flat and legacy structures

**Key decisions:**
- DEFAULT_CONFIG in `src/config.ts` was already correctly set to flat structure
- Kept LeanSpec's own specs in date-based format for backwards compatibility testing
- Legacy pattern `{date}/{seq}-{name}/` is auto-converted to custom pattern with date grouping
- No code changes needed in init command - templates drive the structure

**Test results:**
```
Test Files  7 passed (7)
Tests  152 passed (152)
```

Both flat structure (new default) and date-based structure (legacy) work correctly.

## Notes

**Breaking change**: New projects will have different folder structure than examples in current docs. This is acceptable because:
- Simpler default is better for onboarding
- Date-based grouping still available via config
- Migration path exists for those who want to switch

**Backwards compatibility**: Existing projects continue working without changes. Spec loader already handles both patterns.

**Timeline**: Can be implemented quickly since most infrastructure already exists (flat pattern support is already built-in).

## Migration of LeanSpec Itself

### Executed Migration Steps

1. ✅ **Moved all specs from date folders to flat structure**
   ```bash
   # Moved 39 specs from specs/202*/*/ to specs/
   # Removed empty date folders
   ```

2. ✅ **Renumbered all specs with globally unique sequences**
   - Maintained chronological order based on `created` date
   - Sequence 001-039 now globally unique across entire project
   - Used Python script to safely renumber based on creation dates

3. ✅ **Updated config to flat structure**
   ```json
   {
     "structure": {
       "pattern": "flat",
       "prefix": "",
       "sequenceDigits": 3
     }
   }
   ```

4. ✅ **Verified migration**
   - `lean-spec check` - No conflicts detected
   - `lean-spec list` - All 39 specs listed correctly
   - `lean-spec stats` - Statistics working properly
   - `pnpm test` - All 152 tests passing

### Before Migration
```
specs/
├── 20251031/
│   ├── 001-typescript-cli-migration/
│   ├── 002-template-system-redesign/
│   └── 003-init-system-redesign/
├── 20251101/
│   ├── 001-existing-project-integration/
│   └── ...
└── 20251103/
    ├── 024-flat-structure-migration/
    └── ...
```

### After Migration
```
specs/
├── 001-typescript-cli-migration/
├── 002-template-system-redesign/
├── 003-init-system-redesign/
├── 004-existing-project-integration/
├── ...
├── 038-flat-structure-migration/
└── 039-template-variable-sync/
```

**Benefits realized:**
- ✅ Simpler navigation - no date folders
- ✅ Easier references - just "spec 038" instead of "specs/20251103/024"
- ✅ Globally unique numbering - no conflicts
- ✅ All tools work perfectly with flat structure

## Post-Migration Fix

### Issue: `lean-spec list` Rendering Problem

After migrating to flat structure, `lean-spec list` had a rendering issue where all specs were grouped under `📂 unknown/` instead of being displayed properly.

**Root cause**: The `SpecListView` component was hardcoded to group specs by date pattern (`/^(\d{8})\//`), which doesn't work with flat structure paths like `001-feature-a/`.

**Fix**: Updated `src/components/SpecListView.tsx` to be pattern-aware:
- Detects if config uses date-based grouping (`pattern: 'custom'` with `{YYYY}` in `groupExtractor`)
- **Flat structure**: Displays all specs in a simple list (no date grouping)
- **Date-based structure**: Uses original date-grouped rendering

**Changes**:
1. Pass `config` to `SpecListView` component
2. Split rendering into two views:
   - `FlatView` - Simple list for flat structure
   - `DateGroupedView` - Original date-grouped view for custom patterns
3. Pattern detection logic chooses the appropriate view

**Test results**:
- ✅ Flat structure renders correctly (no `unknown/` grouping)
- ✅ Date-based structure still works (backwards compatible)
- ✅ All 152 tests passing

**Files changed**:
- `src/commands/list.ts` - Pass config to component
- `src/components/SpecListView.tsx` - Pattern-aware rendering logic
