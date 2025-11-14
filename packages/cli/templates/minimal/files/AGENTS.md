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
- Design decisions that need thinking through
- Complex features that benefit from upfront planning

Skip specs for:
- Bug fixes
- Trivial changes
- Self-explanatory refactors

## Discovery Commands

Before starting work, understand project context:

- `lean-spec stats` - See work distribution
- `lean-spec board` - View specs by status
- `lean-spec search "<query>"` - Find relevant work
- `lean-spec list` - List all specs

These help you understand what exists and what's in progress.

## Essential Commands

**Discovery:**
- `lean-spec list` - See all specs
- `lean-spec search "<query>"` - Find relevant specs

**Viewing specs:**
- `lean-spec view <spec>` - View a spec
- `lean-spec open <spec>` - Open spec in editor

**Working with specs:**
- `lean-spec create <name>` - Create a new spec
- `lean-spec update <spec> --status <status>` - Update spec status

**When in doubt:** Run `lean-spec --help` to see all available commands.

## Spec Frontmatter

When creating or updating specs, add YAML frontmatter at the top:

```yaml
---
status: draft|planned|in-progress|complete|blocked|cancelled
created: YYYY-MM-DD
---
```

**Keep it simple:**
- Just `status` and `created` fields
- Other fields are optional - only add if helpful
- Update `status` as work progresses

**Update status with:**
```bash
lean-spec update <spec> --status in-progress
```

## Workflow

1. **Check existing work** - Run `lean-spec board` or `lean-spec search`
2. **Create or update spec** - Add frontmatter with `status` and `created`
3. **Implement changes** - Keep spec in sync as you learn
4. **Update status** - Mark progress: `draft` → `in-progress` → `complete`
5. **Archive when done** - `lean-spec archive <spec>` moves to archive

## Quality Standards

- Code is clear and maintainable
- Tests cover critical paths
- No unnecessary complexity
- Documentation where needed (not everywhere)
- Specs stay in sync with implementation

---

**Remember**: LeanSpec is a mindset. Adapt these guidelines to what actually helps.
