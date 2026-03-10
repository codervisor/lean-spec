---
name: leanspec-sdd
description: Spec-Driven Development methodology for AI-assisted development. Use when working with specs, planning features, creating/implementing/refining/organizing specs, checking progress, updating specs, task breakdowns, design decisions, or any task involving a specs/ folder or .lean-spec/config.json.
---

# LeanSpec SDD Skill

Teach agents how to run Spec-Driven Development (SDD) in LeanSpec projects. This skill is an addon: it **does not replace** MCP or CLI tools.

## Core Principles

1. **Context Economy**: Keep specs under 2000 tokens when possible. Split large specs.
2. **Discovery First**: Always run board/search before creating new specs.
3. **Intent Over Implementation**: Capture why first, then how.
4. **No Manual Frontmatter**: Use tools to update status, tags, dependencies.
5. **Verify Against Reality**: Check actual codebase, commits, and changes—not just spec status.

---

## SDD Lifecycle

### 1. Discover

Before creating or modifying anything:

- Run `board` to see current project state and identify gaps
- Run `search "relevant keywords"` to find related specs
- If similar spec exists, consider extending it or linking as dependency

### 2. Create Spec

Use `create` tool (preferred) or `lean-spec create "spec-name"`.

**Always pass all known fields in the `create` call** — `title`, `content`, `priority`, `tags`, etc. Never create empty specs then populate with follow-up `update`.

**Gather requirements first:**

- **Problem/Goal**: What needs to be solved?
- **Scope**: What's in and out?
- **Success Criteria**: How do we know it's done?
- **Dependencies**: What needs to exist first?

**Naming conventions:** kebab-case, descriptive — `user-auth-oauth-integration`, not `bug-fix`.

**Quality content sections:**

1. **Overview** (1-3 sentences) — problem and importance
2. **Requirements** — `- [ ]` checklist, independently verifiable items
3. **Non-Goals** — prevents scope creep
4. **Technical Notes** (optional) — architecture, APIs
5. **Acceptance Criteria** — measurable success conditions

**After creation:**

- Link relationships (parent, depends_on) — see "Choosing Relationship Type"
- Run `validate` to check quality; check `tokens` — keep under 2000

### 3. Refine Spec

Pre-implementation research to ensure the spec is implementation-ready. Use when spec is drafted and approaching `in-progress`.

**Research the codebase:**

- Search for files/modules mentioned in the spec
- Find existing patterns to follow
- Locate integration points; review test patterns

**Validate technical approach:**

- Do referenced files/APIs exist?
- Are proposed interfaces compatible?
- Does architecture match current patterns?
- Are there existing solutions to leverage?

**Update spec with findings:**

- Specific file paths to modify
- Exact function/class names and API signatures
- Existing code to reuse; edge cases and blockers

**Readiness checklist:**

- [ ] All referenced code paths verified
- [ ] Technical approach validated against codebase
- [ ] Dependencies confirmed available
- [ ] No blocking unknowns remain
- [ ] Checklist items are specific and actionable

### 4. Implement Spec

**Before starting:**

- Use `view <spec>` — includes parent, children, depends_on, required_by
- Set status to `in-progress`: `update <spec> --status in-progress`
- ⚠️ Do NOT call `list`, `list_children`, or `list_umbrellas` — `view` provides all relationships
- If `draft` is enabled, move `draft` → `planned` first (skipping requires `--force`)

**For umbrella specs:** Implement children first; parent completes when all children complete.

**For child specs:** Complete independently once requirements are met.

**During implementation:**

- Follow spec's checklist items in order
- Stay within defined scope boundaries
- Run tests frequently
- Document discoveries in the spec

**Verification (MANDATORY — do NOT skip):**

```bash
pnpm typecheck    # Zero type errors
pnpm test         # All tests pass
pnpm lint         # No lint errors
lean-spec validate
```

All must pass before marking complete. If any fail, fix and re-run.

**Completing:**

1. Mark all checklist items as done
2. Add implementation notes if needed
3. Set status to `complete`: `update <spec> --status complete`

### 5. Check Progress

Verify spec completion against actual implementation.

**Extract from spec:** checklist items, acceptance criteria, scope boundaries, technical requirements.

**Verify against codebase:**

```bash
git log --oneline --since="<spec-created-date>" -- <relevant-paths>
```

- Verify new files/modules exist
- Read actual code to verify it matches spec design
- Check test coverage for spec requirements
- Run `pnpm test`

**For each checklist item:**

1. Determine if verifiable via code, tests, or manual check
2. Search codebase for evidence of completion
3. Mark complete only if implementation is verified

**Update status** based on findings. Never trust status alone — always verify against actual code.

---

## Managing Specs

### Updating Specs

Use during draft/revision phase when requirements are evolving.

**Content updates** (edit spec file):

- Add/remove requirements (`- [ ]` items)
- Clarify scope and non-goals
- Update technical approach
- Document decisions with rationale

**Metadata updates** (use tools):

- Status: `update <spec> --status <status>`
- Dependencies: `relationships` with `action=add`, `type=depends_on`
- Parent: `relationships` with `action=add`, `type=parent`

**Handling scope creep:**

1. Evaluate fit — does it belong in this spec?
2. Split if needed — create new spec for out-of-scope work
3. Link appropriately (parent or depends_on)
4. Update original non-goals to reference new spec

### Organizing Specs

Use when specs need structure, relationships are unclear, or project board is cluttered.

**Survey first:**

