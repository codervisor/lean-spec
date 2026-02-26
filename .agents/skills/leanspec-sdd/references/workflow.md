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
5. If >2000 tokens, split into separate files (e.g. DESIGN.md, TESTING.md) or extract to references.

## Implementation Phase

**Goal:** Execute work while keeping the spec current.

1. If draft is enabled, move `draft` → `planned` after review
2. Update status to `in-progress` before coding
   - MCP: `update`
   - CLI: `lean-spec update <spec> --status in-progress`
3. Record decisions, constraints, and progress in the spec.
4. **Set up relationships as they emerge:**
   - If spec is part of an umbrella → use `relationships` with `action=add`, `type=parent` (MCP) / `lean-spec rel add <spec> --parent <parent>` (CLI)
   - If spec is blocked by another independent spec → use `relationships` with `action=add`, `type=depends_on` (MCP) / `lean-spec rel add <spec> --depends-on <other>` (CLI)
   - See SKILL.md "Choosing Relationship Type" for the decision flowchart

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
- Relationships set (parent/child for umbrellas, depends_on for blockers)
- Validation run before completion
