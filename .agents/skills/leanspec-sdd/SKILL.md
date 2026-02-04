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
- Prefer standard templates and keep scope clear.
- Validate token count using `tokens` (or `lean-spec tokens`).

### 3) Implement
- Update spec status to `in-progress` **before coding**.
- Document decisions and progress **inside the spec** as work happens.
- Link dependencies using `link`/`unlink` as they are discovered.

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
| Dependencies | `deps` | `lean-spec deps <spec>` |
| Relationships | `relationships` | `lean-spec rel <spec>` |
| Link / unlink (deprecated) | `link` / `unlink` | `lean-spec link/unlink <spec> --depends-on <other>` |
| Token count | `tokens` | `lean-spec tokens <spec>` |
| Validate | `validate` | `lean-spec validate` |

## Best Practices (Summary)

- Keep AGENTS.md **project-specific only**; put SDD methodology here.
- Never create spec files manually; use `create`.
- Keep specs short and focused; split when >2000 tokens.
- Always check dependencies and link specs that block each other.
- Document trade-offs and decisions as they happen.

## Choosing Relationship Type

**Parent/Child** = Decomposition (organizational)
- "This spec is a piece of that umbrella's scope"
- Spec doesn't make sense without the parent context
- Parent completes when all children complete

**Depends On** = Blocking (technical)
- "This spec needs that spec done first"
- Specs are independent work items
- Could be completely unrelated areas

**Rule**: Never use both parent AND depends_on for the same spec pair.

**Test**: If the other spec didn't exist, would your spec still make sense?
- NO → Use parent (it's part of that scope)
- YES → Use depends_on (it's just a blocker)

See detailed guidance in:
- [references/WORKFLOW.md](./references/WORKFLOW.md)
- [references/BEST-PRACTICES.md](./references/BEST-PRACTICES.md)
- [references/EXAMPLES.md](./references/EXAMPLES.md)
- [references/COMMANDS.md](./references/COMMANDS.md)

## Compatibility Notes

- Works with any Agent Skills-compatible tool (Claude, Cursor, Codex, Letta, Factory).
- Requires either LeanSpec MCP tools or CLI access to manage specs.
- This skill is additive and does not change existing LeanSpec tooling.
