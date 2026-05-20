---
name: leanspec-dev-process
description: The end-to-end spec-issue-driven dev loop for lean-spec — spec → branch → implement → PR → merge → closure. Use when asked "how do I start work", "what's the process", "SDD loop", "spec-driven development", "how do we ship a change on lean-spec", "from scratch what do I do", or when you're about to begin a non-trivial change on `codervisor/leanspec` and haven't yet decided how to split spec/PR. Delegates to `issue-spec` (spec writing), `leanspec-pre-push` (pre-push checks), `leanspec-pr-lifecycle` (post-push), and `leanspec-development` (commands, CI, publishing, i18n).
metadata:
  internal: true
---

# leanspec-dev-process

The spec-issue-driven development (SDD) loop on lean-spec. Every non-trivial change starts as a GitHub spec issue on `codervisor/leanspec`, proceeds through a PR that references it, and closes when the PR merges.

Lean-spec is its own dogfood: we use the SDD loop we ship. The historical `specs/` directory is frozen as a snapshot of pre-migration work; new specs are GitHub issues. This is the same shape as Onsager's and Duhem's loops — the area taxonomy and toolchain checks are lean-spec-specific.

## The loop

```
     ┌─────────────────────────────────────────────────────────────────┐
     │                                                                 │
     │   idea/request                                                  │
     │        ↓                                                        │
     │   spec(<area>): ...    ← issue-spec skill                       │
     │        │                                                        │
     │        ↓                                                        │
     │   branch + implement                                            │
     │        │                                                        │
     │        ↓                                                        │
     │   leanspec-pre-push    ← merge preview, typecheck, test, clippy │
     │        │                                                        │
     │        ↓                                                        │
     │   git push → open PR (body: "Closes #N" or "Part of #N")        │
     │        │                                                        │
     │        ↓                                                        │
     │   leanspec-pr-lifecycle   ← CI triage, review, iterate          │
     │        │                                                        │
     │        ↓                                                        │
     │   merge                                                         │
     │        │                                                        │
     │        │ Closes #N → GitHub auto-closes spec                    │
     │        │ Part of #N → tick Plan items manually (pr-lifecycle)   │
     │        ↓                                                        │
     │   spec closed (Closes) OR Plan items ticked (Part of)           │
     │                                                                 │
     └─────────────────────────────────────────────────────────────────┘
```

## Stages

### 1. Write the spec

Trigger `issue-spec` (or say "spec this"). It creates a GitHub issue on `codervisor/leanspec` with:

- `## Overview`, `## Design`, `## Plan`, `## Test`, `## Alignment`, `## Notes`
- `## Provider impact` when the change touches the provider seam
- Open questions live under `## Alignment` as a `### Open questions` subsection (omit if none) — `leanspec-pre-push` blocks on unresolved items there.
- Labels: `spec`, one type (`feat` / `fix` / `refactor` / `perf`), one or more `area:*`, one `priority:*`. The full area taxonomy lives in `issue-spec`'s SKILL.md.

Hard rule: no spec → no PR, unless the PR is labeled `trivial` (typos, doc-only fixes, one-line obvious bug repair).

Body size: <~2000 tokens. Larger features split into parent + sub-issues via `mcp__github__sub_issue_write`. The SDD loop runs independently on each sub-issue; the parent tracks overall progress.

If the spec touches the **provider abstraction** — types in `packages/ui/src/types/specs.ts`, the provider trait in `rust/leanspec-core/`, or anything else that crosses the markdown/github backend seam — it must include `## Provider impact`. This is lean-spec's analogue of Duhem's schema-impact rule: the provider seam is the central product promise (CLI/MCP/UI behave identically across backends), so changes to it are tracked explicitly.

If the spec adds or changes **user-visible strings**, the Plan must include locale updates for both `en` and `zh-CN`, and the `i18n` label is applied. The `leanspec-development` skill's [I18N.md](../leanspec-development/references/I18N.md) is canonical.

