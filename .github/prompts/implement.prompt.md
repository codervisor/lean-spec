---
name: implement
description: Implement one or more specs following SDD workflow
---

# Implement Spec

Implement the specified spec(s) following the Spec-Driven Development workflow.

## Workflow

### 1. Load Spec Context
- Use `view <spec>` to read the full spec content
- The `view` output already includes: parent, children, depends_on, required_by
- Understand the scope, requirements, and acceptance criteria
- If dependencies exist, check their status in the `view` output

> **⚠️ Do NOT call `list`, `list_children`, or `list_umbrellas`** - the `view` tool provides all relationship info you need.

**For umbrella specs with children:**
- Children are listed in `view` output - no separate lookup needed
- Implement children first; mark parent complete only when all children are complete
- If asked to implement the parent, implement its children individually

**For child specs:**
- Child can be completed independently once its requirements are met
- Parent status is not your concern when implementing a child

### 2. Update Status
- Set spec status to `in-progress` before starting work:
  ```bash
  lean-spec update <spec> --status in-progress
  ```
  Or use MCP tool: `update`

### 3. Implement Changes

**Follow the spec's guidance:**
- Implement all checklist items in order
- Follow the technical approach defined in the spec
- Stay within the defined scope boundaries
- Make decisions aligned with documented trade-offs

**Best practices:**
- Make incremental, focused changes
- Keep commits atomic and well-described
- Run tests frequently during implementation
- Document any discoveries or deviations in the spec

### 4. Verify Implementation (MANDATORY)

> **⚠️ DO NOT skip this step. DO NOT mark spec complete until ALL checks pass.**

**Run these commands and verify zero errors:**

```bash
# Required validation sequence - run ALL of these
pnpm typecheck    # Must show no TypeScript errors
pnpm test         # Must pass all tests  
pnpm lint         # Must pass linting
```

**Verification checklist (all must pass):**
- [ ] `pnpm typecheck` - Zero type errors
- [ ] `pnpm test` - All tests pass
- [ ] `pnpm lint` - No lint errors
- [ ] `lean-spec validate` - Spec is complete

**If any check fails:**
1. Fix the issues before proceeding
2. Re-run failing command to confirm fix
3. Only continue when ALL checks pass

**Cross-check requirements:**
- Verify each checklist item is implemented
- Confirm acceptance criteria are met
- Ensure no scope creep occurred

### 5. Complete the Spec

**When all requirements are verified:**
1. Mark all checklist items as done in the spec
2. Add implementation notes if needed
3. Update status to complete:
   ```bash
   lean-spec update <spec> --status complete
   ```

## Quick Reference

| Action | MCP Tool | CLI Command |
|--------|----------|-------------|
| View spec (includes all relationships) | `view` | `lean-spec view <spec>` |
| Update status | `update` | `lean-spec update <spec> --status <status>` |
| Validate | `validate` | `lean-spec validate` |

> **Note:** The `view` tool returns parent, children, depends_on, and required_by. Avoid separate calls to `deps`, `list`, `list_children`, or `list_umbrellas`.

## Important Reminders

- **Read the full spec first** - Don't start without understanding scope
- **Use `view` for all context** - It includes dependencies, parent, children - no need for separate `list`, `deps`, or `list_children` calls
- **Parent specs** - Implement children first; parent completes when all children complete
- **Stay in scope** - Out-of-scope discoveries become new specs
- **Update status immediately** - in-progress before coding, complete after verification
- **⚠️ ALWAYS run `pnpm typecheck`** - Never skip type checking before completing
- **Validate before completing** - Tests, typecheck, and lint must ALL pass