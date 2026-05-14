# Spec Format Reference

Section-by-section guide for writing lean-spec style GitHub issue specs on `codervisor/lean-spec`. Based on the lean-spec SDD methodology applied to lean-spec itself — we dogfood the workflow we ship.

## Metadata via GitHub Issue Features

No YAML frontmatter — all metadata lives in native GitHub features:

| lean-spec field    | GitHub equivalent     | Example                                      |
|--------------------|-----------------------|----------------------------------------------|
| `status`           | Labels                | `draft`, `planned`, `in-progress`            |
| `priority`         | Labels                | `priority:high`                              |
| `tags`             | Labels                | `area:provider`, `feat`                      |
| `depends_on`       | Issue body reference  | `depends on #42`                             |
| `parent/child`     | Sub-issues            | Created via `mcp__github__sub_issue_write`   |
| `assignee`         | Issue assignee        | `@username`                                  |
| `created/updated`  | Issue timestamps      | Automatic                                    |
| `transitions`      | Issue timeline        | Automatic audit trail                        |

### Label Taxonomy

Apply labels when creating the issue:

**Required:**

- `spec` — marks this as a spec issue (always present)

**Type** (pick one):

- `feat` — new capability
- `fix` — bug fix
- `refactor` — restructuring without behavior change
- `perf` — performance improvement

**Area** (pick one or more — see SKILL.md "Area label taxonomy"):

- `area:cli`, `area:ui`, `area:desktop`, `area:http-server`, `area:core`, `area:provider`, `area:mcp`, `area:schemas`, `area:docs`, `area:infra`, `area:agents`

**Priority** (pick one):

- `priority:critical` — blocks other work, needs immediate attention
- `priority:high` — important, should be next
- `priority:medium` — default
- `priority:low` — nice to have

**Status** (pick one, update as lifecycle progresses):

- `draft` — initial state, AI-generated, human review pending
- `planned` — human reviewed, decisions made, ready for implementation
- `in-progress` — actively being worked on (PR open)

**Cross-cutting:**

- `provider-impact` — apply whenever the spec includes a non-empty `## Provider impact` section. Covers *any* change to the provider abstraction, the provider trait, or anything that crosses the markdown / github backend seam. The label is the discoverability signal for "which specs touch the provider seam?".
- `i18n` — apply whenever the spec adds or changes a user-visible string. Both `en` and `zh-CN` are mandatory; this label flags the spec for the locale-file review pass.
- `migrated-from-file` — applied automatically by `scripts/migrate-specs-to-issues.ts` for specs that originated as files in `specs/`. Helps separate migration noise from net-new work.
- `trivial` (PR-only label, not a spec label) — opts a PR out of the spec-link requirement. See `lean-spec-dev-process`.

### Status Lifecycle

```
open + draft  →  open + planned  →  open + in-progress  →  closed
```

The `draft → planned` transition is the **human-AI alignment gate**. Only a human moves a spec to `planned` — this confirms:

- Open questions are resolved
- Design approach is approved
- Scope and priority are accepted

