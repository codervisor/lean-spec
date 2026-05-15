---
name: issue-spec
description: Create lean-spec style GitHub issues as specs for human-AI aligned implementation on the current repo. Use when asked to "create a spec", "write a spec issue", "spec this feature", "spec this", or when planning work that needs a specification before implementation. Follows the lean-spec SDD methodology — small focused specs (<2000 tokens), intent over implementation, context economy. Creates GitHub issues with Overview, Design, Plan, Test, Alignment, and Notes sections. Repo-specific area taxonomy, sister-skill names, custom body sections (e.g. Provider impact / Schema impact / Reach), and additional principles are overlaid by the consumer repo's CLAUDE.md and its `*-dev-process` / `*-pre-push` / `*-pr-lifecycle` sister skills — read those first when the repo isn't obvious.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git diff:*), Bash(git log:*), Bash(git show:*), mcp__github__issue_write, mcp__github__issue_read, mcp__github__list_issues, mcp__github__search_issues, mcp__github__sub_issue_write, mcp__github__get_label
---

# issue-spec

Create GitHub issues as lean-spec style specifications for human-AI aligned implementation on whatever repo this skill is installed in. GitHub issues are the sole spec medium — no spec files.

This skill is the **repo-agnostic methodology** half of the contract. Each consumer repo overlays its own delta in two places:

- **Repo CLAUDE.md** — names the GitHub slug (`codervisor/lean-spec`, `onsager-ai/onsager`, `onsager-ai/duhem`, …) and any repo-specific spec principles (e.g. Onsager's Reach + seam rule, lean-spec's provider-agnostic core + i18n, Duhem's worked-example + schema-impact).
- **Sister skills** — `<repo>-dev-process` carries the area-label taxonomy, the spec-vs-`trivial` gate, and the SDD loop wiring; `<repo>-pre-push` carries pre-push gates; `<repo>-pr-lifecycle` carries the post-push workflow (including any `pr-spec-sync` automation or the lack of it).

When in doubt about the target repo, run `git remote -v` and read the repo's `CLAUDE.md` and its `*-dev-process` skill before drafting the spec body.

## Why GitHub Issues, Not Files

lean-spec uses Markdown files with YAML frontmatter for metadata. We replace that entirely with GitHub issues because:

- **Status** → Issue state (open/closed) + status labels (`draft`, `planned`, `in-progress`)
- **Priority** → Labels (`priority:critical`, `priority:high`, `priority:medium`, `priority:low`)
- **Tags** → Labels (`area:<subsystem>`, `feat`, `fix`, `refactor`, `perf`)
- **Dependencies** → Issue references (`depends on #42`) and sub-issues
- **Parent/Child** → Sub-issues via `mcp__github__sub_issue_write`
- **Transitions** → Issue timeline (automatic, auditable)
- **Collaboration** → Comments, reactions, assignments, mentions

GitHub gives us versioned metadata, collaboration, and relationship tracking for free. No CLI needed, no frontmatter to manage, no sync problems.

## Philosophy

Three principles from lean-spec, universal across consumer repos:

1. **Context Economy** — Keep issue body under ~2000 tokens. Larger features split into parent + child issues. Small specs produce better AI output and better human review.
2. **Intent Over Implementation** — Document the *why* and *what*, not the *how*. Implementation details belong in PRs, not spec issues. The spec captures human intent that isn't in the code.
3. **Living Documents** — Specs evolve via issue comments and edits. Status labels track lifecycle. The issue thread becomes the decision record.

Each consumer repo may add 1–2 repo-specific principles on top — read the repo's `CLAUDE.md` and its `*-dev-process` sister skill before drafting. Examples of overlay principles you'll find in the wild:

- **Reach ships with the primitive** (Onsager) — new user-facing primitives must scope in nav entry, first-run flow, empty-state CTAs, and auth gating; deferring discoverability is the bad call.
- **Provider-agnostic core + i18n** (lean-spec) — changes to the provider abstraction declare `## Provider impact`; user-visible strings land in both `en` and `zh-CN`.
- **Worked example + schema impact** (Duhem) — product-surface specs ship with a minimal Verification Definition that exercises the surface; schema-touching changes declare `## Schema impact`.

If the overlay introduces an additional issue-body section or label (e.g. `Provider impact`, `Schema impact`, `provider-impact`, `schema-impact`, `i18n`), apply it. The repo's CLAUDE.md or sister skill is authoritative for which extras it requires.

## When to use this skill

Use when:

- A change touches multiple files or subsystems.
- Multiple stakeholders need alignment before implementation.
- The AI needs explicit boundaries for a non-trivial feature.
- Work will span multiple PRs (parent + child specs).
- The change touches an externally observable contract — schema, CLI surface, public API, provider trait, event manifest — *regardless of diff size*. Consumer repos may name additional always-spec surfaces in their CLAUDE.md or sister skill; honour them.

Skip when:

- A typo or doc-only fix. Use the `trivial` label on the PR instead.
- A one-line bug fix with an obvious reproduction. Just open a PR with `Fixes #existing`.
- The feature already has a spec issue — extend that spec, don't create another.

**Default is spec, not trivial.** If invocation of this skill is itself the decision — the user said "spec this" or the change clearly isn't a typo/one-liner — proceed straight to Discover. Do not stop to confirm spec-vs-`trivial`. The "Skip when" list is a self-veto for unambiguously trivial diffs; everything else is a spec by default. `trivial` is a sparingly-used escape hatch (see the repo's `*-dev-process` and `*-pre-push` sister skills), not a 50/50 fork to ask about.

