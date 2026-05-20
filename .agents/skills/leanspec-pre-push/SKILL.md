---
name: leanspec-pre-push
description: Run before pushing code to the lean-spec repo to catch what reviewers and CI will catch later, and confirm the branch has a linked spec issue in a valid state. Reproduces the merge-preview environment, walks through this repo's common merge-conflict patterns, and runs the project's typecheck / clippy / test gates. Triggers include "before push", "ready to push", "pre-push check", "push readiness", "prep for PR", "resolve merge conflict", "merge conflict", "branch has conflicts", "sync with main", or proactively before any git push on a lean-spec branch.
metadata:
  internal: true
---

# leanspec-pre-push

Mechanical checklist that catches the reviewer / CI failures this repo has actually had, plus a spec-link check that enforces the SDD loop locally.

This is lean-spec's analogue of `onsager-pre-push` / `duhem-pre-push`. The discipline is the same; the toolchain checks are lean-spec's (pnpm + cargo). The repo-specific patterns below come from this monorepo's structure (TypeScript packages, Rust crates, i18n locale files, schemas).

## Why

CI on `pull_request` checks out a **merge of `origin/main` + the PR branch**, not the branch alone. Local `pnpm typecheck` without that merge is insufficient.

The spec-link step enforces "no PR without a spec or a `trivial` label" at push time, before the PR is open — so the author sees the problem locally instead of hearing about it from a reviewer.

## Steps

Run all of these from the repo root.

### 1. Sync main into the branch

```bash
git fetch origin main
git merge origin/main --no-edit
```

Resolve conflicts **locally**, before push — never on the PR "Resolve conflicts" web editor (it bypasses any local validation). If the merge aborts cleanly, skip to step 2.

#### Resolving conflicts

1. **Inventory** what conflicted:

   ```bash
   git status --short                   # U* lines = unresolved paths
   git diff --name-only --diff-filter=U
   ```

2. **Work by pattern, not by file.** A single logical conflict often spans several files. Match what you see against the patterns below before touching conflict markers — the right fix is often "take main's version and re-apply your change on top", not a line-by-line merge.

3. **Resolve**, then stage each resolved path with `git add <path>`. Re-run `git status` until no `U*` entries remain.

4. **Verify before committing the merge.** Run `pnpm typecheck && pnpm pre-push`. Run `pnpm test` for the affected packages. If the merge touched Rust, also run `pnpm build:rust` and `pnpm test:rust`.

5. Only then:

   ```bash
   git commit --no-edit                 # default "Merge branch 'main' ..." message
   ```

6. **If you get lost**, bail and retry:

   ```bash
   git merge --abort
   ```

   This restores pre-merge state. Never `git reset --hard` or `git checkout --` without confirming nothing is staged you care about — the merge carries uncommitted resolutions.

   Prefer `merge` over `rebase` for syncing main here: the branch is likely already pushed, rebase rewrites history, and force-push is a destructive action.

#### Common collision patterns to watch for

- **`CHANGELOG.md`**: both branches added entries under the same `[Unreleased]` heading. Both should land — concatenate alphabetically by category (**Added**, **Changed**, **Fixed**, …).
- **`package.json` version field**: never resolve by hand. Run `pnpm sync-versions` to re-derive from the root version. See [`leanspec-development`](../leanspec-development/SKILL.md) "Publishing & Releases".
- **`pnpm-lock.yaml`**: never hand-edit. After resolving the source `package.json` conflicts, run `pnpm install` to regenerate the lockfile, then `git add pnpm-lock.yaml`.
- **`Cargo.lock`**: never hand-edit. After resolving Rust `Cargo.toml` conflicts, run `pnpm build:rust` and let cargo regenerate.
- **`locales/en.json` and `locales/zh-CN.json`**: both branches added i18n keys. Both should land; verify each new key exists in *both* files. If one branch added a key only to `en` and the other added only to `zh-CN`, that's a process bug — fix the missing parity before committing the merge.
- **`schemas/*.json`**: JSON schema files. Both branches added fields. Merge by key; verify the schema still validates by running the validator (when wired) or `pnpm typecheck` to confirm the generated TypeScript types still compile.
- **Generated `packages/**/dist/`**: don't merge. Delete the conflict and rerun `pnpm build`.
- **`specs/` legacy directory**: don't author new files here post-migration. If a conflict exists in `specs/` because both branches added a new `specs/NNN-slug/`, the correct fix is usually to delete both new directories and migrate them to GitHub issues via `issue-spec`. If they pre-date migration, take both arms.

### 2. Build / typecheck / test

Run, in order:

```bash
pnpm typecheck             # mandatory before marking work complete
pnpm pre-push              # typecheck + clippy
pnpm test                  # full Vitest suite
pnpm format:rust:check     # if Rust changed
pnpm test:rust             # if Rust changed
```

