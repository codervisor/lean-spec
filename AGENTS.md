# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## Core Rules

1. **Read README.md first** - Understand project context
2. **Check specs/** - Review existing specs before starting
3. **Follow LeanSpec principles** - Clarity over documentation
4. **Keep it minimal** - If it doesn't add clarity, cut it

## When to Use Specs

- Features that affect multiple parts of the system
- Breaking changes or significant refactors
- Design decisions that need team alignment
- Complex features that benefit from upfront thinking

Skip specs for:
- Bug fixes
- Trivial changes
- Self-explanatory refactors

## Discovery Commands

Before starting work, understand project context:

- `lspec stats` - See work distribution across specs
- `lspec board` - View specs organized by status
- `lspec list --tag=<tag>` - Find specs by tag (e.g., `--tag=api`)
- `lspec search "<query>"` - Full-text search across specs
- `lspec deps <spec>` - Check dependencies before starting work

These commands help you understand what exists, what's in progress, and what depends on what.

## Spec Frontmatter

When creating or updating specs, include YAML frontmatter at the top:

```yaml
---
status: draft|planned|in-progress|complete|blocked|cancelled
created: YYYY-MM-DD
tags: [tag1, tag2]  # optional but helpful
priority: low|medium|high  # optional
---
```

**Keep it minimal:**
- `status` and `created` are the core fields
- Add `tags` and `priority` when they add clarity
- Update `status` as work progresses

**Update status with:**
```bash
lspec update <spec> --status in-progress
# or edit frontmatter directly
```

## Workflow

1. **Discover context** - Run `lspec stats` or `lspec board` to see current state
2. **Search existing specs** - Use `lspec search` or `lspec list` to find relevant work
3. **Check dependencies** - Run `lspec deps <spec>` if working on existing spec
4. **Create or update spec** - Add frontmatter with `status` and `created`
5. **Implement changes** - Keep spec in sync as you learn
6. **Update status** - Mark progress: `draft` → `in-progress` → `complete`
7. **Archive when done** - `lspec archive <spec>` moves to archive

## Quality Standards

- Code is clear and maintainable
- Tests cover critical paths
- No unnecessary complexity
- Documentation where needed (not everywhere)
- Specs stay in sync with implementation

---

**Remember**: LeanSpec is a mindset. Adapt these guidelines to what actually helps.
