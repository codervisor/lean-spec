---
status: planned
created: 2026-02-01
priority: medium
tags:
- validation
- ux
- workflow
created_at: 2026-02-01T07:36:06.783810Z
updated_at: 2026-02-02T08:12:54.676887766Z
---
# Flexible Spec Completion Validation

## Overview

The current completion validation requires ALL checkboxes to be checked before a spec can be marked complete. This is too strict and doesn't reflect real-world usage:

1. **N/A items** - Some checkboxes become irrelevant as requirements evolve
2. **Nice-to-have items** - Not all planned items need completion for core work
3. **Scope changes** - Requirements shift during implementation
4. **Contextual importance** - "Test" section items are more critical than "Notes" section items

**Goal**: Create a flexible validation system that guides completion while respecting real-world spec evolution.

## Design

### Option 1: Section-based Rules (Recommended)

Define required vs optional sections. Items in required sections must be checked; optional sections are informational.

```yaml
# .lean-spec/config.json
{
  "validation": {
    "requiredSections": ["Plan", "Test"],
    "optionalSections": ["Notes", "Future", "Stretch Goals"]
  }
}
```

**Behavior:**
- Checkboxes in `requiredSections` → Must be checked or explicitly marked N/A
- Checkboxes in `optionalSections` → Informational only, don't block completion
- Unconfigured sections → Default to required (backward compatible)

**Pros:** Clear semantics, configurable per-project, backward compatible
**Cons:** Requires config setup, section naming must be consistent

### Option 2: Threshold-based Validation

Allow completion when a percentage threshold is met (e.g., 80%).

```yaml
{
  "validation": {
    "completionThreshold": 80,
    "minimumItems": 3
  }
}
```

**Behavior:**
- Spec can complete if ≥80% of items are checked
- Must have at least `minimumItems` checked (prevents gaming with 1-item specs)

**Pros:** Simple, flexible, forgiving
**Cons:** Lacks semantic meaning, could mask truly incomplete work

### Option 3: Explicit N/A Marking

Support `[-]` or `[n/a]` or `[~]` syntax for items that don't apply.

```markdown
- [x] Implement feature
- [-] Add caching (N/A - premature optimization)
- [ ] Outstanding item (blocks completion)
```

**Behavior:**
- `[x]` = Complete
- `[-]` or `[~]` or `[n/a]` = Not applicable, counts as "handled"
- `[ ]` = Unchecked, blocks completion

**Pros:** Explicit intent, documents why items were skipped, auditable
**Cons:** New syntax to learn, requires spec content changes

### Option 4: Hybrid Approach (Recommended)

Combine Options 1 and 3:
1. Section-based rules define importance
2. N/A marking allows explicit skip of individual items
3. Threshold as final fallback (configurable, default disabled)

This provides flexibility while maintaining semantic clarity.

## Plan

- [ ] Define CheckboxState enum: `Checked`, `Unchecked`, `NotApplicable`
- [ ] Update checkbox parser to recognize N/A syntax (`[-]`, `[~]`, `[n/a]`)
- [ ] Add `validation` config section to config schema
- [ ] Implement section classification (required/optional)
- [ ] Update CompletionVerifier with new logic
- [ ] Update CLI `update` command output to show N/A items
- [ ] Update MCP tool responses
- [ ] Add migration guidance for existing projects
- [ ] Document new validation behavior

## Test

- [ ] Spec with all checked items → passes (no change)
- [ ] Spec with N/A items in required section → passes
- [ ] Spec with unchecked items in optional section → passes
- [ ] Spec with unchecked items in required section → fails
- [ ] Default behavior (no config) → same as current (all must check)
- [ ] Threshold mode works when enabled
- [ ] Progress display shows N/A count separately

## Notes

### N/A Syntax Options

| Syntax | Pros | Cons |
|--------|------|------|
| `[-]` | Clean, looks like strikethrough | May conflict with some renderers |
| `[~]` | Unique, clear | Non-standard |
| `[n/a]` | Self-documenting | Verbose |
| `[/]` | Minimal | Could be confused with incomplete |

Recommendation: Support `[-]` as primary, with `[~]` as alias.

### Backward Compatibility

Default validation behavior should remain unchanged:
- No config → all checkboxes must be checked
- Existing specs continue to work
- New behavior is opt-in via config

### Alternative Considered: Per-checkbox Tags

```markdown
- [ ] Optional: Stretch goal #optional
- [ ] Required task
```

Rejected because:
- Clutters spec content
- Per-item is too granular
- Section-level is more maintainable