If the change touches the desktop bundle (`packages/desktop/`), also run `pnpm dev:desktop` smoke check.

Treat **any** warning as a blocker. Do not `#[allow(dead_code)]`, `#[allow(unused)]`, or `@ts-ignore` your way past it; fix the root cause. Rust clippy is `-D warnings` — warnings are errors.

### 3. i18n parity check

If the diff touches user-visible strings:

1. Locale files live under `locales/en.json` and `locales/zh-CN.json` (and any per-package equivalents — see [`I18N.md`](../leanspec-development/references/I18N.md)).
2. For every key added in `en.json`, confirm the same key exists in `zh-CN.json`. Translation can be a placeholder + a `// TODO(i18n)` comment, but the key must exist — CI will fail if `zh-CN` is missing keys.
3. If you added a new locale file, add it to whatever locale-loader registers them.

### 4. Spec-issue link check

Before pushing, confirm this branch corresponds to a known spec issue (or is explicitly trivial). This is the local enforcement of the SDD loop's spec-link rule.

1. **Find the spec issue.** Search open issues with the `spec` label on `codervisor/leanspec`:

   ```
   mcp__github__list_issues  repo=codervisor/leanspec  labels=[spec]  state=open
   ```

   Or read your commit messages (`git log origin/main..HEAD`) for a `#N` reference.

   If you can't find one, stop and create one via `issue-spec` (or triage whether this is truly `trivial`).

2. **Confirm any open questions on the spec are resolved.** If the spec's `### Open questions` subsection still has unanswered items, stop and resolve them in the issue thread first — the design isn't pinned yet.

3. **Draft the PR body linking line** so you can paste it in:

   - `Closes #N` if this PR delivers the full spec.
   - `Part of #N` if it's one slice of a multi-PR spec.
   - `Fixes #N` for a defect referenced by a bug spec.

   Also draft a `## Delivers` subsection listing the exact Plan items you tick with this PR.

4. **Scan the branch's commit messages for implicit issue references** (advisory, not blocking):

   ```bash
   git log --format='%s%n%b' origin/main..HEAD | grep -oE '#[0-9]+' | sort -u
   ```

   For each `#N` returned, decide deliberately:

   - **PR delivers that issue's acceptance** → add `Closes #N` to the body. Multi-issue `Closes` lines are fine (`Closes #27, Closes #30, Closes #33`). Auto-close doesn't fire for issues that are only *mentioned* in commit subjects — without an explicit `Closes` line, those issues stay open after merge.
   - **PR only touches that issue** → use `Refs #N` so it cross-links without claiming closure.
   - **False positive** (issue number inside a code identifier, commit hash, etc.) → ignore.

5. **If this is genuinely trivial** (typo, doc-only, one-line obvious fix), skip the spec-link substeps above and plan to apply the `trivial` label to the PR immediately after `mcp__github__create_pull_request`.

### 5. Provider-impact and i18n evidence check

If the spec issue this PR closes is labeled `provider-impact`:

- Confirm `## Provider impact` is filled in on the spec.
- Confirm the PR body mirrors the relevant subset.
- If `Breaking change? yes` on the spec, confirm a CHANGELOG entry is staged for this PR under the next `[Unreleased]` heading. See [`leanspec-development`](../leanspec-development/SKILL.md) "Changelog".

If the spec issue is labeled `i18n`:

- Confirm both `locales/en.json` and `locales/zh-CN.json` (and any per-package locale files) contain the new keys.

### 6. Push

```bash
git push -u origin <branch>
```

Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s) on transient network errors. **Never** use `--force` on `main` or long-lived branches without explicit ask.

After push, open the PR with the spec-link line in its body (or apply the `trivial` label). The spec issue stays open until the PR closes it — no status labels to flip.

## Fast path

If nothing under tracked source paths changed (e.g. docs-only edits):

- Step 2 reduces to `pnpm typecheck` if any docs touch typed config; otherwise it's a no-op.
- Step 1 (sync main) is **not** skippable — main may have moved.
- Step 4 (spec-link) is **not** skippable for non-trivial PRs.

## What this skill does NOT cover

- Writing the spec issue — see [`issue-spec`](https://github.com/onsager-ai/dev-skills/blob/main/skills/issue-spec/SKILL.md) (installed globally from `onsager-ai/dev-skills`).
- Opening or managing the PR — see [`leanspec-pr-lifecycle`](../leanspec-pr-lifecycle/SKILL.md).
- The end-to-end dev loop — see [`leanspec-dev-process`](../leanspec-dev-process/SKILL.md).
- Commands, CI workflows, publishing pipelines — see [`leanspec-development`](../leanspec-development/SKILL.md).
- GitHub CLI in cloud sessions — see [`github-integration`](https://github.com/onsager-ai/dev-skills/blob/main/skills/github-integration/SKILL.md) (installed globally from `onsager-ai/dev-skills`).
