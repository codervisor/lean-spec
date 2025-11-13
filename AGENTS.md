# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## First Principles (Decision Framework)

When making spec decisions, apply these principles in priority order:

### 1. Context Economy - Fit in working memory
**Specs must fit in working memory—both human and AI.**

- **Target**: <2,000 tokens per spec file
- **Warning**: 2,000-3,500 tokens (acceptable but watch complexity)
- **Problem**: >3,500 tokens (consider splitting)
- **Question**: "Can this be read in 5-10 minutes? Can you hold the entire structure in your head?"
- **Why**: Attention and cognitive capacity are scarce resources. AI performance degrades with longer context (quality drops beyond 50K tokens despite 200K limits). Humans can't hold >7 concepts in working memory. **Use `lean-spec tokens <spec>` to check.**

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

**"Should I split this 4,000-token spec?"**
→ **Yes** (Context Economy: >3,500 tokens needs splitting)

**"Should I document every edge case?"**
→ **Only if it informs current decisions** (Signal-to-Noise test)

**"Should I add custom fields upfront?"**
→ **Only if you feel pain without them** (Progressive Disclosure)

**"This spec is complex but only 2,500 tokens, split it?"**
→ **No** (Under Context Economy warning threshold)

## Core Rules

1. **Read README.md first** - Understand project context
2. **Check specs/** - Review existing specs before starting
3. **Use `lean-spec --help`** - When unsure about commands, check the built-in help
4. **Follow LeanSpec principles** - Clarity over documentation
5. **Keep it minimal** - If it doesn't add clarity, cut it
6. **NEVER manually edit system-managed frontmatter** - Fields like `status`, `priority`, `tags`, `assignee`, `transitions`, `created_at`, `updated_at`, `completed_at` are system-managed. Always use `lean-spec update` or `lean-spec create` commands. Manual edits will cause metadata corruption and tracking issues. **Exception**: Relationship fields (`depends_on`, `related`) must currently be edited manually as no CLI command exists yet.
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

**Token Management:**
- `lean-spec tokens <spec>` - Count tokens in a spec for LLM context management
- `lean-spec tokens` - Show token counts for all specs (sorted by token count)
- `lean-spec tokens <spec> --detailed` - Show content breakdown (prose vs code vs tables)

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

**Critical - Frontmatter Editing Rules:**
- **NEVER manually edit**: `status`, `priority`, `tags`, `assignee`, `transitions`, `created_at`, `updated_at`, `completed_at`
- **Use CLI commands**: `lean-spec update` for all system-managed fields
- **Manual edit only**: `depends_on`, `related` (no CLI command yet - verify with `lean-spec deps <spec>`)

## Quality Standards

- Code is clear and maintainable
- Tests cover critical paths
- Specs stay in sync with implementation
- **Always validate before completing work:**
  - Run `node bin/lean-spec.js validate` to check spec structure and frontmatter (use local build, not `npx`)
  - Run `cd docs-site && npm run build` to ensure documentation site builds successfully
  - Fix any validation errors or build failures before marking work complete

**Note on Local Development:**
When working on the LeanSpec codebase itself, always use the local build (`node bin/lean-spec.js <command>`) instead of `npx lean-spec`, which runs the published npm package. Build changes with `pnpm build` before testing.

## Publishing Releases

**Only publish the `lean-spec` CLI package to npm:**

1. **Version bump**: Update version in all package.json files (root, cli, core, web) for consistency
2. **Update CHANGELOG.md**: Add release notes with date and version
3. **Build**: Run `pnpm build` to build all packages
4. **Test**: Run `pnpm test:run` to ensure tests pass (web DB tests may fail - that's OK)
5. **Validate**: Run `node bin/lean-spec.js validate` and `cd docs-site && npm run build` to ensure everything works
6. **Commit**: `git add -A && git commit -m "chore: bump version to X.Y.Z"`
7. **Publish**: `cd packages/cli && npm publish` (only publish the CLI package)
8. **Tag**: `git tag vX.Y.Z && git push origin main --tags`
9. **Verify**: 
   - `npm view lean-spec version` to confirm publication
   - `npm view lean-spec dependencies` to ensure no `workspace:*` dependencies leaked
   - Test installation: `npm install -g lean-spec@latest` in a clean environment

**Critical - Workspace Dependencies:**
- The `@leanspec/core` package MUST NOT be in `packages/cli/package.json` dependencies
- tsup config has `noExternal: ['@leanspec/core']` which bundles the core package
- NEVER add `@leanspec/core` back to dependencies - it will cause `workspace:*` errors
- If you see `workspace:*` in published dependencies, the package is broken and must be republished

**Important**: Do NOT publish `@leanspec/core` or `@leanspec/web` - they are internal packages. The `@leanspec` npm scope doesn't exist, and the core package is bundled into the CLI distribution.

## Spec Complexity Guidelines

### Token-Based Thresholds (Specs 066, 069, 071)

LeanSpec uses **token count** as the primary complexity metric:

**Token Thresholds:**
- **<2,000 tokens**: ✅ Excellent - Optimal AI performance (100%)
- **2,000-3,500 tokens**: ✅ Good - Slight degradation (95%)
- **3,500-5,000 tokens**: ⚠️ Warning - Consider splitting (85%)
- **>5,000 tokens**: 🔴 Should split - Significant degradation (70%)

**Why tokens?** Industry standard for LLM context, better predictor than line count, accounts for code density differences (3 chars/token vs 4 for prose).

**Check token counts:**
- `lean-spec tokens <spec>` - Count tokens in a spec
- `lean-spec tokens` - Show all specs by token count
- `lean-spec validate` - Full validation including thresholds

### When to Split

Keep as **single file** when:
- Under 2,000 tokens (optimal)
- Single, focused concern
- Readable in 5-10 minutes
- Implementation <6 phases

Consider **splitting** when:
- Over 3,500 tokens
- Multiple distinct concerns
- AI tools corrupt during edits
- Implementation >6 phases

**Warning signs:**
- Token count >3,500
- Takes >10 minutes to read
- Can't summarize in 2 paragraphs
- Scrolling endlessly to find info

### How to Split

Use sub-spec files (see spec 012):
- `README.md`: Overview, decision, high-level design
- `DESIGN.md`: Detailed architecture
- `IMPLEMENTATION.md`: Implementation phases
- `TESTING.md`: Test strategy
- `{CONCERN}.md`: Specific concerns (API, MIGRATION, etc.)

---

**Remember**: LeanSpec is a mindset, not a rulebook. When in doubt, apply the first principles in order: Context Economy → Signal-to-Noise → Intent Over Implementation → Bridge the Gap → Progressive Disclosure. Use `lean-spec --help` to discover features as needed.