### 2. Resolve open questions

Before opening a PR, resolve any open questions on the spec issue thread. A spec with unanswered `### Open questions` is not ready to implement — its design isn't pinned yet.

### 3. Branch and implement

Branch naming convention:

- Human-owned branches: any name following `<type>/<short-description>` (e.g. `feat/github-provider`, `fix/cli-help-text`).
- Claude-owned branches: `claude/spec-<N>-<slug>` or `claude/<descriptor>`. The harness enforces the `claude/` prefix on cloud sessions.

Implement the spec's Plan items in order. Keep commits small and focused. Commit messages: imperative mood, <72 chars, types `feat` / `fix` / `refactor` / `test` / `docs` / `chore` / `ci` / `perf` (matches `codervisor/CLAUDE.md`).

**Provider-agnostic core discipline.** When working in `area:provider` or `area:core`, the lean-spec invariant is that backend-specific concerns don't leak upward. Markdown-specific frontmatter parsing belongs in the markdown provider; github-specific issue mapping belongs in the github provider; both expose the same `LightweightSpec` / `Spec` shape upward. A change that adds a backend-typed field to a shared type is a regression of this invariant and must be called out in `## Provider impact`.

**i18n discipline.** No user-visible string ships in only one locale. The `leanspec-development` skill's RULES.md lists this as a mandatory rule; CI enforces parity for the locale files it knows about.

**Rust discipline.** All Rust code must pass `cargo clippy -- -D warnings`. Functions with >7 args use a params struct (enforced by `clippy.toml`). Don't `#[allow(dead_code)]` or `#[allow(unused)]` past a clippy warning — fix the root cause.

### 4. Pre-push

Trigger `leanspec-pre-push` (or say "ready to push"). The full checklist is in that skill; in summary:

1. Sync `origin/main` into the branch (CI tests a merge preview, not the branch alone). Resolve conflicts locally, never on the PR web editor.
2. `pnpm typecheck` (never skip before marking complete).
3. `pnpm pre-push` (typecheck + clippy).
4. `pnpm test` for the affected packages.
5. `pnpm format:rust:check` for Rust changes.
6. Verify a spec issue is linked, or that the PR will be labeled `trivial`.
7. If the spec is labeled `provider-impact` or `i18n`, confirm the corresponding evidence is in the PR.

Don't paper over warnings with `--no-verify`. If a hook fails, investigate.

### 5. Open the PR

PR body must begin with a linking line:

| PR delivers                                         | Use            |
| --------------------------------------------------- | -------------- |
| The full spec / acceptance test / vertical slice    | `Closes #N`    |
| A bug fix for a specific defect                     | `Fixes #N`     |
| Scaffolding / one phase of a multi-phase spec       | `Part of #N`   |
| Related work that shouldn't close the spec          | `Refs #N`      |

