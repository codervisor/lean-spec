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

**Quick Reference** (for full details, see [docs/agents/COMMANDS.md](docs/agents/COMMANDS.md)):

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

LeanSpec has two types of relationships (for detailed examples, see [docs/agents/WORKFLOWS.md](docs/agents/WORKFLOWS.md)):

### `related` - Bidirectional Soft Reference
Informational relationship between specs. Automatically shown from both sides.

**Use when:** Specs cover related topics, work is coordinated but not blocking.

### `depends_on` - Directional Blocking Dependency
Hard dependency - spec cannot start until dependencies complete.

**Use when:** Spec truly cannot start until another completes, work order matters.

**Best Practice:** Use `related` by default. Reserve `depends_on` for true blocking dependencies.

## SDD Workflow

**Full workflow details:** See [docs/agents/WORKFLOWS.md](docs/agents/WORKFLOWS.md)

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
- **Always validate before completing work:**
  - Run `node bin/lean-spec.js validate` to check spec structure and frontmatter (use local build, not `npx`)
  - Run `cd docs-site && npm run build` to ensure documentation site builds successfully
  - Update spec status to `complete` with `lean-spec update <spec> --status complete`
  - Fix any validation errors or build failures before marking work complete

**Note on Local Development:**
When working on the LeanSpec codebase itself, always use the local build (`node bin/lean-spec.js <command>`) instead of `npx lean-spec`, which runs the published npm package. Build changes with `pnpm build` before testing.

## Publishing Releases

⚠️ **CRITICAL**: When publishing a release, you MUST create a GitHub release. This is not optional.

See [docs/agents/PUBLISHING.md](docs/agents/PUBLISHING.md) for the complete release process.

**Quick reminder of mandatory steps:**
1. Update versions & CHANGELOG
2. Run pre-release checks (`pnpm pre-release`)
3. Commit, tag, and push
4. Prepare packages (`pnpm prepare-publish`)
5. Publish to npm (all packages)
6. Restore packages (`pnpm restore-packages`)
7. **CREATE GITHUB RELEASE** (`gh release create vX.Y.Z --title "..." --notes-file ...`) ← DO NOT SKIP THIS
8. Verify everything is published correctly

## Spec Complexity Guidelines

**Token Thresholds:**
- **<2,000 tokens**: ✅ Optimal
- **2,000-3,500 tokens**: ✅ Good
- **3,500-5,000 tokens**: ⚠️ Warning - Consider splitting
- **>5,000 tokens**: 🔴 Should split

**Check with:** `lean-spec tokens <spec>`

**When to split:** >3,500 tokens, multiple concerns, takes >10 min to read

**How to split:** Use `lean-spec analyze <spec>`, `lean-spec split`, and `lean-spec compact` commands. See [docs/agents/WORKFLOWS.md](docs/agents/WORKFLOWS.md) for detailed examples.

---

**Remember**: LeanSpec is a mindset, not a rulebook. When in doubt, apply the first principles in order: Context Economy → Signal-to-Noise → Intent Over Implementation → Bridge the Gap → Progressive Disclosure. Use `lean-spec --help` to discover features as needed.
