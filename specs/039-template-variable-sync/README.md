---
status: planned
created: '2025-11-03'
tags: [bug, templates, frontmatter, enhancement]
priority: high
---

# Template Variable Synchronization

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-03

**Project**: lean-spec  
**Team**: Core Development

## Overview

When creating a spec with `--field priority=high`, the frontmatter is correctly updated but the template body still shows hardcoded values. For example:

```markdown
---
priority: high    # ✓ Correct (from --field)
---

> **Priority**: Medium  # ✗ Wrong (hardcoded in template)
```

**Why this matters:**
- Inconsistent data between frontmatter and body content
- Users expect `--field` values to populate throughout the spec
- Manual editing required to fix mismatches
- Affects `priority`, `status`, and potentially other fields

**Root cause:** Templates have hardcoded values in body content instead of using variable placeholders like `{priority}`, `{status}`, etc.

## Design

### Solution 1: Add Frontmatter Variables to Variable Resolver

Extend `variable-resolver.ts` to support frontmatter field variables:

```typescript
export interface VariableContext {
  name?: string;
  date?: string;
  projectName?: string;
  gitInfo?: GitInfo;
  customVariables?: Record<string, string>;
  frontmatter?: Record<string, unknown>;  // NEW
}
```

**Variable resolution flow:**
1. Parse template to extract frontmatter
2. Merge frontmatter fields into variable context
3. Resolve variables in body (including `{priority}`, `{status}`, etc.)
4. Support nested fields like `{tags}` (array → comma-separated string)

**Template update:**
```markdown
---
status: planned
priority: medium
tags: []
---

# {name}

> **Status**: {status} · **Priority**: {priority} · **Created**: {date}
```

### Solution 2: Post-Process After Frontmatter Update

Alternative approach - update body content after frontmatter is modified:

```typescript
// In create.ts, after updating frontmatter:
if (options.priority) {
  parsed.data.priority = options.priority;
  // Also update body content
  content = content.replace(/Priority[:\s]+\w+/gi, `Priority: ${capitalize(options.priority)}`);
}
```

**Pros**: Simple, no template changes needed  
**Cons**: Fragile (regex-based), doesn't handle all cases

### Recommended: Solution 1

More robust, consistent with existing variable system, enables richer templates.

## Plan

- [ ] Extend `VariableContext` to include frontmatter fields
- [ ] Update `buildVariableContext()` to parse frontmatter from template
- [ ] Update `resolveVariables()` to handle frontmatter field variables
- [ ] Add special handling for arrays (e.g., `{tags}` → comma-separated)
- [ ] Add special handling for status/priority display formatting
- [ ] Update all templates to use variables instead of hardcoded values
  - [ ] `templates/standard/spec-template.md`
  - [ ] `templates/minimal/spec-template.md`
  - [ ] `templates/enterprise/spec-template.md`
  - [ ] `.lspec/templates/spec-template.md` (if exists)
- [ ] Update docs to document available frontmatter variables
- [ ] Add tests for frontmatter variable resolution
- [ ] Test with various field types (string, number, boolean, array)

## Test

### Variable Resolution
- [ ] `{priority}` resolves to frontmatter priority value
- [ ] `{status}` resolves to frontmatter status value
- [ ] `{tags}` resolves to comma-separated tag list
- [ ] Custom fields like `{epic}` resolve correctly
- [ ] Missing fields don't break template (empty string or default)

### Integration
- [ ] `lspec create test --field priority=high` shows "Priority: high" in body
- [ ] `lspec create test --field status=in-progress` shows correct status
- [ ] Array fields like tags display correctly
- [ ] Existing specs without variables still work

### Edge Cases
- [ ] Boolean fields (true/false) resolve as strings
- [ ] Number fields resolve as strings
- [ ] Nested objects are handled gracefully
- [ ] Variables in frontmatter values don't cause recursion

## Notes

**Complexity**: Medium - requires careful handling of frontmatter parsing order

**Workaround (current)**: Users can manually edit the body after creation, or update templates locally to match their needs

**Alternative considered**: Use a more sophisticated template engine (Handlebars, Nunjucks), but that adds dependencies and complexity for a simple use case

**Timeline**: Should be implemented before v1.0 release to avoid breaking template changes later
