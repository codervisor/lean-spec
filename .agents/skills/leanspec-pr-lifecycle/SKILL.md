---
name: leanspec-pr-lifecycle
description: Manage a lean-spec PR after it's been pushed — spec-issue linking, CI triage, review-comment discipline, merge-conflict recovery on open PRs, webhook subscription, and CHANGELOG follow-through on merge. Triggers include "CI is failing", "check is red", "link this issue", "Closes vs Part of", "respond to review", "subscribe to PR", "triage PR", "the PR is ready", "PR has conflicts", "branch has conflicts with main", "merge conflict on the PR", or when a github-webhook-activity event arrives on a lean-spec PR. Paired with `leanspec-dev-process` (overall loop), `issue-spec` (spec creation), and `leanspec-pre-push` (which owns the pre-push conflict walkthrough).
metadata:
  internal: true
---

# leanspec-pr-lifecycle

Everything that happens after `git push` on a lean-spec PR. Covers spec-issue linking, CI triage, review-comment discipline, webhook subscription, and the manual ticking of Plan items / CHANGELOG entries on merge.

This is lean-spec's analogue of `onsager-pr-lifecycle` / `duhem-pr-lifecycle`. The discipline is the same.

## Tool discipline

- **No `gh` CLI for issue/PR manipulation, no `hub`, no direct GitHub API.** Always use `mcp__github__*`. The `gh` CLI is fine for CI workflow inspection (`gh run list`, `gh run view`) — see [`leanspec-development`](../leanspec-development/SKILL.md) "CI/CD"; it's just not the tool for spec-label updates or PR body edits.
- Scope is restricted to `codervisor/leanspec` for this skill.
- Don't open PRs unless the user explicitly asks. Creating one is a one-way door in this project's workflow.

## Spec-issue linking (mandatory)

Every PR must either:

1. Link to a spec issue in its body via `Closes #N` / `Fixes #N` / `Resolves #N` (slice complete) or `Part of #N` / `Refs #N` (scaffolding), **OR**
2. Carry the `trivial` label (typo, doc-only, one-line obvious fix).

If neither, the PR is out of process. Comment on the PR asking the author to add a spec link — creating one via `issue-spec` if none exists — or apply the `trivial` label.

### Which keyword to use

GitHub closes issues on merge when the PR body contains one of: `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved` — followed by `#N`.

Pick the keyword based on **what this PR actually delivers**:

| PR delivers                                                  | Use         |
| ------------------------------------------------------------ | ----------- |
| The acceptance test / vertical slice the spec asks for       | `Closes #N` |
| A bug fix for a specific defect                              | `Fixes #N`  |
| Scaffolding / one phase of a multi-phase spec                | `Part of #N`|
| Related work that shouldn't close the spec                   | `Refs #N`   |

`Part of` / `Refs` are **not** auto-close keywords — they just cross-link in the UI. Use them for scaffolding so the spec stays open for the real slice.

