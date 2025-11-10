---
status: planned
created: 2025-11-03
tags: [templates, polish]
priority: low
---

# Template Config Updates

> Update all template configs to use new format consistently

## Overview

The built-in templates (minimal, standard, enterprise) in `templates/` still use the legacy config format. They work fine but are inconsistent with the new flexible folder structure config format introduced in spec 20251103/001.

**Issue:** Templates use old config format.

**Solution:** Update all template `config.json` files to new format with `folderPattern`.

## Design

Update templates to use new config format:

**Current format (legacy):**
```json
{
  "specDir": "specs"
}
```

**New format:**
```json
{
  "specDir": "specs",
  "folderPattern": "{YYYYMMDD}/{NNN}-{name}/",
  "prefix": "",
  "frontmatter": {
    "required": ["status", "created"],
    "custom": {}
  }
}
```

**Templates to update:**
- `templates/minimal/config.json`
- `templates/standard/config.json`
- `templates/enterprise/config.json`

Each template should have a sensible default `folderPattern`:
- **Minimal**: Flat pattern `{NNN}-{name}/` (simplest)
- **Standard**: Date-grouped `{YYYYMMDD}/{NNN}-{name}/` (prevents conflicts)
- **Enterprise**: Date-grouped `{YYYYMMDD}/{NNN}-{name}/` (team workflows)

## Plan

- [ ] Update `templates/minimal/config.json`
- [ ] Update `templates/standard/config.json`
- [ ] Update `templates/enterprise/config.json`
- [ ] Test template creation with new configs
- [ ] Update template README files if needed

## Test

- [ ] All templates use new config format
- [ ] `lean-spec init` works with each template
- [ ] Config merging works correctly
- [ ] Backward compatibility maintained

## Notes

Related to spec 20251103/002-folder-structure-improvements - this is a polish issue split out for focused tracking.

Low priority since legacy format still works, but good for consistency.