## Setup

| Parameter | Default | Example override |
|-----------|---------|-----------------|
| **Topic** | _(required)_ | `"session timeout"`, `"fix heartbeat race"` |
| **Scope** | Inferred from codebase | `"only stiglab"`, `"only the cli"` |
| **Priority** | `medium` | `critical`, `high`, `low` |
| **Labels** | Auto from type + area | `"spec, feat, area:<sub>"` |
| **Parent** | None | `#42` (umbrella issue) |

If the user says "spec session timeout", start immediately. Do not ask clarifying questions unless the topic is genuinely ambiguous — and do not ask whether the change should be a `trivial`-labeled PR instead. Invocation of this skill *is* the decision; the "Skip when" list above is the only place that question gets re-litigated, and only for unambiguously trivial diffs.

## Workflow

```
1. Discover     Search existing issues and codebase
2. Design       Draft the spec issue body
3. Align        Partition human decisions vs AI work
4. Validate     Self-check before creating
5. Publish      Create GitHub issue (+ sub-issues if splitting)
```

### 1. Discover

Before writing anything, understand what exists:

- Search existing GitHub issues on the target repo for related or duplicate specs.
- Grep the codebase for types, functions, modules related to the topic.
- Read key files that will be affected.
- Check git log for recent changes in the area.
- Read the repo's `CLAUDE.md` and any canonical product doc it points at (e.g. an architecture doc, an ADR, a `docs/<product>-spec.md`) — they ground the spec in existing commitments and identify always-spec surfaces.

If a related spec issue already exists, reference it — don't duplicate.

### 2. Design

Read [references/spec-format.md](references/spec-format.md) for the section-by-section format guide.

**Don't hard-wrap prose, list items, or blockquote lines.** GitHub renders issue and comment bodies with `breaks: true` — every newline inside a paragraph, list item, or blockquote becomes a `<br>`, producing visible mid-sentence breaks. Source files in many repos wrap at ~70–100 columns; **issue bodies must not**. Each paragraph, list item, and blockquote line is a single long line; only blank lines separate paragraphs, and each new bullet/quote line starts on its own line. Fenced code blocks and tables preserve formatting and are unaffected. Headings are single-line by markdown's own rules.

Draft the issue body using the lean-spec structure:

```markdown
## Overview
Problem statement and motivation. Why does this matter?

## Design
Technical approach: data flow, API changes, architecture decisions.
Keep it high-level — intent, not implementation.

## Plan
- [ ] Checklist of concrete deliverables
- [ ] Each item independently verifiable
- [ ] Order reflects implementation sequence

## Test
- [ ] How to verify each plan item
- [ ] Include: unit tests, integration tests, manual checks

## Notes
Tradeoffs, context, references. Optional — omit if empty.
```

