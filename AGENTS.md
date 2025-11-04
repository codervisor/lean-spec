# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## Core Rules

1. **Read README.md first** - Understand project context
2. **Check specs/** - Review existing specs before starting
3. **Use `lspec --help`** - When unsure about commands, check the built-in help
4. **Follow LeanSpec principles** - Clarity over documentation
5. **Keep it minimal** - If it doesn't add clarity, cut it

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

**Discovery:**
- `lspec list` - See all specs
- `lspec search "<query>"` - Find relevant specs

**Viewing specs:**
- `lspec view <spec>` - View a spec (formatted)
- `lspec view <spec> --raw` - Get raw markdown (for parsing)
- `lspec view <spec> --json` - Get structured JSON
- `lspec open <spec>` - Open spec in editor

**Project Overview:**
- `lspec board` - Kanban view with project health summary
- `lspec stats` - Quick project metrics and insights
- `lspec stats --full` - Detailed analytics (all sections)

**Working with specs:**
- `lspec create <name>` - Create a new spec
- `lspec update <spec> --status <status>` - Update spec status

**When in doubt:** Run `lspec --help` or `lspec <command> --help` to discover available commands and options.

## SDD Workflow

1. **Discover** - Check existing specs with `lspec list`
2. **Plan** - Create spec with `lspec create <name>` when needed
3. **Implement** - Write code, keep spec in sync as you learn
4. **Update** - Mark progress with status updates
5. **Complete** - Archive or mark complete when done

## Quality Standards

- Code is clear and maintainable
- Tests cover critical paths
- Specs stay in sync with implementation

---

**Remember**: LeanSpec is a mindset, not a rulebook. Use `lspec --help` to discover features as needed.
