---
status: planned
created: 2025-11-03T00:00:00.000Z
tags:
  - bug
  - frontmatter
priority: high
---

# created-date-format-bug

> **Status**: 📋 Planned · **Priority**: High · **Created**: 2025-11-03 · **Tags**: bug, frontmatter

**Project**: lean-spec  
**Team**: Core Development

## Overview

The `lspec create` command creates spec files with a `created` field in the frontmatter. The intended format is `YYYY-MM-DD` (e.g., `2025-11-03`), but after the file is written, the field appears as a full ISO 8601 date string: `2025-11-03T00:00:00.000Z`.

**Root Cause**: 
- `gray-matter` automatically parses YAML dates into JavaScript `Date` objects
- When `matter.stringify()` writes the frontmatter back, it converts the Date object to ISO string format
- This happens in `src/commands/create.ts` when updating frontmatter with tags, priority, assignee, or custom fields

**Impact**:
- Inconsistent date format in frontmatter (ISO string vs YYYY-MM-DD)
- Breaks the expected format documented in AGENTS.md
- Visual appearance is less clean
- May cause issues with date parsing in other tools

## Design

**Solution**: Configure `gray-matter` to preserve date strings as-is, without automatic parsing.

Use the `engines` option in `gray-matter`:

```typescript
const parsed = matter(content, {
  engines: {
    yaml: (str) => require('js-yaml').load(str, { schema: require('js-yaml').FAILSAFE_SCHEMA })
  }
});
```

The `FAILSAFE_SCHEMA` prevents automatic type coercion, keeping dates as strings.

**Alternative approaches considered**:
1. Manually convert Date objects back to `YYYY-MM-DD` format - fragile, easy to miss edge cases
2. Use a custom YAML schema - more complex configuration
3. Post-process the stringified output - regex-based string manipulation is error-prone

## Plan

- [ ] Update `src/commands/create.ts` to configure `gray-matter` with FAILSAFE_SCHEMA
- [ ] Update `src/frontmatter.ts` to configure `gray-matter` with FAILSAFE_SCHEMA in read/update functions
- [ ] Add integration test verifying created field stays as `YYYY-MM-DD` after create
- [ ] Add test for update command to verify dates remain in correct format
- [ ] Check all other places where `matter()` is called for consistency

## Test

- [ ] Create a new spec: `lspec create test-spec` - verify `created` field is `YYYY-MM-DD`
- [ ] Create with tags: `lspec create test-spec --tags=foo` - verify `created` remains `YYYY-MM-DD`
- [ ] Create with custom fields: `lspec create test-spec --field epic=123` - verify format preserved
- [ ] Update existing spec: `lspec update test-spec --status=in-progress` - verify dates stay formatted
- [ ] Run full test suite: `pnpm test` - all existing tests pass

## Notes

**Related Files**:
- `src/commands/create.ts` - Where specs are created and frontmatter is initially written
- `src/frontmatter.ts` - `parseFrontmatter()` and `updateFrontmatterField()` functions
- `src/utils/variable-resolver.ts` - Date generation logic

**Reproduction**:
```bash
# This spec itself demonstrates the bug - check the frontmatter above
lspec create test-spec --tags=demo
cat specs/*/test-spec/README.md | head -5
# created: 2025-11-03T00:00:00.000Z  <- BUG
```

**References**:
- gray-matter docs: https://github.com/jonschlinkert/gray-matter
- js-yaml schemas: https://github.com/nodeca/js-yaml#schema