Consumer repos may require additional sections (e.g. `## Provider impact`, `## Schema impact`, `## Worked example`) — read the repo's CLAUDE.md / sister skill for the full list and the rules for when each section is required vs. optional. Templates under [templates/](templates/issue-spec-template.md) cover the universal shape; consumer-repo overlays may extend the template.

**Context economy check**: If the issue body exceeds ~2000 tokens, split it:

- Create a parent issue with Overview + high-level Plan
- Create child issues (sub-issues), one per independent concern
- Each child has its own Design, Plan, Test sections
- Link children to parent via `mcp__github__sub_issue_write`

### 3. Align

Add an **Alignment** section to the issue body (this extends lean-spec for human-AI collaboration):

```markdown
## Alignment

### Human decides
- [ ] Architectural tradeoffs, scope, UX, go/no-go

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
- [ ] Any repo-specific required section (e.g. `## Provider impact`, `## Schema impact`) is present, or the spec provably doesn't touch that surface
- [ ] Human/AI boundaries are explicit — no "figure it out" items
- [ ] No duplicate of an existing issue
- [ ] Dependencies are referenced by issue number

### 5. Publish

Create the issue using `mcp__github__issue_write` against the consumer repo:

**Title format**: `spec(<area>): <short description>`

`<area>` is drawn from the consumer repo's area-label taxonomy — read the `*-dev-process` sister skill (or the repo's CLAUDE.md if the sister skill defers) for the canonical list. Examples observed across consumer repos: `spec(stiglab): add session timeout`, `spec(provider): github provider — issue CRUD via MCP`, `spec(schema): add api/observe action type`.

**Labels**: Apply via the issue creation:

- `spec` — always, marks this as a spec issue
- Type: `feat`, `fix`, `refactor`, `perf`
- Area (consumer-repo taxonomy)
- Priority: `priority:critical`, `priority:high`, `priority:medium`, `priority:low`
- Status: `draft` (initial state)
- Any consumer-repo cross-cutting labels (e.g. `provider-impact`, `schema-impact`, `i18n`) when the corresponding overlay section is non-empty

**Sub-issues**: If this is a child of a parent spec, link it using `mcp__github__sub_issue_write`.

**After creating**, report to the user:

- Issue number and URL
- Token count estimate (flag if over 2000)
- Any open questions that need human decisions
- Sub-issue links if the spec was split

## Status Lifecycle via Labels

GitHub issue state (open/closed) combined with status labels:

```
open + draft  →  open + planned  →  open + in-progress  →  closed (complete)
```

- **draft**: Spec created, open questions may remain. AI wrote it, human hasn't reviewed.
- **planned**: Human reviewed, decisions made, ready for implementation. Remove `draft`, add `planned`.
- **in-progress**: Someone/something is actively working (PR opened). Remove `planned`, add `in-progress`. Some consumer repos automate this transition via a `pr-spec-sync.yml` GitHub Actions workflow; others handle it manually — check the repo's `*-pr-lifecycle` sister skill.
- **closed**: All plan items done, tests passing. PR merge with `Closes #N` closes it automatically.

**Key rule**: `draft → planned` is the human-AI alignment gate. A spec moves to `planned` only after a human reviews it and resolves open questions. The AI does not flip this label unprompted.

## Spec Relationships via Sub-Issues

Use GitHub sub-issues for parent/child decomposition:

| Relationship    | GitHub mechanism                                        | When to use                              |
|-----------------|---------------------------------------------------------|------------------------------------------|
| **Parent/Child**| Sub-issues (`mcp__github__sub_issue_write`)             | Large feature decomposed into pieces     |
| **Depends On**  | Issue body reference (`depends on #N`)                  | Spec blocked until another finishes      |
| **Related**     | Issue body reference (`related: #N`)                    | Loosely connected specs                  |

**Decision rule**: Remove the dependency — does the spec still make sense? If no → sub-issue (child). If yes but blocked → depends on.

**Example decomposition** (shape, not specific to any one repo):

```
spec(<area>): umbrella feature                ← parent issue
├── spec(<area>): concern A                   ← sub-issue
├── spec(<area>): concern B                   ← sub-issue
└── spec(<other-area>): UI surface for A+B    ← sub-issue
```