- `board` — specs by status
- `board --group-by priority` — priority imbalances
- `board --group-by parent` — hierarchy
- `stats` — overall health

**Patterns to look for:**

| Pattern | Action |
|---------|--------|
| 3+ related specs, no parent | Create umbrella and group |
| Spec can't start without another | Add `depends_on` |
| Completed spec still `in-progress` | Update status |
| Low-value spec, no activity | Archive |
| Large spec (>2000 tokens) | Split into parent + children |
| Duplicate/overlapping specs | Merge or archive redundant one |

**Status definitions:**

| Status | Meaning |
|--------|---------|
| `planned` | Defined, work not started |
| `in-progress` | Active development |
| `complete` | All requirements verified |
| `archived` | No longer relevant |

**Priority levels:**

| Priority | When to Use |
|----------|-------------|
| `critical` | Blocking release or breaking production |
| `high` | Important for current milestone |
| `medium` | Standard priority (default) |
| `low` | Nice-to-have, backlog |

**Bulk organization checklist:**

- Review `board` for misplaced/stale specs
- Group related specs under umbrellas
- Add missing `depends_on` links
- Correct stale statuses
- Adjust priorities to match current goals
- Archive obsolete specs
- Run `validate` and `stats` after changes

---

## Tool Reference

Use MCP tools when available. Use CLI as fallback.

| Action | MCP Tool | CLI Command |
| --- | --- | --- |
| Project status | `board` | `lean-spec board` |
| List specs | `list` | `lean-spec list` |
| Search specs | `search` | `lean-spec search "query"` |
| View spec | `view` | `lean-spec view <spec>` |
| Create spec | `create` | `lean-spec create <name>` |
| Update status | `update` | `lean-spec update <spec> --status <status>` |
| View relationships | `relationships` | `lean-spec rel <spec>` |
| Set parent | `relationships` (`action=add`, `type=parent`) | `lean-spec rel add <child> --parent <parent>` |
| Add child | `relationships` (`action=add`, `type=child`) | `lean-spec rel add <parent> --child <child>` |
| Add dependency | `relationships` (`action=add`, `type=depends_on`) | `lean-spec rel add <spec> --depends-on <other>` |
| Remove dependency | `relationships` (`action=remove`, `type=depends_on`) | `lean-spec rel rm <spec> --depends-on <other>` |
| Dependency graph | `deps` | `lean-spec deps <spec>` |
| List children | `children` | `lean-spec children <parent>` |
| Token count | `tokens` | `lean-spec tokens <spec>` |
| Validate | `validate` | `lean-spec validate` |
| Stats | `stats` | `lean-spec stats` |

## Choosing Relationship Type

**IMPORTANT**: Critical decision. Read carefully before linking specs.

### Parent/Child (Umbrella Decomposition)

Use when a large initiative is **broken into child specs** that together form the whole.

- "This spec is a piece of that umbrella's scope"
- Child spec doesn't make sense without parent context
- Parent completes when **all children** complete

**Tools**: `relationships` with `action=add`, `type=parent`, `target=<parent>` (MCP) / `lean-spec rel add <child> --parent <parent>` (CLI)

**Example**: "CLI UX Overhaul" umbrella → children: "Help System", "Error Messages", "Progress Indicators"

### Depends On (Technical Blocker)

Use when a spec **cannot start** until another independent spec is done first.

- "This spec needs that spec done first"
- Both specs are **independent work items** with separate goals
- Removal of the dependency doesn't change the spec's scope

**Tools**: `relationships` with `action=add`, `type=depends_on`, `target=<other>` (MCP) / `lean-spec rel add <spec> --depends-on <other>` (CLI)
**Remove**: `relationships` with `action=remove`, `type=depends_on` (MCP) / `lean-spec rel rm <spec> --depends-on <other>` (CLI)

**Example**: "Search API" depends on "Database Schema Migration"

### Decision Flowchart

1. **Is spec B part of spec A's scope?** → Parent/child (`type=parent`)
2. **Does spec B just need spec A finished first?** → Depends on (`type=depends_on`)
3. **Never use both** parent AND depends_on for the same spec pair.

**Litmus test**: If spec A didn't exist, would spec B still make sense?
- **NO** → B is a child of A
- **YES** → B depends on A

### Umbrella Workflow

1. Create the umbrella spec: `create`
2. Create each child spec: `create`
3. Assign children: `relationships` (`action=add`, `type=parent`) for each child
4. Verify structure: `children`
5. Add cross-cutting deps if needed: `relationships` (`action=add`, `type=depends_on`)

---

## Best Practices

- Never create spec files manually; use `create`.
- **Always pass all known fields in the `create` call** — never create empty then edit.
- Keep specs short and focused; split when >2000 tokens.
- **Search first** — never create duplicates; link related specs instead.
- **Checkboxes only for actions** — use plain lists for non-actionable items.
- **Use parent/child for decomposition**, depends_on for blockers.
- **Archive, don't delete** — preserve history.
- **Survey before organizing** — use `board` and `stats` first.
- **Research before implementing** — refine specs to avoid surprises.
- **Verify before completing** — `pnpm typecheck`, `pnpm test`, `pnpm lint` must ALL pass.
- Document trade-offs and decisions as they happen.
- Out-of-scope discoveries become new specs, not scope creep.

See detailed guidance in:
- [references/workflow.md](./references/workflow.md)
- [references/best-practices.md](./references/best-practices.md)
- [references/examples.md](./references/examples.md)
- [references/commands.md](./references/commands.md)

