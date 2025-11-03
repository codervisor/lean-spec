---
status: planned
created: '2025-11-03'
tags: [structure, migration, breaking-change, enhancement]
priority: high
---

# Flat Structure Migration

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-03

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

2. **Update `lspec init`**:
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
lspec init --pattern flat --force
```

## Plan

- [ ] Update `DEFAULT_CONFIG` in `src/config.ts` - remove date prefix
- [ ] Update `lspec init` to use flat structure by default
- [ ] Create migration guide document
- [ ] Update README.md with flat structure examples
- [ ] Update AGENTS.md with new default structure
- [ ] Update documentation website
- [ ] Update examples/configs to use flat structure
- [ ] Add migration notice to CHANGELOG.md
- [ ] Test new project creation
- [ ] Test existing project compatibility
- [ ] Verify spec loading works for both patterns
- [ ] Migrate lean-spec's own specs to flat structure?

## Test

### New Projects
- [ ] `lspec init` creates `specs/` (no date folder)
- [ ] `lspec create test` creates `specs/001-test/`
- [ ] Next spec is `specs/002-another/`
- [ ] Sequence numbers are globally unique across entire project

### Existing Projects
- [ ] Projects with date folders continue working
- [ ] Config with `custom` pattern and `{YYYYMMDD}` extractor works
- [ ] `lspec list`, `lspec stats`, etc. work with both structures

### Migration
- [ ] Manual migration steps documented and tested
- [ ] Config update preserves custom fields
- [ ] No data loss during migration

## Notes

**Breaking change**: New projects will have different folder structure than examples in current docs. This is acceptable because:
- Simpler default is better for onboarding
- Date-based grouping still available via config
- Migration path exists for those who want to switch

**Backwards compatibility**: Existing projects continue working without changes. Spec loader already handles both patterns.

**Timeline**: Can be implemented quickly since most infrastructure already exists (flat pattern support is already built-in).
