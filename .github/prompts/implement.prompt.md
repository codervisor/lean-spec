---
name: implement
description: Implement one or more specs following SDD workflow
---

# Implement Spec

Implement the specified spec(s) following the Spec-Driven Development workflow.

## Workflow

### 1. Load Spec Context
- Use `view <spec>` to read the full spec content (includes parent/children)
- Understand the scope, requirements, and acceptance criteria
- Check `deps <spec>` to ensure dependencies are complete
- If dependencies are incomplete, implement those first or report blockers

**For parent (umbrella) specs:**
- Implement child specs first - parent completes when all children complete
- Parent spec defines overall scope; children define implementation details

**For child specs:**
- Ensure implementation aligns with parent's overall vision
- Child can be completed independently once its requirements are met

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

### 4. Verify Implementation

**Run validation:**
- Execute tests: `pnpm test` or project-specific command
- Run linting: `pnpm lint`
- Check for type errors: `pnpm typecheck`
- Use `lean-spec validate` to check spec completeness

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
| View spec | `view` | `lean-spec view <spec>` |
| Check deps | `deps` | `lean-spec deps <spec>` |
| Update status | `update` | `lean-spec update <spec> --status <status>` |
| Validate | `validate` | `lean-spec validate` |

## Important Reminders

- **Read the full spec first** - Don't start without understanding scope
- **Check dependencies** - Blocked specs should be deferred
- **Parent specs** - Implement children first; parent completes when all children complete
- **Stay in scope** - Out-of-scope discoveries become new specs
- **Update status immediately** - in-progress before coding, complete after verification
- **Validate before completing** - Tests must pass, checklist must be done