`planned → in-progress` happens **manually on this repo** when a PR referencing the issue opens. (Onsager has automation for this; lean-spec does not yet — that's itself a candidate spec.) See `lean-spec-pr-lifecycle`.

`in-progress → closed` happens automatically on PR merge with a `Closes #N` keyword. `Part of #N` PRs don't close the parent; the merger ticks the parent's Plan checkboxes manually.

## Sections

### Overview

**Purpose**: Why does this work matter? What problem does it solve?

**Good overview** (note: prose, list items, and blockquote lines are *not* hard-wrapped — GitHub renders single newlines as `<br>` in issue bodies; see SKILL.md step 2):

```markdown
## Overview

Today, lean-spec's only supported backend is markdown files in `specs/`. Users who already track work in GitHub Issues, ADO, or Jira have to choose between adopting lean-spec's filesystem layout or forgoing the framework entirely.

This adds a github provider so lean-spec can read and write specs as GitHub issues. The CLI, MCP, and UI all stay identical — the user picks a backend in config, and the rest of the product behaves the same.
```

**Bad overview:** describes the solution before the problem; spends two paragraphs on context already in the README; mentions a specific function name.

### Design

**Purpose**: Capture intent, not implementation. A reader should understand the *shape* of the change without reading the diff.

Cover:

- Data flow at intent level
- Type changes (link to specific files: `packages/ui/src/types/specs.ts`, `rust/leanspec-core/src/...`)
- Provider trait changes (if any)
- Out-of-scope: what this spec deliberately doesn't do

Don't:

- Quote 50 lines of code
- Specify exact function signatures (those go in the PR)
- Describe how to write the test (that's `## Test`)

### Plan

A checklist of concrete deliverables. Each item:

- Starts with a verb
- Is independently verifiable
- Has a single owner (AI or human, not both)
- Order reflects implementation sequence (top-down dependencies)

A 2–6 item Plan is healthy. A Plan with 12 items is two specs hiding in a trench coat — split it.

### Test

How each Plan item is verified. Map 1:1 to Plan items where possible. Include:

- Unit tests (file path / function name) — Vitest for TypeScript, `#[cfg(test)]` for Rust
- Integration tests
- `pnpm typecheck` — never skip before marking complete
- `pnpm pre-push` — typecheck + clippy
- `pnpm pre-release` — full build + test + lint, when shipping a release
- i18n parity check — both `en` and `zh-CN` updated when user-visible strings change
- Manual checks (only when automation is genuinely impossible)

### Provider impact

Required when the change touches the provider abstraction (`area:provider`), the types in `packages/ui/src/types/specs.ts`, the provider trait in `rust/leanspec-core/`, or anything else externally observable across backends.

Format:

```markdown
## Provider impact

- Types added: `SpecBackend`, `ProviderConfig.token: string | null`
- Types renamed: none
- Types removed: none
- Trait changes: `Provider::list_specs()` now returns `Result<Vec<LightweightSpec>>` (was `Vec<LightweightSpec>`)
- markdown backend semantics: unchanged
- github backend semantics: new
- Migration path: existing markdown projects continue to work; users opt in to github via `lean-spec init --provider=github` or by editing `.lean-spec/config.json`
- Breaking change? no — markdown remains the default; github is additive
```

Apply the `provider-impact` label whenever this section is present. Whether the change is breaking is a separate signal answered by the `Breaking change?` line. If `Breaking change? yes`, also add a CHANGELOG entry on merge.

### i18n impact

Required (inline in Plan + Test) when the spec adds or changes a user-visible string. Both `en` and `zh-CN` locale files must be updated in the same PR — this is enforced by `leanspec-development`'s I18N rules.

Format (inline, not a separate top-level section):

```markdown
## Plan
- [ ] Add `--filter` flag handling in `packages/cli/src/commands/run.ts`
- [ ] Update `locales/en.json` with `cli.run.filter.help`
- [ ] Update `locales/zh-CN.json` with `cli.run.filter.help`

## Test
- [ ] Vitest unit test for filter parsing
- [ ] CI i18n parity check passes (both locales have the new key)
```

### Alignment

Three sub-sections:

#### Human decides

Decisions requiring judgment, scope authority, or domain knowledge the AI doesn't have. Examples:

- Which of two type shapes to commit to
- Whether a behavior is in scope for this spec or a follow-up
- Whether a breaking change is acceptable now vs deferred

#### AI implements

Concrete code tasks tied to Plan items. Examples:

- "Add `--filter` flag handling in `packages/cli/src/commands/run.ts`"
- "Implement `GithubProvider::list_specs` in `rust/leanspec-core/src/providers/github.rs`"

#### Open questions

`>` blockquoted questions that block `draft → planned`. Each must:

- State the question
- Note the impact (which Plan items are affected)
- Include enough context that a human can answer without rereading the whole spec

### Notes

Optional. Tradeoffs, related issues, prior art. Omit if empty.

When migrating from a legacy file-based spec, the original file path goes in Notes (e.g. `Migrated from specs/110-project-aware-agents-generation/README.md`) so the historical context is one click away.

## Sub-issue decomposition

When a spec exceeds ~2000 tokens or covers more than one independent concern, split it into a parent + child specs:

```
spec(provider): github provider v1                ← parent
├── spec(provider): issue CRUD via MCP             ← child sub-issue
├── spec(provider): label-to-frontmatter mapping   ← child sub-issue
├── spec(provider): sub-issue → parent/child       ← child sub-issue
└── spec(cli):     leanspec init --provider=github ← child sub-issue
```

The parent spec carries the overarching intent and a high-level Plan that's a list of the children. Each child is independently implementable and has its own Design, Plan, Test, Provider impact, Alignment.

Use `mcp__github__sub_issue_write` to attach children to the parent.

## Cross-references

- `README.md` — what lean-spec is and isn't; cite when grounding a spec
- `.agents/skills/leanspec-development/SKILL.md` — dev/CI/publish commands; reference rather than duplicate
- `.agents/skills/leanspec-development/references/RULES.md` — mandatory project rules
- `.agents/skills/leanspec-development/references/I18N.md` — i18n locations and patterns
- `specs/` — frozen historical specs (pre-migration); search for prior intent, do not author new files here
