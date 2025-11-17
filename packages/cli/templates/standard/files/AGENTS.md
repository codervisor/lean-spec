# AI Agent Instructions

## Project: {project_name}

Lightweight spec methodology for AI-powered development.

## Core Rules

1. **Read README.md first** - Understand project context
2. **Check specs/** - Review existing specs before starting
3. **Follow LeanSpec principles** - Clarity over documentation
4. **Keep it minimal** - If it doesn't add clarity, cut it
5. **Never use nested code blocks** - Markdown doesn't support code blocks within code blocks. Use indentation or describe the structure instead

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

- `lean-spec stats` - See work distribution across specs
- `lean-spec board` - View specs organized by status
- `lean-spec list --tag=<tag>` - Find specs by tag (e.g., `--tag=api`)
- `lean-spec search "<query>"` - Full-text search across specs
- `lean-spec deps <spec>` - Check dependencies before starting work

These commands help you understand what exists, what's in progress, and what depends on what.

## Essential Commands

**Discovery:**
- `lean-spec list` - See all specs
- `lean-spec search "<query>"` - Find relevant specs

**Viewing specs:**
- `lean-spec view <spec>` - View a spec (formatted)
- `lean-spec view <spec> --raw` - Get raw markdown
- `lean-spec open <spec>` - Open spec in editor
- `lean-spec files <spec>` - List all files in a spec

**Project Overview:**
- `lean-spec board` - Kanban view with project health summary
- `lean-spec stats` - Quick project metrics

**Working with specs:**
- `lean-spec create <name>` - Create a new spec
- `lean-spec update <spec> --status <status>` - Update spec status
- `lean-spec update <spec> --priority <priority>` - Update spec priority
- `lean-spec update <spec> --tags <tag1,tag2>` - Update spec tags
- `lean-spec deps <spec>` - Show dependencies and relationships

**Token Management:**
- `lean-spec tokens <spec>` - Count tokens in a spec
- `lean-spec tokens` - Show token counts for all specs

**When in doubt:** Run `lean-spec --help` or `lean-spec <command> --help` to discover available commands.

## Spec Frontmatter

When creating or updating specs, include YAML frontmatter at the top:

```yaml
---
status: draft|planned|in-progress|complete|blocked|cancelled
created: YYYY-MM-DD
tags: [tag1, tag2]  # helps with discovery
priority: low|medium|high  # helps with planning
assignee: username  # for team coordination
---
```

**Core fields:**
- `status` and `created` are required
- `tags` help with discovery and organization
- `priority` helps teams plan work
- `assignee` shows who's working on what

**Update status with:**
```bash
lean-spec update <spec> --status in-progress --assignee yourname
# or edit frontmatter directly
```

## Workflow

1. **Discover context** - Run `lean-spec stats` or `lean-spec board` to see current state
2. **Search existing specs** - Use `lean-spec search` or `lean-spec list` to find relevant work
3. **Check dependencies** - Run `lean-spec deps <spec>` if working on existing spec
4. **Create or update spec** - Add frontmatter with required fields and helpful metadata
5. **Start work** - **IMMEDIATELY** update status: `lean-spec update <spec> --status in-progress`
6. **Implement changes** - Keep spec in sync as you learn
7. **Complete** - **IMMEDIATELY** update status: `lean-spec update <spec> --status complete`
8. **Archive when done** - `lean-spec archive <spec>` moves to archive
**Status Update Triggers (CRITICAL):**
- ✅ **Before starting implementation** → Update to `in-progress`
- ✅ **Immediately after completing all work** → Update to `complete`
- ✅ **If blocked or paused** → Update status and document why in spec
- ❌ **NEVER skip status updates** - They're required for project tracking

## Quality Standards

- Tests cover critical paths
- No unnecessary complexity
- Documentation where needed (not everywhere)
- Code is clear and maintainable
- Specs stay in sync with implementation
- **Status tracking is mandatory:**
  - Mark spec as `in-progress` BEFORE starting work
  - Mark spec as `complete` IMMEDIATELY after finishing
  - Never leave specs with stale status

---

**Remember**: LeanSpec is a mindset. Adapt these guidelines to what actually helps.