When a contract under a repo's architectural rule splits work across two subsystems (e.g. a back-end producer + a front-end consumer of an event), use the parent-plus-children shape: one parent spec captures the end-to-end slice, one child spec per subsystem captures its half. The contract lives in the parent's Plan; each child scopes to a single area label. Producer and consumer halves can land in separate PRs as long as both close before the parent does — but the parent's Plan should require a contract test that fails until both halves exist.

## Guidance

- **Small is better.** A 500-token spec that captures intent clearly beats a 3000-token spec that tries to cover everything. Split into sub-issues early.
- **Discover first.** Always search existing issues before creating. Duplicate specs create confusion.
- **Status labels reflect reality.** Don't label `planned` if decisions are still open. Don't label `in-progress` until a PR is open.
- **One concern per issue.** If a spec covers two independent changes, split into sub-issues with a shared parent.
- **Reference code, not concepts.** Point to actual types, functions, files — not abstract ideas. Use concrete paths like `crates/<sub>/src/...` or `packages/<pkg>/src/...` rather than "the foo module."
- **Open questions are alignment points.** These are where AI must stop and ask a human. Make them explicit, specific, and include the impact of each decision.
- **Comments are the decision record.** When a human resolves an open question, they comment on the issue. The thread becomes the audit trail.
- **Use specs for alignment, not for everything.** Regular bugs and small tasks don't need specs. Use specs when: multiple stakeholders need alignment, intent needs persistence, or the AI needs clear boundaries.

## Handoff to implementation

Once a spec moves to `planned`:

1. Create a branch referencing the issue: `claude/spec-<N>-<slug>` (Claude-owned) or any name (human-owned).
2. Follow the SDD loop in the repo's `*-dev-process` sister skill.
3. Pre-push via the repo's `*-pre-push` sister skill (which typically includes a spec-link check plus the repo's typecheck / lint / test gates).
4. PR body must include `Closes #N` (slice complete) or `Part of #N` (scaffolding).
5. On PR open, the repo's `pr-spec-sync` workflow (if present) flips the issue to `in-progress`; on merge GitHub auto-closes `Closes #N` issues and the merger ticks Plan items on `Part of #N` parents manually. See `*-pr-lifecycle`.

## Repo-agnostic by construction; consumer overlay is required

This skill is the **methodology**; it intentionally does not name a repo, an area taxonomy, or a set of cross-cutting labels. Every consumer repo overlays those via:

- Its `CLAUDE.md` (repo-specific principles, target GitHub slug, always-spec surfaces).
- Its `*-dev-process` sister skill (area-label taxonomy, spec-vs-`trivial` gate, SDD loop).
- Its `*-pre-push` and `*-pr-lifecycle` sister skills (which gates run pre-push and which automation runs post-push).
- Optionally an additional product spec doc (e.g. `docs/<product>-spec.md`, an architecture ADR set) that the repo's CLAUDE.md points at.

Treat reading those as part of step 1 (Discover). Don't draft a spec without having loaded the consumer repo's overlay context first — a spec that names the wrong area label, misses a required section, or proposes something the repo's seam / schema / provider rule forbids is a spec the human has to rewrite.

## References

| Reference                                              | When to read                                              |
|--------------------------------------------------------|-----------------------------------------------------------|
| [references/spec-format.md](references/spec-format.md) | Always — section-by-section guide with worked examples    |
| Repo's `CLAUDE.md`                                     | Always — repo-specific principles + always-spec surfaces  |
| Repo's `*-dev-process` sister skill                    | Always — area-label taxonomy + spec-vs-`trivial` gate     |
| Repo's `*-pr-lifecycle` sister skill                   | When publishing — does the repo automate `pr-spec-sync`?  |

## Templates

| Template                                                             | Purpose                                                  |
|----------------------------------------------------------------------|----------------------------------------------------------|
| [templates/issue-spec-template.md](templates/issue-spec-template.md) | Universal issue body template — copy and fill            |

Consumer repos may ship an extended template alongside this one (e.g. with a `## Provider impact` or `## Schema impact` block pre-filled). Prefer the consumer-repo extended template when present.
