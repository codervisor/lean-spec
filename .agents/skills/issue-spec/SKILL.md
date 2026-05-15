---
name: issue-spec
description: Create lean-spec style GitHub issues as specs for human-AI aligned implementation on the lean-spec repo itself. Use when asked to "create a spec", "write a spec issue", "spec this feature", "spec this", or when planning work that needs a specification before implementation. Follows the lean-spec SDD methodology — small focused specs (<2000 tokens), intent over implementation, context economy. Creates GitHub issues on `codervisor/lean-spec` with Overview, Design, Plan, Test, Alignment, and Notes sections. Paired with `lean-spec-dev-process` (the SDD loop), `lean-spec-pre-push` (pre-push checks), and `lean-spec-pr-lifecycle` (post-push).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git diff:*), Bash(git log:*), Bash(git show:*), mcp__github__issue_write, mcp__github__issue_read, mcp__github__list_issues, mcp__github__search_issues, mcp__github__sub_issue_write, mcp__github__get_label
---

# issue-spec

Create GitHub issues as lean-spec style specifications for human-AI aligned implementation on the lean-spec repo (`codervisor/lean-spec`). GitHub issues are the sole spec medium for new work — the historical `specs/` directory is frozen as a snapshot of pre-migration work and is not the source of truth going forward.

This skill is the canonical implementation of lean-spec's **github** provider applied to the lean-spec product itself. We dogfood the same workflow we're shipping. If the discipline is awkward here, that's a signal to fix the product, not to bend the discipline.

This is lean-spec's analogue of the `issue-spec` skills used on `onsager-ai/onsager` and `onsager-ai/duhem`. The discipline is the same; the area taxonomy and the architectural invariants are different — lean-spec has a **provider-agnostic core** invariant and an **i18n discipline** in place of Onsager's seam rule or Duhem's schema-impact rule.

## Why GitHub Issues, Not Files

The lean-spec product itself is moving from file-based specs (`specs/NNN-slug/README.md` with YAML frontmatter) to GitHub issues as the canonical backend for new work. The mapping:

- **Status** → Issue state (open/closed) + status labels (`draft`, `planned`, `in-progress`)
- **Priority** → Labels (`priority:critical`, `priority:high`, `priority:medium`, `priority:low`)
- **Tags** → Labels (`area:*`, `feat`, `fix`, `refactor`, `perf`)
- **Dependencies** → Issue references (`depends on #42`) and sub-issues
- **Parent/Child** → Sub-issues via `mcp__github__sub_issue_write`
- **Transitions** → Issue timeline (automatic, auditable)
- **Collaboration** → Comments, reactions, assignments, mentions

GitHub gives us versioned metadata, collaboration, and relationship tracking for free. The file-based provider remains supported by the product for users who want it; for lean-spec's own development we use issues.

## Philosophy

Three principles from lean-spec:

1. **Context Economy** — Keep issue body under ~2000 tokens. Larger features split into parent + child issues. Small specs produce better AI output and better human review.
2. **Intent Over Implementation** — Document the *why* and *what*, not the *how*. Implementation details belong in PRs, not spec issues. The spec captures human intent that isn't in the code.
3. **Living Documents** — Specs evolve via issue comments and edits. Status labels track lifecycle. The issue thread becomes the decision record.

Plus two lean-spec-specific principles:

4. **Provider-agnostic core.** Lean-spec's architecture promises that the CLI, MCP, and UI behave identically across backends (markdown / github / future ADO / Jira). Any spec that touches the provider abstraction — types in `packages/ui/src/types/specs.ts`, provider implementations under `rust/leanspec-core/src/providers/`, or anything the UI/CLI reads through that interface — must declare the impact in `## Provider impact`. A change that leaks backend specifics into core is a regression of the central product promise.

5. **i18n is mandatory.** Every user-facing string lands in both `en` and `zh-CN`. Specs that introduce or change user-visible strings call this out explicitly in the Plan, with a Test item that checks the locale files. The `leanspec-development` skill's [I18N.md](../leanspec-development/references/I18N.md) is the canonical reference.

## When to use this skill

