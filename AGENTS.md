# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## First Principles (Decision Framework)

When making spec decisions, apply these principles in priority order:

### 1. Context Economy - Fit in working memory
**Specs must fit in working memory—both human and AI.**

- **Target**: <300 lines per spec file
- **Warning**: 300-400 lines (consider simplifying)
- **Problem**: >400 lines (must split)
- **Question**: "Can this be read in 5-10 minutes?"
- **Action**: Split at 400 lines, warning at 300
- **Why**: Physics (context windows), biology (working memory), economics (token costs)

### 2. Signal-to-Noise Maximization - Every word informs decisions
**Every word must inform decisions or be cut.**

- **Test**: "What decision does this sentence inform?"
- **Cut**: Obvious, inferable, or "maybe future" content
- **Keep**: Decision rationale, constraints, success criteria
- **Action**: Remove anything that doesn't answer the test question
- **Why**: Cognitive load, token costs, maintenance burden

### 3. Intent Over Implementation - Capture why, not just how
**Capture "why" and "what," let "how" emerge.**

- **Must have**: Problem, intent, success criteria
- **Should have**: Design rationale, trade-offs
- **Could have**: Implementation details, examples
- **Question**: "Is the rationale clear?"
- **Action**: Explain trade-offs, constraints, success criteria
- **Why**: Intent is stable, implementation changes, AI needs why

### 4. Bridge the Gap - Both human and AI must understand
**Specs exist to align human intent with machine execution.**

- **For humans**: Overview, context, rationale
- **For AI**: Unambiguous requirements, clear structure, examples
- **Both must understand**: Use clear structure + natural language
- **Question**: "Can both parse and reason about this?"
- **Action**: Clear structure + natural language explanation
- **Why**: Gap between human goals and machine execution must be bridged

### 5. Progressive Disclosure - Add complexity when pain is felt
**Start simple, add structure only when pain is felt.**

- **Solo dev**: Just status + created
- **Feel pain?**: Add tags, priority, custom fields
- **Never add**: "Just in case" features
- **Question**: "Do we need this now?"
- **Action**: Start minimal, add fields when required
- **Why**: Teams evolve, requirements emerge, premature abstraction is waste

### Conflict Resolution Examples

When practices conflict, apply principles in priority order:

**"Should I split this 450-line spec?"**
→ **Yes** (Context Economy at 400 lines overrides completeness)

**"Should I document every edge case?"**
→ **Only if it informs current decisions** (Signal-to-Noise test)

**"Should I add custom fields upfront?"**
→ **Only if you feel pain without them** (Progressive Disclosure)

**"Should I keep implementation details in spec?"**
→ **Only if rationale/constraints matter** (Intent Over Implementation)

**"This spec is complex but under 350 lines, split it?"**
→ **No** (Under Context Economy threshold, no split needed)

**"Which is more important: Complete documentation or staying under 400 lines?"**
→ **Staying under 400 lines** (Context Economy is #1 principle)

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

### Keep Specs Lean (Context Economy in Practice)

**Single File vs Sub-Specs:**

Keep as **single file** when:
- Under 300 lines (Context Economy: fits in working memory)
- Can be read/understood in 5-10 minutes (attention span)
- Single, focused concern (Signal-to-Noise: one clear topic)
- Implementation plan <6 phases (cognitive load manageable)

Consider **splitting** when:
- Over 400 lines (Context Economy: exceeds working memory)
- Multiple distinct concerns (Signal-to-Noise: multiple topics reduce clarity)
- AI tools corrupt the spec during edits (context window overflow)
- Updates frequently cause inconsistencies (too complex to maintain)
- Implementation has >6 phases (Intent: breaks down into sub-problems)

### Line Count Thresholds (Context Economy Enforcement)

- **<300 lines**: ✅ Ideal, keep as single file
- **300-400 lines**: ⚠️ Warning zone, consider simplifying or splitting
- **>400 lines**: 🔴 Strong candidate for splitting (Context Economy violated)
- **>600 lines**: 🔴 Almost certainly should be split

**Rationale**: These thresholds come from Context Economy—the fundamental constraint that specs must fit in working memory (human + AI). Violating this makes specs hard to read, prone to errors, and difficult to maintain.

### Warning Signs

Your spec might be too complex if:
- ⚠️ It takes >10 minutes to read through (Context Economy)
- ⚠️ You can't summarize it in 2 paragraphs (Signal-to-Noise)
- ⚠️ Recent edits caused corruption (context window overflow)
- ⚠️ You're scrolling endlessly to find information (Progressive Disclosure: needs sub-specs)
- ⚠️ Implementation plan has >8 phases (Intent: should break into smaller specs)

**Action**: Split using sub-specs (see spec 012-sub-spec-files). This applies Progressive Disclosure—add complexity (sub-specs) when pain is felt.

### How to Split (See spec 012-sub-spec-files)

Use sub-spec files for complex features:
- `README.md`: Overview, decision, high-level design
- `DESIGN.md`: Detailed design and architecture
- `IMPLEMENTATION.md`: Implementation plan with phases
- `TESTING.md`: Test strategy and cases
- `CONFIGURATION.md`: Config examples and schemas
- `{CONCERN}.md`: Other specific concerns (API, MIGRATION, etc.)

---

**Remember**: LeanSpec is a mindset, not a rulebook. When in doubt, apply the first principles in order: Context Economy → Signal-to-Noise → Intent Over Implementation → Bridge the Gap → Progressive Disclosure. Use `lspec --help` to discover features as needed.
