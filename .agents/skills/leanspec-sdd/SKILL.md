---
name: leanspec-sdd
description: Spec-Driven Development methodology for AI-assisted development. Use when working in a LeanSpec project.
compatibility: Requires lean-spec CLI or @leanspec/mcp server
metadata:
  author: LeanSpec
  version: 0.2.23
  homepage: https://leanspec.dev
---

# LeanSpec SDD Skill

Teach agents how to run Spec-Driven Development (SDD) in LeanSpec projects. This skill is an addon: it **does not replace** MCP or CLI tools.

## When to Use This Skill

Activate this skill when any of the following are true:
- The repository contains a specs/ folder or .lean-spec/config.json
- The user mentions LeanSpec, specs, SDD, or spec-driven planning
- The task requires multi-step changes, breaking changes, or design decisions

## Core Principles

1. **Context Economy**: Keep specs under 2000 tokens when possible. Split large specs.
2. **Discovery First**: Always run board/search before creating new specs.
3. **Intent Over Implementation**: Capture why first, then how.
4. **Progressive Disclosure**: Keep SKILL.md concise; use references for details.
5. **No Manual Frontmatter**: Use tools to update status, tags, dependencies.
6. **Verify Against Reality**: When asked about completion or progress, check the actual codebase, commits, and changes—not just the spec status.

## Core SDD Workflow

### 1) Discover
- Get the project state: run `board` (or `lean-spec board`).
- Search for related work before creating anything: `search` (or `lean-spec search "query"`).

### 2) Design
- If a spec is needed, create it with `create` (or `lean-spec create`).
- **Populate all known fields in the `create` call itself** — pass `title`, `content`, `priority`, `tags`, etc. directly. Do NOT create an empty spec and then populate it with a follow-up `update` call.
- Prefer standard templates and keep scope clear.
- Validate token count using `tokens` (or `lean-spec tokens`).

### 3) Implement
- If `draft` is enabled, move `draft` → `planned` once the spec is reviewed, then set `in-progress` **before coding**.
- Skipping `planned` from `draft` requires a `--force` override (CLI/MCP/UI).
- Document decisions and progress **inside the spec** as work happens.
- Set up relationships as discovered: use `relationships` with `action=add` and `type=parent` for umbrella children, `type=depends_on` for blockers (see "Choosing Relationship Type" below).

### 4) Validate & Complete
- Run `validate` (or `lean-spec validate`) before completion.
- Ensure all checklist items are checked.
- **Verify actual implementation**: When asked about completion status or progress:
  - Check git commits and file changes
  - Review actual code implementations
  - Verify test coverage and results
  - Don't rely solely on spec status field
- Update status to `complete` only when both spec criteria **and** actual implementation are verified.

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
| Dependency graph | _(no dedicated MCP tool)_ | `lean-spec deps <spec>` |
| List children | `relationships` (`action=view`) | `lean-spec children <parent>` |
| Token count | `tokens` | `lean-spec tokens <spec>` |
| Validate | `validate` | `lean-spec validate` |
| Stats | `stats` | `lean-spec stats` |

## Choosing Relationship Type

**IMPORTANT**: This is a critical decision. Read carefully before linking specs.

### Parent/Child (Umbrella Decomposition)

Use when a large initiative is **broken into child specs** that together form the whole.

- "This spec is a piece of that umbrella's scope"
- Child spec doesn't make sense without parent context
- Parent completes when **all children** complete
- Children share the parent's theme/goal

**Tools**: `relationships` with `action=add`, `type=parent`, `target=<parent>` (MCP) / `lean-spec rel add <child> --parent <parent>` (CLI)
**View children**: `relationships` with `action=view` (read `hierarchy.children`) (MCP) / `lean-spec children <parent>` (CLI)

**Example**: "CLI UX Overhaul" umbrella with children: "Help System", "Error Messages", "Progress Indicators"

### Depends On (Technical Blocker)

Use when a spec **cannot start** until another independent spec is done first.

- "This spec needs that spec done first"
- Both specs are **independent work items** with separate goals
- Could be in completely unrelated areas
- Removal of the dependency doesn't change the spec's scope

**Tools**: `relationships` with `action=add`, `type=depends_on`, `target=<other>` (MCP) / `lean-spec rel add <spec> --depends-on <other>` (CLI)
**Remove**: `relationships` with `action=remove`, `type=depends_on`, `target=<other>` (MCP) / `lean-spec rel rm <spec> --depends-on <other>` (CLI)

**Example**: "Search API" depends on "Database Schema Migration"

### Decision Flowchart

1. **Is spec B part of spec A's scope?** → Parent/child (`relationships` + `type=parent`)
2. **Does spec B just need spec A finished first?** → Depends on (`relationships` + `type=depends_on`)
3. **Never use both** parent AND depends_on for the same spec pair.

**Litmus test**: If spec A didn't exist, would spec B still make sense?
- **NO** → B is a child of A → use `relationships` (`action=add`, `type=parent`)
- **YES** → B depends on A → use `relationships` (`action=add`, `type=depends_on`)

### Umbrella Workflow

When breaking a large initiative into child specs:
1. Create the umbrella spec: `create`
2. Create each child spec: `create`
3. Assign children to parent: `relationships` (`action=add`, `type=parent`) for each child
4. Verify structure: `relationships` (`action=view`) or `children` on CLI
5. Add cross-cutting deps between children if needed: `relationships` (`action=add`, `type=depends_on`)

## Best Practices (Summary)

- Keep AGENTS.md **project-specific only**; put SDD methodology here.
- Never create spec files manually; use `create`.
- **Always pass `content`, `title`, and all known fields in the `create` call** — never create an empty spec then edit it.
- Keep specs short and focused; split when >2000 tokens.
- **Use parent/child for umbrella decomposition**, depends_on for technical blockers.
- Document trade-offs and decisions as they happen.

See detailed guidance in:
- [references/workflow.md](./references/workflow.md)
- [references/best-practices.md](./references/best-practices.md)
- [references/examples.md](./references/examples.md)
- [references/commands.md](./references/commands.md)

## Compatibility Notes

- Works with any Agent Skills-compatible tool (Claude, Cursor, Codex, Letta, Factory).
- Requires either LeanSpec MCP tools or CLI access to manage specs.
- This skill is additive and does not change existing LeanSpec tooling.
