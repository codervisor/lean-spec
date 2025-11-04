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

## Spec Complexity Guidelines

### Keep Specs Lean

**Single File vs Sub-Specs:**

Keep as **single file** when:
- Under 300 lines
- Can be read/understood in 5-10 minutes
- Single, focused concern
- Implementation plan <6 phases

Consider **splitting** when:
- Over 400 lines
- Multiple distinct concerns (design + config + testing + examples)
- AI tools corrupt the spec during edits
- Updates frequently cause inconsistencies
- Implementation has >6 phases

### Line Count Thresholds

- **<300 lines**: ✅ Ideal, keep as single file
- **300-400 lines**: ⚠️ Warning zone, consider simplifying or splitting
- **>400 lines**: 🔴 Strong candidate for splitting
- **>600 lines**: 🔴 Almost certainly should be split

### Warning Signs

Your spec might be too complex if:
- ⚠️ It takes >10 minutes to read through
- ⚠️ You can't summarize it in 2 paragraphs
- ⚠️ Recent edits caused corruption
- ⚠️ You're scrolling endlessly to find information
- ⚠️ Implementation plan has >8 phases

**Action**: Split using sub-specs (see spec 012), don't just keep growing the file.

### How to Split (See spec 012)

Use sub-spec files for complex features:
- `README.md`: Overview, decision, high-level design
- `DESIGN.md`: Detailed design and architecture
- `IMPLEMENTATION.md`: Implementation plan with phases
- `TESTING.md`: Test strategy and cases
- `CONFIGURATION.md`: Config examples and schemas
- `{CONCERN}.md`: Other specific concerns (API, MIGRATION, etc.)

---

**Remember**: LeanSpec is a mindset, not a rulebook. Use `lspec --help` to discover features as needed.
