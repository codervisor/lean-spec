---
name: update
description: Update spec content during draft phase
---

# Update Spec

Update spec content during the draft phase of Spec-Driven Development.

## When to Use

Use `update` when the spec is still being drafted or revised:
- Requirements are changing or evolving
- Scope needs clarification
- New information affects the design
- Stakeholder feedback requires changes

For pre-implementation codebase research, use `/refine` instead.

## Common Update Scenarios

| Scenario | What to Update |
|----------|----------------|
| Scope change | Requirements, non-goals, checklist items |
| New discovery | Technical notes, decisions section |
| Scope creep | Split into new spec, update original scope |
| Blocked | Add blocker notes, link dependencies |
| Pivot | Archive old approach, document new direction |

## Workflow

### 1. View Current Spec
- Use `view <spec>` to read the full spec content
- Check `deps <spec>` and `relationships <spec>` for context
- Understand what exists before making changes

### 2. Identify What Needs Updating

**Content updates (edit spec file directly):**
- Adding/removing requirements
- Clarifying scope or non-goals
- Updating technical approach
- Documenting decisions
- Adding implementation notes

**Metadata updates (use tools):**
- Status changes → `update <spec> --status <status>`
- Adding dependencies → `link <spec> --depends-on <other>`
- Setting parent → `link <spec> --parent <parent>`
- Removing links → `unlink <spec> --depends-on <other>`

### 3. Make Content Updates

**Edit the spec file directly for:**

1. **Requirements changes**
   - Add new checklist items with `- [ ]`
   - Remove obsolete items
   - Reorder for logical flow
   - Group under clear section headers

2. **Scope clarification**
   - Update Overview if goal shifted
   - Add items to Non-Goals to prevent creep
   - Clarify boundaries that were ambiguous

3. **Technical updates**
   - Update Technical Notes with new decisions
   - Document trade-offs and rationale
   - Add file references and architecture notes

4. **Progress documentation**
   - Check off completed items: `- [ ]` → `- [x]`
   - Add implementation notes under completed items
   - Document blockers or discoveries

### 4. Handle Scope Creep

If requirements grow beyond original scope:

1. **Evaluate fit**: Does it belong in this spec?
2. **Split if needed**: Create new spec for out-of-scope work
3. **Link appropriately**: Use `depends-on` or `parent` as needed
4. **Update original**: Add to Non-Goals or reference new spec

```bash
# Create new spec for split work
lean-spec create "new-feature-scope"

# Link as dependency if needed
lean-spec link <new-spec> --depends-on <original-spec>
```

### 5. Update Metadata

**Status transitions:**
```bash
# Starting work
lean-spec update <spec> --status in-progress

# Work complete
lean-spec update <spec> --status complete

# Back to planned (if deprioritized)
lean-spec update <spec> --status planned
```

**Relationship updates:**
```bash
# Add dependency
lean-spec link <spec> --depends-on <blocker-spec>

# Remove dependency
lean-spec unlink <spec> --depends-on <blocker-spec>

# Set parent (organizational)
lean-spec link <spec> --parent <umbrella-spec>
```

### 6. Validate Changes

Run validation after updates:
```bash
lean-spec validate
```

**Check for:**
- Token count still under 2000
- Required sections present
- Valid dependency references
- Proper checklist formatting

## Quick Reference

| Action | MCP Tool | CLI Command |
|--------|----------|-------------|
| View spec | `view` | `lean-spec view <spec>` |
| Update status | `update` | `lean-spec update <spec> --status <status>` |
| Add dependency | `link` | `lean-spec link <spec> --depends-on <dep>` |
| Remove dependency | `unlink` | `lean-spec unlink <spec> --depends-on <dep>` |
| Set parent | `link` | `lean-spec link <spec> --parent <parent>` |
| Check relationships | `relationships` | `lean-spec rel <spec>` |
| Check tokens | `tokens` | `lean-spec tokens <spec>` |
| Validate | `validate` | `lean-spec validate` |

## Important Reminders

- **View before editing** - Understand current state first
- **Use tools for metadata** - Don't manually edit frontmatter
- **Keep token count low** - Split if approaching 2000 tokens
- **Document decisions** - Capture why, not just what changed
- **Split, don't bloat** - New scope = new spec
- **Validate after changes** - Catch issues early
- **Update status honestly** - Reflect actual work state