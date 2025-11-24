# AI Agent Instructions

## Project: {project_name}

Lightweight spec methodology for AI-powered development.

## Core Rules

1. **Read README.md first** - Understand project context
2. **Check specs/** - Review existing specs before starting
3. **Use `lean-spec --help`** - When unsure about commands, check the built-in help
4. **Follow LeanSpec principles** - Clarity over documentation
5. **Keep it minimal** - If it doesn't add clarity, cut it
6. **NEVER manually edit system-managed frontmatter** - Fields like `status`, `priority`, `tags`, `assignee`, `transitions`, `created_at`, `updated_at`, `completed_at`, `depends_on`, `related` are system-managed. Always use `lean-spec update`, `lean-spec link`, `lean-spec unlink`, or `lean-spec create` commands. Manual edits will cause metadata corruption and tracking issues.
7. **Never use nested code blocks** - Markdown doesn't support code blocks within code blocks. If you need to show code examples in documentation, use indentation or describe the structure instead of nesting backticks.

## When to Use Specs

Write a spec for:
- Features affecting multiple parts of the system
- Breaking changes or significant refactors
- Design decisions needing team alignment

Skip specs for:
- Bug fixes
- Trivial changes
- Self-explanatory refactors

## Essential Commands

**Quick Reference** (for full details, see `lean-spec --help`):

**Discovery:**
- `lean-spec list` - See all specs
- `lean-spec search "<query>"` - Find relevant specs

**Working with specs:**
- `lean-spec create <name>` - Create new spec
- `lean-spec update <spec> --status <status>` - Update status (REQUIRED - never edit frontmatter manually)
- `lean-spec update <spec> --priority <priority>` - Update priority
- `lean-spec deps <spec>` - Show dependency graph
- `lean-spec tokens <spec>` - Count tokens for context management

**Project overview:**
- `lean-spec board` - Kanban view with project health
- `lean-spec stats` - Quick project metrics

**When in doubt:** Run `lean-spec --help` or `lean-spec <command> --help` to discover commands.

## Spec Relationships

LeanSpec has two types of relationships:

### `related` - Bidirectional Soft Reference
Informational relationship between specs. Automatically shown from both sides.

**Use when:** Specs cover related topics, work is coordinated but not blocking.

### `depends_on` - Directional Blocking Dependency
Hard dependency - spec cannot start until dependencies complete.

**Use when:** Spec truly cannot start until another completes, work order matters.

**Best Practice:** Use `related` by default. Reserve `depends_on` for true blocking dependencies.

## SDD Workflow

1. **Discover** - Check existing specs with `lean-spec list`
2. **Plan** - Create spec with `lean-spec create <name>` (status: `planned`)
3. **Start Work** - Run `lean-spec update <spec> --status in-progress` before implementing
4. **Implement** - Write code/docs, keep spec in sync as you learn
5. **Complete** - Run `lean-spec update <spec> --status complete` after implementation done
6. **Document** - Report progress and document changes into the spec

**CRITICAL - What "Work" Means:**
- ❌ **NOT**: Creating/writing the spec document itself
- ✅ **YES**: Implementing what the spec describes (code, docs, features, etc.)

**Frontmatter Editing Rules:**
- **NEVER manually edit**: `status`, `priority`, `tags`, `assignee`, `transitions`, timestamps, `depends_on`, `related`
- **Use CLI commands**: `lean-spec update`, `lean-spec link`, `lean-spec unlink`

**Note on Archiving**: Archive specs when they're no longer actively referenced (weeks/months after completion), not immediately. Use `lean-spec archive <spec>` to move old/stale specs to `archived/` directory.

## Quality Standards

- Code is clear and maintainable
- Tests cover critical paths
- Specs stay in sync with implementation
- **Status tracking is mandatory:**
  - Specs start as `planned` after creation
  - Mark `in-progress` BEFORE starting implementation work
  - Mark `complete` AFTER implementation is finished
  - **Remember**: Status tracks implementation, not spec document completion
  - Never leave specs with stale status

## Spec Complexity Guidelines

**Token Thresholds:**
- **<2,000 tokens**: ✅ Optimal
- **2,000-3,500 tokens**: ✅ Good
- **3,500-5,000 tokens**: ⚠️ Warning - Consider splitting
- **>5,000 tokens**: 🔴 Should split

**Check with:** `lean-spec tokens <spec>`

**When to split:** >3,500 tokens, multiple concerns, takes >10 min to read

**How to split:** Use sub-specs or split into related specs with `lean-spec link --related`

---

**Remember**: LeanSpec is a mindset, not a rulebook. When in doubt, keep it simple and use `lean-spec --help` to discover features as needed.
