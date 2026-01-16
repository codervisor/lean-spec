# LeanSpec SDD Workflow (Detailed)

This guide expands the workflow from SKILL.md with practical steps and decision points.

## Discovery Phase

**Goal:** Understand current spec state before creating anything new.

1. Run project status
   - MCP: `board`
   - CLI: `lean-spec board`
2. Search for related specs
   - MCP: `search`
   - CLI: `lean-spec search "your query"`
3. Review any related specs with `view`.

## Design Phase

**Goal:** Create or update specs to define intent and scope.

1. Decide if a new spec is required.
2. Create spec if needed
   - MCP: `create`
   - CLI: `lean-spec create <name>`
3. Write clear requirements and acceptance criteria.
4. Validate token count
   - MCP: `tokens`
   - CLI: `lean-spec tokens <spec>`
5. If >2000 tokens, split or move detail to sub-specs or references.

## Implementation Phase

**Goal:** Execute work while keeping the spec current.

1. Update status to `in-progress` before coding
   - MCP: `update`
   - CLI: `lean-spec update <spec> --status in-progress`
2. Record decisions, constraints, and progress in the spec.
3. Link dependencies as they emerge
   - MCP: `link` / `unlink`
   - CLI: `lean-spec link <spec> --depends-on <other>`

## Validation Phase

**Goal:** Ensure the work meets the spec and quality gates.

1. Check off all acceptance criteria items.
2. Run validation
   - MCP: `validate`
   - CLI: `lean-spec validate`
3. Update status to `complete` only after validation passes.

## Quick Checklist

- Discovery done first
- Spec created or verified
- Status updated before coding
- Decisions documented in spec
- Dependencies linked
- Validation run before completion