Under `## Delivers`, list the Plan items this PR ticks (exact text from the spec's Plan). After merge, tick those checkboxes manually on the parent spec — see `leanspec-pr-lifecycle`.

If the PR is genuinely trivial (typo, doc-only, one-line obvious fix), apply the `trivial` label and skip the spec-linking requirement. Use sparingly — if reviewers flag it as needing context, escalate to a spec.

**Decide before opening, not after.** Answer the spec-vs-trivial gate at PR creation: pass `Closes #N` / `Part of #N` in the PR body, or pass `labels: ["trivial"]` to `mcp__github__create_pull_request`. Don't push and let a reviewer ask.

### 6. During review

Trigger `leanspec-pr-lifecycle` (or say "triage PR" / "CI is failing" / respond to a webhook). It covers:

- CI triage: build / test / lint / i18n-parity failures.
- Review-comment discipline: fix the code, don't reply per comment.
- Webhook subscription to stream CI + review events.

### 7. Merge

- `Closes #N` PRs auto-close the spec on merge.
- `Part of #N` / `Refs #N` PRs leave the spec open; tick the delivered Plan items manually on the parent spec, and if all sub-issues of a parent are closed, ping the parent. See `leanspec-pr-lifecycle`.
- For PRs labeled `provider-impact`, append the change to `CHANGELOG.md` under the next-version heading. The `leanspec-development` skill's "Changelog" section is the format reference.

### 8. Closed-unmerged path

If you close a PR without merging (e.g. abandoned approach), the spec issue stays open as-is — the next implementer can pick it up from there.

## The `trivial` escape hatch

Not every change needs a spec. The `trivial` label on a PR explicitly opts out. Use for:

- Typos in comments, docs, commit messages.
- One-line obvious bug fixes where the repro is in the diff itself.
- Formatting-only changes.
- Dependency version bumps (unless they break APIs).

Do NOT use for:

- Anything touching multiple files.
- Anything that changes the provider abstraction.
- Anything adding or changing a user-visible string (i18n parity is mandatory).
- Anything that could plausibly merit a follow-up.

When in doubt, write the spec.

## Issue progress is the source of truth

A spec issue's open/closed state plus its Plan checkboxes are the source of truth. Use `Closes #N` only on a PR that delivers the final unticked Plan items, so GitHub's auto-close fires once the spec is actually complete; use `Part of #N` for partial slices that leave items behind, then tick the delivered checkboxes manually on merge. If a multi-PR spec finishes via `Part of` PRs only, a human closes the parent once the last Plan item ticks. Plan-item ticks on merge are manual; `leanspec-pr-lifecycle` covers the mechanics.

## Anti-patterns (don't)

- **PR without a spec and no `trivial` label.** Reviewers will ask; the PR should not merge until the author either adds a spec link or the `trivial` label.
- **Closing a spec manually when you meant `Closes #N`.** Let GitHub do it via the PR merge so the timeline has the auditable link.
- **Editing Plan checkboxes to mark items done before the PR merges.** Tick them on merge, not before.
- **Provider change without `## Provider impact` callout.** The provider seam is the central product promise; mis-tracking a change to it corrupts the signal for users adopting different backends.
- **User-visible string in only one locale.** Both `en` and `zh-CN` ship together, every time.
- **Skipping `leanspec-pre-push`.** Even a thin checklist catches the cheap mistakes; the typecheck/clippy gate exists because CI re-runs these and slow CI cycles cost more than local cycles.
- **Authoring a new `specs/NNN-slug/` directory.** The file-based corpus is frozen post-migration. New work is GitHub issues.

## Delegation map

| Stage                                       | Skill / workflow                                                |
|---------------------------------------------|-----------------------------------------------------------------|
| Write the spec                              | [`issue-spec`](https://github.com/onsager-ai/dev-skills/blob/main/skills/issue-spec/SKILL.md) (installed globally from `onsager-ai/dev-skills`) |
| Commands, CI, publishing, i18n              | [`leanspec-development`](../leanspec-development/SKILL.md)      |
| Pre-push checks                             | [`leanspec-pre-push`](../leanspec-pre-push/SKILL.md)            |
| CI triage, review, iterate                  | [`leanspec-pr-lifecycle`](../leanspec-pr-lifecycle/SKILL.md)    |
| On PR merge → tick Plan items               | [`leanspec-pr-lifecycle`](../leanspec-pr-lifecycle/SKILL.md) (manual) |
| GitHub CLI / cloud auth                     | [`github-integration`](https://github.com/onsager-ai/dev-skills/blob/main/skills/github-integration/SKILL.md) (installed globally from `onsager-ai/dev-skills`) |

## Relationship to Onsager / Duhem dev process

Lean-spec, Onsager, and Duhem share the SDD shape but live in separate repos with separate skills. When working on lean-spec, use **this** loop. The methodology itself comes from lean-spec — Onsager and Duhem are downstream adopters of the framework lean-spec defines. That's another reason to dogfood it here: if the SDD loop is awkward on lean-spec's own repo, that's a signal for the next iteration of the product.
