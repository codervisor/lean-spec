---
status: complete
created: '2025-11-04'
tags:
  - ux
  - clarity
  - frontmatter
  - relationships
  - v0.2.0
priority: high
related:
  - 043-official-launch-02
created_at: '2025-11-04T00:00:00Z'
updated_at: '2025-11-06T06:35:03.913Z'
completed_at: '2025-11-06T06:35:03.913Z'
completed: '2025-11-06'
transitions:
  - status: complete
    at: '2025-11-06T06:35:03.913Z'
---

# Clarify Spec Relationship Model

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-04 · **Tags**: ux, clarity, frontmatter, relationships, v0.2.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: The current spec relationship model is confusing and inconsistent.

**Confusion points:**
1. **`related` appears bidirectional but isn't** - If spec A has `related: [B]`, the `deps` command shows it from A's perspective but not automatically from B's
2. **`depends_on` vs `related` unclear** - When should you use which?
3. **Display confusion** - "Related" vs "Related By" sections in `lean-spec deps` output
4. **Symmetry expectations** - Users expect `related` to be symmetric (if A relates to B, then B relates to A)

**Current behavior:**
```bash
# Spec 042 has: related: [043]
lean-spec deps 042  # Shows: Related → 043
lean-spec deps 043  # Shows: Related By ← 042  (had to add this!)
```

**Why this matters:**
- Core UX issue affecting how users track work
- Confusion leads to inconsistent spec relationships
- Critical for v0.2.0 launch coordination (blocking specs need clear relationships)

## Design

### Option 1: Make `related` Truly Bidirectional (Recommended)

**Change behavior**: When spec A has `related: [B]`, automatically show the relationship from both sides without requiring B to also list A.

**Implementation:**
- `related` field means "this spec is related to these specs" (one-way declaration)
- `lean-spec deps` shows bidirectional view automatically
- Remove "Related" vs "Related By" distinction - just show "Related Specs"
- Merge both directions into single list

**Example:**
```yaml
# Spec 042
related: [043]

# Spec 043
related: []  # Doesn't need to list 042
```

**Output:**
```bash
lean-spec deps 042
Related Specs:
  ⟷ 043-official-launch-02 [in-progress]

lean-spec deps 043
Related Specs:
  ⟷ 042-mcp-error-handling [in-progress]  # Automatically shown!
```

**Pros:**
- ✅ Intuitive - matches user expectations
- ✅ Less redundancy - don't need to update both specs
- ✅ Cleaner UX - single "Related Specs" section
- ✅ Easier maintenance - update in one place

**Cons:**
- ❌ Can't distinguish who declared the relationship
- ❌ Asymmetric data model (one side declares, both show)

### Option 2: Keep Directional, Improve Clarity

**Change terminology and documentation:**
- Rename `related` → `see-also` or `references`
- Make it clear this is **directional** (one-way)
- Better docs explaining when to use each field

**Relationship types:**
```yaml
depends_on: [spec-id]  # Hard dependency - can't start until these complete
see_also: [spec-id]    # Soft reference - related context, no blocking
blocks: [spec-id]      # This spec blocks these specs (inverse of depends_on)
```

**Pros:**
- ✅ Clear semantics
- ✅ Explicit control over directionality
- ✅ More powerful for complex relationships

**Cons:**
- ❌ More fields to understand
- ❌ More manual work to maintain relationships
- ❌ Still confusing for simple use cases

### Option 3: Bidirectional with Explicit Sync

**Introduce relationship commands:**
```bash
lean-spec relate 042 043      # Links both specs bidirectionally
lean-spec unrelate 042 043    # Removes from both
lean-spec deps 042 --sync     # Auto-sync relationships
```

**Implementation:**
- Commands automatically update both specs
- Maintain bidirectional consistency
- Can still manually edit for asymmetric cases

**Pros:**
- ✅ Best of both worlds - bidirectional when desired
- ✅ Still allows manual asymmetric relationships
- ✅ Tooling enforces consistency

**Cons:**
- ❌ More commands to learn
- ❌ More complex implementation
- ❌ Risk of conflicts in concurrent edits

### Option 4: Typed Relationships (Advanced)

**Introduce relationship types:**
```yaml
relationships:
  - spec: 043
    type: part-of       # This spec is part of 043
  - spec: 018
    type: prerequisite  # 018 should be done first
  - spec: 037
    type: related       # Loosely related
```

**Pros:**
- ✅ Very expressive
- ✅ Clear semantics
- ✅ Supports complex project structures

**Cons:**
- ❌ Too complex for most users
- ❌ Against "lean" philosophy
- ❌ Overkill for 90% of use cases

## Recommendation

**Go with Option 1: Make `related` truly bidirectional**

**Rationale:**
1. **Matches user expectations** - "related" sounds symmetric
2. **Lean philosophy** - simpler is better
3. **Reduces maintenance** - update once, show everywhere
4. **Backward compatible** - existing specs still work