Use when:

- A change touches multiple files or areas.
- Multiple stakeholders need alignment before implementation.
- The AI needs explicit boundaries for a non-trivial feature.
- Work will span multiple PRs (parent + child specs).
- The change touches the provider abstraction, the schema in `schemas/`, the CLI surface, the MCP surface, or anything else externally observable — those are *always* spec-worthy regardless of diff size.

Skip when:

- A typo or doc-only fix. Use the `trivial` label on the PR instead.
- A one-line bug fix with an obvious reproduction. Just open a PR with `Fixes #existing`.
- The feature already has a spec issue — extend that spec, don't create another.

**Default is spec, not trivial.** If invocation of this skill is itself the decision — the user said "spec this" or the change clearly isn't a typo/one-liner — proceed straight to Discover. Do not stop to confirm spec-vs-`trivial`.

## Workflow

```
1. Discover     Search existing issues and codebase
2. Design       Draft the spec issue body
3. Align        Partition human decisions vs AI work
4. Validate     Self-check before creating
5. Publish      Create GitHub issue (+ sub-issues if splitting)
```

### 1. Discover

Before writing anything:

- Search existing issues on `codervisor/lean-spec` for related or duplicate specs.
- Search the legacy `specs/` directory for prior work on the same topic (`grep -lri "<topic>" specs/`). Pre-migration specs are historical context, not the spec; quote intent from them when relevant.
- Read the relevant section of the `README.md` and any `docs/` material to ground the spec in lean-spec's existing commitments.
- Grep the codebase for types, modules, files related to the topic.
- Check git log for recent changes in the area.

If a related spec issue already exists, reference it — don't duplicate.

### 2. Design

Read [references/spec-format.md](references/spec-format.md) for the section-by-section format guide.

**Don't hard-wrap prose, list items, or blockquote lines.** GitHub renders issue and comment bodies with `breaks: true` — every newline inside a paragraph, list item, or blockquote becomes a `<br>`, producing visible mid-sentence breaks. Each paragraph, list item, and blockquote line is a single long line; only blank lines separate paragraphs, and each new bullet/quote line starts on its own line. Fenced code blocks and tables preserve formatting and are unaffected. Headings are single-line by markdown's own rules.

Draft the issue body using the lean-spec structure:

```markdown
## Overview
Problem statement and motivation. Why does this matter?

## Design
Technical approach: data flow, types, architecture decisions.
Keep it high-level — intent, not implementation.

## Plan
- [ ] Checklist of concrete deliverables
- [ ] Each item independently verifiable
- [ ] Order reflects implementation sequence

## Test
- [ ] How to verify each plan item
- [ ] Include: unit tests, integration tests, manual checks,
      i18n locale parity where applicable

## Provider impact
<!-- omit only if the change provably touches no provider surface -->
- Types added/removed/renamed
- Cross-backend semantics changed
- Migration path for existing markdown / github backends

## Notes
Tradeoffs, context, references. Optional — omit if empty.
```

**Context economy check**: If the issue body exceeds ~2000 tokens, split it:

- Create a parent issue with Overview + high-level Plan
- Create child issues (sub-issues), one per independent concern
- Each child has its own Design, Plan, Test sections
- Link children to parent via `mcp__github__sub_issue_write`

### 3. Align

Add an **Alignment** section to the issue body:

```markdown
## Alignment

### Human decides
- [ ] Architectural tradeoffs, scope, provider semantics, go/no-go

### AI implements
- [ ] Concrete code tasks tied to Plan items

### Open questions
> Items that block AI implementation until a human decides
```

**Rules:**

- Every Plan item maps to either "Human decides" or "AI implements"
- If an item requires both, split it — the decision part is human, the execution is AI
- Open questions use `>` blockquotes so they're visually distinct
- Once a human answers a question (via issue comment), update the Alignment section

### 4. Validate

Before creating the issue, self-check:

