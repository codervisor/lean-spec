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
- **Question**: "Can this be read in 5-10 minutes? Can you hold the entire structure in your head?"
- **Action**: Split at 400 lines, warning at 300
- **Why**: Not about exceeding token limits—it's about **attention and cognitive capacity**. Even within token limits, AI performance degrades with longer context (quality drops beyond 50K tokens despite 200K limits). Humans can't hold >7 concepts in working memory. **Attention is the scarce resource, not storage.**

### 2. Signal-to-Noise Maximization - Every word informs decisions
**Every word must inform decisions or be cut.**

- **Test**: "What decision does this sentence inform?"
- **Cut**: Obvious, inferable, or "maybe future" content
- **Keep**: Decision rationale, constraints, success criteria
- **Action**: Remove anything that doesn't answer the test question
- **Why**: While Context Economy asks "Can you hold it all?", Signal-to-Noise asks "Is each piece worth holding?" Cognitive load, token costs, and maintenance burden all penalize low-value content.

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
6. **NEVER manually edit system-managed frontmatter** - Fields like `status`, `priority`, `tags`, `assignee`, `transitions`, `created_at`, `updated_at`, `completed_at` are system-managed. Always use `lspec update` or `lspec create` commands. Manual edits will cause metadata corruption and tracking issues. **Exception**: Relationship fields (`depends_on`, `related`) must currently be edited manually as no CLI command exists yet.
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

**Discovery:
- `lean-spec list` - See all specs
- `lean-spec search "<query>"` - Find relevant specs

**Viewing specs:**
- `lean-spec view <spec>` - View a spec (formatted)
- `lean-spec view <spec>/DESIGN.md` - View sub-spec file (DESIGN.md, TESTING.md, etc.)
- `lean-spec view <spec> --raw` - Get raw markdown (for parsing)
- `lean-spec view <spec> --json` - Get structured JSON
- `lean-spec open <spec>` - Open spec in editor
- `lean-spec files <spec>` - List all files in a spec (including sub-specs)

**Project Overview:**
- `lean-spec board` - Kanban view with project health summary
- `lean-spec stats` - Quick project metrics and insights
- `lean-spec stats --full` - Detailed analytics (all sections)

**Working with specs:**
- `lean-spec create <name>` - Create a new spec
- `lean-spec update <spec> --status <status>` - Update spec status (REQUIRED - never edit frontmatter manually)
- `lean-spec update <spec> --priority <priority>` - Update spec priority (REQUIRED - never edit frontmatter manually)
- `lean-spec update <spec> --tags <tag1,tag2>` - Update spec tags (REQUIRED - never edit frontmatter manually)
- `lean-spec update <spec> --assignee <name>` - Update spec assignee (REQUIRED - never edit frontmatter manually)
- `lean-spec deps <spec>` - Show dependencies and relationships

**When in doubt:** Run `lean-spec --help` or `lean-spec <command> --help` to discover available commands and options.

## Understanding Spec Relationships

LeanSpec has two types of relationships between specs:

### `related` - Bidirectional Soft Reference
**Meaning**: Informational relationship between specs (they're related/connected)
**Behavior**: Automatically shown from both sides
**Symbol**: ⟷ (bidirectional arrow)

**Example:**
```yaml
# Spec 042
related: [043]

# Spec 043 doesn't need to list 042
```

Both `lean-spec deps 042` and `lean-spec deps 043` will show the relationship:
```bash
$ lean-spec deps 042
Related Specs:
  ⟷ 043-official-launch-02 [in-progress]

$ lean-spec deps 043  
Related Specs:
  ⟷ 042-mcp-error-handling [complete]  # Automatically shown!
```

**Use when:**
- Specs cover related topics or features
- Work is coordinated but not blocking
- Context is helpful but not required

### `depends_on` - Directional Blocking Dependency
**Meaning**: Hard dependency - spec cannot start until dependencies complete
**Behavior**: Directional only (shows differently from each side)
**Symbol**: → (depends on) and ← (blocks)

**Example:**
```yaml
# Spec A
depends_on: [spec-b]
```

```bash
$ lean-spec deps spec-a
Depends On:
  → spec-b [in-progress]  # A depends on B

$ lean-spec deps spec-b
Required By:
  ← spec-a [planned]  # B is required by A
```

**Use when:**
- Spec truly cannot start until another completes
- There's a clear dependency chain
- Work must be done in specific order

### Best Practices

1. **Use `related` by default** - It's simpler and matches most use cases
2. **Reserve `depends_on` for true blocking dependencies** - When work order matters
## SDD Workflow

1. **Discover** - Check existing specs with `lean-spec list`
2. **Plan** - Create spec with `lean-spec create <name>` when needed
3. **Implement** - Write code, keep spec in sync as you learn
4. **Update** - Mark progress with `lean-spec update <spec> --status <status>` (NEVER edit system-managed frontmatter directly)
5. **Complete** - Mark complete with `lean-spec update <spec> --status complete`

**Critical - Frontmatter Editing Rules**:

**NEVER manually edit these system-managed fields:**
- `status`, `priority`, `tags`, `assignee` - Use `lspec update` commands only
- `transitions`, `created_at`, `updated_at`, `completed_at` - Automatically managed by the system
- Manual edits will corrupt metadata, break tracking, and cause validation failures

**Currently MUST manually edit these relationship fields:**
- `depends_on`, `related` - No CLI command exists yet, edit frontmatter directly
- Be careful with syntax and use `lean-spec deps <spec>` to verify relationships
5. **Complete** - Archive or mark complete when done

## Quality Standards

- Code is clear and maintainable
- Tests cover critical paths
- Specs stay in sync with implementation
- **Always validate before completing work:**
  - Run `npx lean-spec validate` to check spec structure and frontmatter
  - Run `cd docs-site && npm run build` to ensure documentation site builds successfully
  - Fix any validation errors or build failures before marking work complete

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

**Remember**: LeanSpec is a mindset, not a rulebook. When in doubt, apply the first principles in order: Context Economy → Signal-to-Noise → Intent Over Implementation → Bridge the Gap → Progressive Disclosure. Use `lean-spec --help` to discover features as needed.