**Keep directional for dependencies:**
- `depends_on` stays directional (hard dependency)
- `related` becomes bidirectional (soft relationship)
- This gives us both semantic clarity and ease of use

## Plan

### Phase 1: Update `deps` Command UX ⏳ READY TO IMPLEMENT
- [ ] Merge "Related" and "Related By" into single "Related Specs" section
- [ ] Show relationships bidirectionally without distinction
- [ ] Update help text and examples
- [ ] Test with launch specs (042, 037, 043, etc.)

**Implementation Notes (2025-11-04):**
- Current `deps` command shows "Related" and "Related By" separately
- Bidirectional approach is intuitive and reduces maintenance
- Low risk, high value UX improvement
- Estimated: 2-4 hours implementation
- Can implement independently, no blocking dependencies

### Phase 2: Update Documentation
- [ ] Update AGENTS.md to explain relationship model
- [ ] Update command docs to clarify `depends_on` vs `related`
- [ ] Add examples showing both types
- [ ] Document: "related = bidirectional, depends_on = directional blocking"

### Phase 3: Consider Enhanced Commands (Optional)
- [ ] Add `lean-spec relate <spec-a> <spec-b>` convenience command
- [ ] Add `lean-spec unrelate <spec-a> <spec-b>` 
- [ ] Consider `--sync` flag to auto-update both sides
- [ ] Defer if not needed for v0.2.0

### Phase 4: Visual Improvements
- [ ] Consider showing relationship direction for `depends_on`
- [ ] Use better symbols: → for depends, ⟷ for related
- [ ] Add color coding for relationship types
- [ ] Test with complex dependency graphs

## Test

### Bidirectional Behavior
- [ ] Spec A has `related: [B]`, `lean-spec deps A` shows B
- [ ] `lean-spec deps B` also shows A (bidirectional)
- [ ] Spec C has `depends_on: [D]`, shows directionally only
- [ ] `lean-spec deps D` shows "Blocks: C" (inverse)
- [ ] Combined test: A related to B, A depends on C

### UX Clarity
- [ ] Users understand difference between `related` and `depends_on`
- [ ] No confusion about "Related" vs "Related By"
- [ ] Single section makes sense to first-time users
- [ ] Help text is clear and accurate

### Edge Cases
- [ ] Spec relates to archived spec
- [ ] Spec relates to non-existent spec (graceful error)
- [ ] Circular relationships (A → B → A)
- [ ] Large relationship graphs (performance)

### Migration
- [ ] Existing specs with `related` continue working
- [ ] No breaking changes to frontmatter format
- [ ] JSON output includes both directions
- [ ] MCP server reflects new behavior

## Notes

### Current State Analysis

**What we have now:**
```typescript
// In spec 042
related: [043]

// Command output is asymmetric:
lean-spec deps 042  // Related: 043
lean-spec deps 043  // Related By: 042
```

**The confusion:**
- "Related" sounds mutual/bidirectional
- But it's stored directionally (only in 042)
- We had to add "Related By" to show reverse direction
- This creates two sections for what feels like one relationship

### Semantic Comparison

| Field | Current Behavior | Proposed Behavior |
|-------|-----------------|-------------------|
| `depends_on` | Directional blocking dependency | **Keep**: Directional - A depends on B (B blocks A) |
| `related` | Directional soft reference | **Change**: Bidirectional - A relates to B means B relates to A |
| Display | "Related" + "Related By" sections | **Merge**: Single "Related Specs" section |

### Implementation Impact

**Code changes:**
- Update `findRelated()` to merge both directions
- Remove "Related By" section
- Update JSON output to include both directions in `related` field
- Update tests

**Estimated effort:** 2-4 hours

**Risk:** Low - backward compatible, improves UX

### Alternative: Do Nothing

**Could argue:**
- Current behavior is technically correct
- Users can learn "Related" vs "Related By"
- Already implemented and working

**Counter-argument:**
- UX matters more than technical correctness
- If it's confusing, fix it
- Better now than after wider adoption
- Aligns with "lean" philosophy of clarity

### Related Work

- Spec 043: Official Launch - needs clear relationship tracking
- Spec 018: Spec Validation - could validate relationship consistency
- Spec 037: Docs Overhaul - should document relationship model clearly

### Open Questions

1. **Should `lean-spec relate` command auto-edit both specs?**
   - Pro: Maintains consistency
   - Con: More complex, can wait for v0.3.0

2. **How to handle `depends_on` in visualization?**
   - Keep separate from `related`? Yes
   - Show direction with arrows? Yes (→ for depends, ⟷ for related)

3. **Should related specs show in board/list views?**
   - Probably not - would clutter
   - Keep in `deps` command only

4. **What about `blocks` field?**
   - Auto-computed from `depends_on` (inverse)
   - Don't need explicit field
   - Current behavior is correct