- [ ] Body is under ~2000 tokens (context economy)
- [ ] Prose paragraphs, list items, and blockquote lines are not hard-wrapped (each is one long line; blank line between paragraphs, new bullet/quote line on its own)
- [ ] Overview explains *why*, not just *what*
- [ ] Design captures intent, not implementation details
- [ ] Plan items are concrete and independently verifiable
- [ ] Test items map to Plan items
- [ ] `## Provider impact` section is present (or the spec provably touches no provider surface)
- [ ] If user-visible strings are introduced or changed, the Plan and Test sections cover both `en` and `zh-CN`
- [ ] Human/AI boundaries are explicit — no "figure it out" items
- [ ] No duplicate of an existing issue
- [ ] Dependencies are referenced by issue number

### 5. Publish

Create the issue using `mcp__github__issue_write` against `codervisor/lean-spec`:

**Title format**: `spec(<area>): <short description>`

Examples:

- `spec(provider): github provider — issue CRUD via MCP`
- `spec(cli): leanspec migrate accepts --to=github`
- `spec(ui): dependency graph view shows cross-backend edges`
- `spec(docs): document provider switching`

**Labels**: Apply via the issue creation:

- `spec` — always
- Type: `feat`, `fix`, `refactor`, `perf`
- Area (see taxonomy below)
- Priority: `priority:critical`, `priority:high`, `priority:medium`, `priority:low`
- Status: `draft` (initial state)
- `provider-impact` — apply whenever the spec includes a non-empty `## Provider impact` section. This is the discoverability signal for "which specs touch the provider seam?". Whether the change is breaking for the markdown backend, the github backend, or both is recorded inside the section.
- `i18n` — apply whenever the spec adds or changes a user-visible string.

**Sub-issues**: If this is a child of a parent spec, link it using `mcp__github__sub_issue_write`.

**After creating**, report to the user:

- Issue number and URL
- Token count estimate (flag if over 2000)
- Any open questions that need human decisions
- Sub-issue links if the spec was split

## Area label taxonomy (lean-spec repo)

Pick one or more. The taxonomy follows the package layout in `packages/`, the Rust crates in `rust/`, and the cross-cutting concerns:

- `area:cli` — `packages/cli/` (TypeScript wrapper) and `rust/leanspec-cli/` (Rust binary)
- `area:ui` — `packages/ui/` (web UI)
- `area:desktop` — `packages/desktop/` (Tauri app)
- `area:http-server` — `packages/http-server/` and `rust/leanspec-http/`
- `area:core` — `rust/leanspec-core/` (types, provider interface, business logic)
- `area:provider` — provider abstraction itself (markdown, github, future ADO/Jira). Anything that adds or changes the provider trait, its types, or how the rest of the app consumes it lives here.
- `area:mcp` — `@leanspec/mcp` server
- `area:schemas` — `schemas/` JSON schemas
- `area:docs` — `docs/`, `docs-site/`, `README.md`
- `area:infra` — `.github/workflows/`, `scripts/`, `deploy/`, `docker/`, `railway.json`, publishing pipeline
- `area:agents` — `.agents/skills/`, `.claude/`, `.gemini/`, agent configuration

