---
status: archived
created: '2025-12-05'
tags:
  - cli
  - mcp
  - dx
  - dependencies
priority: medium
created_at: '2025-12-05T07:16:51.033Z'
updated_at: '2026-01-16T07:32:19.621Z'
transitions:
  - status: archived
    at: '2026-01-16T07:32:19.621Z'
---

# Add requiredBy Parameter to Link Command

> **Status**: 📦 Archived · **Priority**: Medium · **Created**: 2025-12-05 · **Tags**: cli, mcp, dx, dependencies

## Overview

Add a `requiredBy` parameter to the link command/tool as syntactic sugar for reverse dependency linking. Currently, linking successor specs requires calling `link` on each successor:

```bash
# Current: To say "151 is required by 148, 098, 146"
lean-spec link 148 --depends-on 151
lean-spec link 098 --depends-on 151
lean-spec link 146 --depends-on 151
```

With `requiredBy`, express this naturally from the source spec:

```bash
# Proposed: Single command from source spec
lean-spec link 151 --required-by 148,098,146
```

## Design

### Parameter Addition

**CLI:**
```bash
lean-spec link <spec> --depends-on <specs>    # Existing
lean-spec link <spec> --required-by <specs>   # New
```

**MCP Tool:**
```typescript
// Current schema
{
  specPath: string,
  dependsOn: string  // "045,046"
}

// Updated schema
{
  specPath: string,
  dependsOn?: string,   // "045,046" - adds to specPath's depends_on
  requiredBy?: string   // "148,098" - adds specPath to each target's depends_on
}
```

### Implementation Logic

```typescript
// In link command handler
if (requiredBy) {
  const targetSpecs = requiredBy.split(',').map(s => s.trim());
  for (const target of targetSpecs) {
    // Add specPath to target's depends_on
    await addDependency(target, specPath);
  }
}
```

### Validation

- Both `--depends-on` and `--required-by` can be used together
- Circular dependency check applies to both directions
- Invalid spec references return clear error messages

## Plan

- [ ] Add `--required-by` option to CLI link command
- [ ] Add `requiredBy` parameter to MCP link tool schema
- [ ] Implement reverse linking logic in core
- [ ] Update help text and documentation
- [ ] Add tests for new parameter

## Test

- [ ] `lean-spec link 151 --required-by 148` adds 151 to 148's depends_on
- [ ] Multiple targets work: `--required-by 148,098,146`
- [ ] Can combine: `--depends-on 109 --required-by 148`
- [ ] Circular dependency detected and rejected
- [ ] Invalid spec names return helpful error
- [ ] MCP tool works with requiredBy parameter

## Notes

### Why This Matters

When creating a foundational spec (like 151-multi-project-architecture-refactoring), you want to express "these future specs depend on me" without switching context to edit each successor. This is the natural mental model when planning work.

### Alternative Considered

**Separate command**: `lean-spec link-reverse 151 148,098`
- Rejected: Adds command proliferation, `--required-by` is clearer

### Naming

- `--required-by` chosen over `--enables` or `--unlocks` for clarity
- Matches the computed `requiredBy` field already shown in spec views
