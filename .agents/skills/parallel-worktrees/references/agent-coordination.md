# Agent Coordination Reference

Patterns for managing multiple AI agent sessions running in parallel — how to
keep them from stepping on each other, how to hand off work between them, and
how to assemble their outputs.

## Table of Contents
1. [Core principle](#core-principle)
2. [Scoping sessions](#scoping-sessions)
3. [Dependency ordering](#dependency-ordering)
4. [Handoff patterns](#handoff-patterns)
5. [Avoiding conflicts](#avoiding-conflicts)
6. [Reviewing parallel outputs](#reviewing-parallel-outputs)
7. [Sequencing vs true parallelism](#sequencing-vs-true-parallelism)

---

## Core Principle

**Agents do not communicate with each other.** There is no message-passing,
no shared memory, no live coordination channel between concurrent sessions.
Each agent sees only its own worktree.

All coordination happens through artifacts visible to humans and to future
agents:
- **Branch names** — declare ownership and intent
- **PR descriptions** — communicate scope, dependencies, related work
- **PR comments** — status updates, blockers, completion signals
- **Commit messages** — record decisions made during the session

Design your parallelism so that sessions are independent. If they're not
independent, sequence them — don't try to coordinate live.

---

## Scoping Sessions

A session brief should answer:
1. **What directory** — the worktree path (absolute)
2. **What branch** — the agent's branch name
3. **What to do** — a bounded task description
4. **What not to touch** — explicit out-of-scope areas
5. **What depends on what** — if this session depends on another PR merging first

Example brief:
```
Working directory: /home/user/myrepo-wt/feat/auth
Branch: feat/auth
Task: Implement JWT authentication in packages/api/src/auth/*.ts.
Do not modify packages/ui or the database schema.
This session is independent — no upstream merges required.
```

A well-scoped session is one where the agent can complete its work, open a PR,
and never need to look at another worktree.

---

## Dependency Ordering

When sessions are not independent, make the dependency explicit and sequence
the dependent work:

### Pattern A: Sequential hand-off

```
Session 1: feat/db-schema   → merge first
Session 2: feat/auth         → starts after Session 1 merges
```

Workflow:
1. Start Session 1.
2. While Session 1 is running, *plan* Session 2 but don't start it yet.
3. When Session 1's PR merges, pull main, then start Session 2.

### Pattern B: Parallel with rebase gate

Sessions are parallel but one must rebase on the other before merging:

```
Session 1: feat/user-model
Session 2: feat/profile-page  (depends on user-model types)
```

1. Run both sessions in parallel.
2. Merge Session 1 first.
3. In Session 2's worktree: `git fetch origin && git rebase origin/main`
4. Then merge Session 2.

### Pattern C: Stacked PRs (advanced)

Session 2's branch is based on Session 1's branch, not main:

```bash
# Session 2 is based on Session 1's branch
git worktree add ../myrepo-wt/feat/profile -b feat/profile feat/user-model
```

PR for Session 2 targets `feat/user-model`, not `main`. After Session 1
merges, change Session 2's PR base:

```bash
gh pr edit <pr-number> --base main
```

Use stacked PRs sparingly — they require careful ordering and rebase discipline.

---

## Handoff Patterns

### Agent completes, human reviews, another agent continues

1. Agent 1 finishes, commits, opens PR.
2. Human reviews the PR (or uses an agent to review).
3. PR merges.
4. Human starts Agent 2, briefed to `git fetch origin && git rebase origin/main`
   first to incorporate Agent 1's work.

### Agent produces an artifact for another agent

Avoid sharing artifacts by reading files across worktrees. Instead:
- Agent 1 commits the artifact, opens a PR.
- PR merges to main.
- Agent 2 starts fresh from main (or rebases) and reads the committed artifact.

If the artifact is large or a PR would be too noisy, consider a shared
temporary branch:

```bash
# Agent 1 pushes to a staging branch
git push origin feat/shared-types

# Agent 2 rebases on the staging branch
git rebase origin/feat/shared-types
```

This is an edge case — prefer merging to main first.

---

## Avoiding Conflicts

### File-level isolation (preferred)

Assign each session to a non-overlapping set of files or directories:

```
Session 1: packages/api/src/auth/
Session 2: packages/api/src/payments/
Session 3: packages/ui/src/components/
```

When you can't avoid overlap on a shared file (e.g., `index.ts`, `routes.ts`):
- Only one session touches the shared file.
- Other sessions import from it but don't modify it.
- Or: sequence the sessions that touch the shared file.

### Config and generated files

These are common conflict magnets:
- `package.json` / `pnpm-lock.yaml` — run only one session that installs deps
- `prisma/schema.prisma` — serialize DB schema changes; don't parallelize
- Auto-generated files (GraphQL types, OpenAPI clients) — regenerate once on
  main after all sessions merge

### Pre-merge checklist (per session)

Before marking a PR ready for merge:
- [ ] `git fetch origin && git rebase origin/main` — resolve any conflicts now
- [ ] Run tests in the worktree
- [ ] Check that no other open PR touches the same files (`gh pr list --json files`)

---

## Reviewing Parallel Outputs

When multiple sessions complete around the same time:

1. **Merge one at a time.** Don't merge all PRs simultaneously — the first
   merge changes main, which may conflict with the others.
2. **Rebase order matters.** After each merge, rebase the remaining PRs:
   ```bash
   git fetch origin && git rebase origin/main
   git push --force-with-lease
   ```
3. **Review in dependency order.** If sessions have dependencies (Pattern A/B
   above), review and merge the upstream session first.

### Using a review agent

You can run an agent on the review worktree to read a PR diff and leave
feedback:

```bash
# Checkout the PR locally
gh pr checkout <pr-number>   # this creates a local branch

# Or in a dedicated review worktree
git worktree add ../myrepo-wt/review/<pr-number> -b review/<pr-number>
cd ../myrepo-wt/review/<pr-number>
gh pr checkout <pr-number>
```

Brief the review agent with the PR number and what to focus on.

---

## Sequencing vs True Parallelism

Not all "parallel" work should actually run simultaneously. Use this guide:

| Scenario | Recommendation |
|----------|---------------|
| Completely independent files/modules | True parallel — all sessions at once |
| Shared config or schema changes | Sequential — one session at a time |
| Feature + its tests | Same session — keep them together |
| Refactor + new feature | Sequential — refactor first, then feature |
| Multiple bug fixes in unrelated files | True parallel |
| Two features that both modify `main.ts` | Sequential or assign `main.ts` to one session |
| Exploratory/experimental work | True parallel — each in `agent/experiment/<name>` branch |

The overhead of a worktree is low. When in doubt, serialize rather than
coordinate.