A spec that legitimately spans two areas should be split unless the change is genuinely a single contract crossing the seam (e.g. a new field flowing from `area:core` types through `area:ui` rendering — that's one spec, two area labels). A spec touching three or more areas is almost always two specs hiding in a trench coat.

## Status Lifecycle via Labels

```
open + draft  →  open + planned  →  open + in-progress  →  closed
```

- **draft**: Spec created, open questions may remain. AI wrote it, human hasn't reviewed.
- **planned**: Human reviewed, decisions made, ready for implementation. Remove `draft`, add `planned`.
- **in-progress**: Someone/something is actively working (PR opened). Remove `planned`, add `in-progress`. *Currently manual* on this repo — no `pr-spec-sync` workflow yet (see `lean-spec-pr-lifecycle`).
- **closed**: All plan items done, tests passing. PR merge with `Closes #N` closes it automatically.

**Key rule**: `draft → planned` is the human-AI alignment gate. The AI does not flip this label unprompted.

## Spec Relationships via Sub-Issues

| Relationship    | GitHub mechanism                                        | When to use                                        |
|-----------------|---------------------------------------------------------|----------------------------------------------------|
| **Parent/Child**| Sub-issues (`mcp__github__sub_issue_write`)             | Large feature decomposed into pieces               |
| **Depends On**  | Issue body reference (`depends on #N`)                  | Spec blocked until another finishes                |
| **Related**     | Issue body reference (`related: #N`)                    | Loosely connected specs                            |

**Decision rule**: Remove the dependency — does the spec still make sense? If no → sub-issue (child). If yes but blocked → depends on.

**Example decomposition:**

```
spec(provider): github provider v1                ← parent issue
├── spec(provider): issue CRUD via MCP             ← sub-issue
├── spec(provider): label-to-frontmatter mapping   ← sub-issue
├── spec(provider): sub-issue → parent/child       ← sub-issue
└── spec(cli): leanspec init --provider=github    ← sub-issue
```

## Guidance

- **Small is better.** A 500-token spec that captures intent clearly beats a 3000-token spec that tries to cover everything. Split into sub-issues early.
- **Discover first.** Always search existing issues — and the legacy `specs/` directory — before creating. Duplicate specs create confusion.
- **Status labels reflect reality.** Don't label `planned` if decisions are still open. Don't label `in-progress` until a PR is open.
- **One concern per issue.** If a spec covers two independent changes, split into sub-issues with a shared parent.
- **Reference code, not concepts.** Once code exists, point to actual types, functions, files — not abstract ideas.
- **Open questions are alignment points.** These are where AI must stop and ask a human. Make them explicit, specific, and include the impact of each decision.
- **Comments are the decision record.** When a human resolves an open question, they comment on the issue. The thread becomes the audit trail.
- **Use specs for alignment, not for everything.** Regular bugs and small tasks don't need specs. Use specs when: multiple stakeholders need alignment, intent needs persistence, or the AI needs clear boundaries.

## Handoff to implementation

Once a spec moves to `planned`:

1. Create a branch referencing the issue: `claude/spec-<N>-<slug>` (Claude-owned) or any name (human-owned).
2. Follow the SDD loop in `lean-spec-dev-process`.
3. Pre-push via `lean-spec-pre-push` (includes a spec-link check, `pnpm typecheck`, `pnpm test`, and `cargo clippy -- -D warnings`).
4. PR body must include `Closes #N` (slice complete) or `Part of #N` (scaffolding).
5. After merge, see `lean-spec-pr-lifecycle` for Plan-item ticks, parent-spec maintenance, and CHANGELOG follow-through.

## Relationship to legacy file-based specs

The `specs/` directory contains pre-migration specs. After migration (see `scripts/migrate-specs-to-issues.ts`):

- Specs with status `complete`, `archived`, or `deferred` remain as files. They're the historical record.
- Specs with status `planned`, `in-progress`, or `draft` have been migrated to GitHub issues. The files remain as a frozen snapshot but the **issue is canonical**.
- New work always starts as a GitHub issue. Do not create new `specs/NNN-slug/` directories on this repo.

When you're searching for prior work, search both: GitHub issues (current) and `specs/` (history). When you're writing new specs, write only as GitHub issues.

## Relationship to Onsager / Duhem `issue-spec`

This skill and the `issue-spec` skills on `onsager-ai/onsager` and `onsager-ai/duhem` are **parallel, not shared**. Each is scoped to its own repo, with its own area taxonomy and architectural invariants. The shared methodology is the lean-spec SDD methodology itself — that's what this repo implements.

## References

| Reference                                          | When to read                                |
|----------------------------------------------------|---------------------------------------------|
| [references/spec-format.md](references/spec-format.md) | Always — section-by-section guide           |
| [../leanspec-development/references/I18N.md](../leanspec-development/references/I18N.md) | Specs that touch user-visible strings       |
| [../leanspec-development/references/RULES.md](../leanspec-development/references/RULES.md) | Mandatory project rules                     |

## Templates

| Template                                                | Purpose                                |
|---------------------------------------------------------|----------------------------------------|
| [templates/issue-spec-template.md](templates/issue-spec-template.md) | Issue body template — copy and fill |