Edit the PR body via `mcp__github__update_pull_request` (don't open a new PR just to fix the link). Put the linking line at the top of the body.

### Multi-issue PRs — enumerate every closure

If a single PR delivers acceptance for more than one issue, write **one `Closes` keyword per issue**:

```markdown
Closes #27, Closes #30, Closes #33
```

GitHub only honors auto-close on each `#N` individually; `Closes #27, #30, #33` closes #27 and leaves #30/#33 open.

### The `## Delivers` subsection

For `Part of #N` PRs (and ideally all PRs), include a `## Delivers` subsection in the body listing the exact Plan items this PR ticks. Copy the item text verbatim from the spec's `## Plan`, but mark each as `- [x]`. Use this list to tick the parent spec's checkboxes after merge — see "Issue progress" below.

Example PR body:

```markdown
Closes #142

## Delivers
- [x] Implement `GithubProvider::list_specs` in `rust/leanspec-core/src/providers/github.rs`
- [x] Add `--provider=github` flag to `leanspec init`
- [x] Update `locales/en.json` and `locales/zh-CN.json` with provider-picker copy

## Provider impact
- Types added: `ProviderKind::Github`, `GithubProviderConfig`
- Trait changes: none (implements existing `Provider` trait)
- Breaking change? no

## Summary
First slice of the github provider. List-only; CRUD lands in a follow-up.
```

### `## Provider impact` in the PR body

If the linked spec is labeled `provider-impact`, the PR body must include a `## Provider impact` subsection (it's fine to copy the spec's own subsection verbatim). This makes provider changes visible in the PR diff itself, not just on the linked issue, so reviewers don't have to context-switch.

If `Breaking change? yes`, the PR must also touch `CHANGELOG.md` under the next `[Unreleased]` heading. Comment on the PR if either is missing.

## Issue progress

Spec issues use only their open/closed state — no status labels. Lifecycle moves:

- PR merged with `Closes #N` → issue auto-closes (GitHub).
- PR merged with `Part of #N` → spec stays open; tick the delivered Plan items on the parent manually (see below).
- PR closed unmerged → spec issue stays open as-is.

When a PR is merged with `Part of #N` (parent stays open):

1. Read the merged PR's `## Delivers` subsection.
2. For each item, find the matching `- [ ]` line in the parent spec's `## Plan` section and flip it to `- [x]`.
3. Edit the spec body via `mcp__github__issue_write`.

When a PR is merged with `Closes #N`:

1. GitHub auto-closes the spec.
2. If the spec is part of a tracker (umbrella) issue, see the "Tracker refresh" section below.
3. If the spec was labeled `provider-impact` with `Breaking change? yes`, confirm a CHANGELOG entry landed; if not, file a follow-up PR adding it.

## Tracker refresh

Some issues are **umbrella trackers** that reference several sub-issues as a checklist — identified by a `[Tracking]` title prefix, a `tracking` label, or a `## Progress` section whose items are `- [ ] #N` lines. When a PR closes a sub-issue, the tracker does **not** update itself.

After merge, for each auto-closed or explicitly-closed issue:

1. Search for umbrella trackers that reference it: `mcp__github__search_issues` with `repo:codervisor/leanspec #N in:body is:issue is:open`.
2. For each match, read the tracker body. If there's a matching `- [ ] ... #N ...` line in a Progress / Plan section, flip it to `- [x]`.
3. Post one tracker comment summarizing the delta, not one per issue: "PR #<pr> landed #N1, #N2, #N3; ticked in Progress."
4. If after the tick every sub-issue is closed, note that the tracker itself is now a candidate for closure — don't close it unilaterally, just flag it.

## CI triage

CI on this repo runs from `.github/workflows/`. The relevant workflows are listed in [`leanspec-development`](../leanspec-development/SKILL.md) "CI/CD"; the patterns below are what fails most often:

| Symptom                                                      | Usual cause                                                      |
|--------------------------------------------------------------|------------------------------------------------------------------|
| `pnpm typecheck` fails on CI, passes locally                 | CI built the merge preview; main has drifted. `git fetch origin main && git merge origin/main` on the branch, re-run typecheck, push. |
| `cargo clippy -- -D warnings` fails                          | A warning slipped in (often `unused_imports` or `dead_code`). Fix the root cause; never `#[allow]` past it. |
| i18n parity check fails                                      | A key was added to `en.json` but not `zh-CN.json` (or vice versa). Add the missing key, even as a placeholder + `// TODO(i18n)` comment. |
| Test suite times out on Rust integration tests               | Usually a tokio runtime blocking issue. Check for `block_on` inside an async context. |
| Workspace protocol validation fails                          | `scripts/validate-no-workspace-protocol.ts` flagged a `workspace:*` in a published package. Run `pnpm sync-versions` to resolve. |
| Platform binary validation fails                             | Rust binaries weren't copied for all 5 platforms. See [`NPM-DISTRIBUTION.md`](../leanspec-development/references/NPM-DISTRIBUTION.md). |
| Desktop build fails                                          | Tauri toolchain difference; rarely a code bug. See [`CI-TROUBLESHOOTING.md`](../leanspec-development/references/CI-TROUBLESHOOTING.md). |

### Accessing logs

`WebFetch` **cannot read authenticated GitHub Actions logs** — both the run pages and the API logs endpoint return 403. Don't waste time on them. Work instead from:

1. `mcp__github__pull_request_read` with `method: get_check_runs` — gives step name, status, timings.
2. The `gh` CLI in this repo's sessions (when available): `gh run view <run-id> --log-failed`. See [`CI-COMMANDS.md`](../leanspec-development/references/CI-COMMANDS.md).
3. **Local reproduction** after syncing main. Re-run the failing step with the exact flags from the workflow yaml.

## Merge conflicts on an open PR

When GitHub shows "This branch has conflicts that must be resolved" or `mcp__github__pull_request_read` reports `mergeable: false`, resolve **locally** — the GitHub web editor bypasses any local validation and routinely lands broken merges.

1. **Don't** use `mcp__github__update_pull_request_branch` to auto-merge main in via GitHub. That surfaces the same conflicts without giving you the resolution workspace, then commits a broken merge if you accept the default.

2. Check out the branch locally and run the full conflict walkthrough in [`leanspec-pre-push`](../leanspec-pre-push/SKILL.md) (step 1, "Resolving conflicts").

3. After the merge commit lands, continue with the rest of `leanspec-pre-push` (typecheck, test, clippy, spec-link, provider/i18n evidence) before pushing.

4. Push the merge commit to the same branch with `git push` (no `--force`). The existing PR updates in place; the conflict banner clears when GitHub re-evaluates.

5. If the PR is tied to a `Closes #N` / `Part of #N` line and the merge touched the spec's surface area (provider types, i18n keys), comment on the spec flagging what drifted, so the parent stays accurate.

If the branch is so far behind main that the conflict set is large (>10 files), close the PR, rebase the work into a fresh branch from `origin/main`, and open a new PR with the same linking line. Note the close reason on the old PR.

## Review comments

**Fix the code. Don't reply per comment.** Multiple reviewers (Copilot + human) often flag the same defect; a single commit that fixes it resolves all of them at once.

Reply *only* when:

- Declining a suggestion (explain why, briefly).
- The comment is a question, not a bug report.
- Asking for clarification before acting.

Use `mcp__github__add_reply_to_pull_request_comment` for threaded replies, never top-level comments unless summarizing multiple responses at once.

If a review comment raises a design concern that the spec didn't address, pause and update the linked spec issue (add an open question under `## Alignment`, comment on the spec, let a human decide). Don't silently expand scope in the PR.

## Webhook subscription

Events from CI and reviewers arrive wrapped in `<github-webhook-activity>` tags. The harness forwards them as user messages.

- Subscribe once per PR with `mcp__github__subscribe_pr_activity` after the PR is created (or the user asks you to watch it).
- Unsubscribe with `mcp__github__unsubscribe_pr_activity` when done — not strictly necessary but cleaner.
- Events are already filtered to CI failures + reviews. Treat each as actionable; skip only if it's a duplicate of one you just addressed.

## Reporting back to the user

After handling a webhook event, end with one or two sentences: what the failure was, what you changed, whether CI is re-running. Don't dump the full commit message in chat — the user can see it on the PR.

## Relationship to other skills

| Related surface                                                      | Role                                                                                              |
|----------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| [`leanspec-dev-process`](../leanspec-dev-process/SKILL.md)           | Top-level SDD loop; points here for the post-push stage.                                          |
| [`issue-spec`](https://github.com/onsager-ai/dev-skills/blob/main/skills/issue-spec/SKILL.md) | Creates the spec issue this PR links to. Installed globally from `onsager-ai/dev-skills`.         |
| [`leanspec-pre-push`](../leanspec-pre-push/SKILL.md)                 | Runs before `git push`; enforces the spec-link check locally and owns the conflict walkthrough.   |
| [`leanspec-development`](../leanspec-development/SKILL.md)           | Commands, CI workflows, publishing, changelog format, runner research.                            |
| [`github-integration`](https://github.com/onsager-ai/dev-skills/blob/main/skills/github-integration/SKILL.md) | `gh` CLI in cloud sessions (CI inspection only — not for issue/PR mutation). Installed globally from `onsager-ai/dev-skills`. |
