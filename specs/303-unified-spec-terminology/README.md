---
status: planned
created: 2026-02-04
priority: medium
tags:
- terminology
- naming
- ux
- documentation
created_at: 2026-02-04T03:06:44.227231Z
updated_at: 2026-02-04T03:06:44.227231Z
---

# Unified Spec Terminology: Sections vs Children

## Overview

We have confusing and overlapping terminology for two distinct concepts:

### Current Confusion

1. **"Sub-specs" / "sub-spec files" / "subSpecs"** (spec 012, 084):
   - Additional markdown files within a spec folder
   - Examples: `DESIGN.md`, `TESTING.md`, `IMPLEMENTATION.md`
   - Path like: `specs/082-my-feature/DESIGN.md`

2. **"Children" / "child specs"** (hierarchy.ts, spec-card.tsx):
   - Separate specs with parent-child relationships
   - Uses `parent` field in frontmatter 
   - An "umbrella" spec has multiple child specs

### The Problem

- "sub-spec" sounds like "subordinate spec" or "child spec"
- But sub-spec files are NOT separate specs—they're sections of a single spec
- UI code conflates both: `spec-card.tsx` treats `children` and `subSpecsCount` equivalently
- New users and AI agents get confused about the difference

### Examples of Confusion

```tsx
// spec-card.tsx line 49 - mixing concepts
const hasChildren = (spec.children && spec.children.length > 0) || 
                    (spec.subSpecsCount && spec.subSpecsCount > 0);
```

```markdown
<!-- SKILL.md line 88 -->
- Parent completes when all children complete

<!-- But spec 084 title -->
Sub-Spec File Visibility in MCP Tools
```

## Design

### Proposed Terminology

| Old Term | New Term | Definition |
|----------|----------|------------|
| sub-spec file | **section file** | Additional .md file within a spec folder |
| sub-specs | **sections** | Collection of section files |
| subSpecs (code) | `sections` | Code property name |
| subSpecsCount | `sectionsCount` | UI counter |
| loadSubFiles() | `loadSections()` | Function name |
| --- | --- | --- |
| children (for hierarchy) | **children** | Keep as-is |
| child spec | **child spec** | Keep as-is |
| parent/umbrella | **umbrella** spec | Keep as-is |

### Why "Sections"?

- Matches document terminology (a spec has sections)
- Clear that sections are PARTS of one spec, not separate specs
- No confusion with hierarchical parent/child relationships
- Common in documentation tools (Docusaurus sections, GitBook sections)

### Alternative Considered

| Alternative | Why Rejected |
|-------------|--------------|
| "fragments" | Too vague, suggests incomplete pieces |
| "parts" | Could still confuse with child specs |
| "docs" | Too generic, conflicts with docs folder |
| "attachments" | Implies secondary/non-essential content |
| "modules" | Code-focused, not document-focused |

### Migration Strategy

**Phase 1: Documentation (non-breaking)**
- Update all docs/skills to use "sections" terminology
- Keep code names unchanged but document the mapping
- Update spec 012 title to "Spec Section Files"

**Phase 2: Code Transition (v0.3.0)**
- Add `sections` as alias for `subSpecs` in API responses
- Add `sectionsCount` as alias for `subSpecsCount`
- Deprecate old names with console warnings

**Phase 3: Breaking Change (v1.0.0)**
- Remove deprecated names
- Rename functions: `loadSubFiles()` → `loadSections()`
- Update all internal references

## Plan

### Phase 1: Documentation Update
- [ ] Update SKILL.md terminology section
- [ ] Update spec 012 title and content
- [ ] Update spec 084 to use "sections" language
- [ ] Update docs-site content
- [ ] Create migration guide in CHANGELOG

### Phase 2: API Aliasing
- [ ] Add `sections` to MCP tool responses (alias)
- [ ] Add `sectionsCount` to UI types (alias)
- [ ] Add deprecation notices for old names
- [ ] Update spec-card.tsx to use `sectionsCount` preference

### Phase 3: Full Migration
- [ ] Rename `loadSubFiles()` → `loadSections()` 
- [ ] Remove deprecated aliases
- [ ] Update all internal variable names
- [ ] Final docs cleanup

## Test

- [ ] Documentation uses consistent "sections" terminology
- [ ] API responses include both old and new field names (Phase 2)
- [ ] Deprecation warnings appear in dev mode
- [ ] No user confusion in GitHub issues/discussions

## Notes

### Related Specs
- 012-sub-spec-files - Original sub-spec file implementation
- 084-sub-spec-visibility-in-tools - MCP tool visibility for sub-specs
- SDD SKILL.md - Parent/Child relationship documentation

### Open Questions

1. Should we also rename the `lean-spec files` command to `lean-spec sections`?
   - Recommendation: Yes, add alias and deprecate old name

2. Should archived specs 012, 084 be updated?
   - Recommendation: Update titles only, note the rename in content

3. Timeline for breaking changes?
   - Recommendation: v0.3.0 for aliases, v1.0.0 for removal
