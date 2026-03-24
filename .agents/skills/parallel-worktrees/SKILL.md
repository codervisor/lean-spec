---
name: parallel-worktrees
description: >
  Run multiple AI coding agent sessions in parallel using git worktrees — each
  agent isolated in its own worktree, working on a separate branch. Use this
  skill whenever the user wants to: run two or more AI agents simultaneously on
  different features or bugs, set up isolated agent workspaces in the same repo,
  push parallel branches to GitHub and open/update PRs, coordinate between
  concurrent agent sessions, or clean up after merging. Triggers on: "parallel
  agents", "multiple agent sessions", "git worktree", "run agents in parallel",
  "work on two things at once", "isolated agent workspace", "spin up another
  agent", or any request involving simultaneous AI-assisted development streams.
metadata:
  author: Codervisor
  version: 0.1.0
  homepage: https://github.com/codervisor/forge
---

# Parallel Worktrees

Run multiple AI coding sessions in parallel — each isolated in its own git
worktree, pushing to its own branch, opening its own PR.

## When to Use This Skill

Activate when:
- User wants to run two or more AI agents on different features/bugs at once
- User asks about `git worktree` for agent sessions
- User wants parallel PRs from a single repo without multiple clones
- User needs to set up, coordinate, or clean up concurrent agent workspaces

## Decision Tree

```
What does the user need?

Start a new parallel session?
  → Create a worktree + branch (Lifecycle §1–2)
  → Open a terminal/agent session pointed at the worktree path
  → Brief the agent: "Work only in <worktree-path>. Branch: <branch-name>."

Push and open a PR?
  → git push -u origin <branch>
  → gh pr create (GitHub PR Sync reference)
  → Note related PRs in the description

Sync a worktree with the latest main?
  → Inside the worktree: git fetch origin && git rebase origin/main
  → Never merge across worktrees directly

Merge and clean up?
  → Merge PR on GitHub
  → git worktree remove <path> && git branch -d <branch>
  → git worktree prune

Hit an error?
  → "already checked out" → branch open elsewhere; use a new branch name
  → ".git/index.lock" → two processes on same worktree; one agent per worktree
  → Detached HEAD → git switch -c <new-branch> inside the worktree
  → Stale entry after dir deleted → git worktree prune
```

## Core Concepts

**Worktree vs clone** — A worktree shares the same `.git` directory as the
main checkout. No double-fetch, no disk waste. Each worktree checks out a
*different* branch. Isolated at the filesystem level; same object store.

**One agent, one worktree, one branch** — This is the cardinal rule. Two
agents sharing a worktree will corrupt each other's index. Two agents on the
same branch will produce conflicting history.

**PRs as the coordination channel** — Agents communicate intent through PR
titles, descriptions, and comments — not through shared files or direct
worktree reads.

## Layout Convention

Keep worktrees as siblings of the repo root to avoid `.gitignore` noise:

```
~/projects/
  myrepo/              ← main checkout (main branch)
  myrepo-wt/           ← worktree root (sibling dir)
    feat/auth/         ← worktree for branch feat/auth
    fix/login-bug/     ← worktree for branch fix/login-bug
```

## Lifecycle

### 1. Create a worktree

```bash
# New branch (most common)
git worktree add ../myrepo-wt/feat/auth -b feat/auth

# From an existing remote branch
git worktree add ../myrepo-wt/fix/login-bug origin/fix/login-bug
```

### 2. Brief the agent

Give the agent its workspace clearly:

```
Working directory: /home/user/projects/myrepo-wt/feat/auth
Branch: feat/auth
Scope: implement JWT authentication — do not touch files outside this scope
```

The agent operates entirely within this directory. It should have no awareness
of other worktrees.

### 3. Work and commit

Normal git flow inside the worktree — the agent uses `git add`, `git commit`
as usual. The branch is isolated from main and all sibling worktrees.

### 4. Push and open PR

```bash
git push -u origin feat/auth
gh pr create \
  --title "feat(auth): implement JWT login" \
  --body "Parallel session. Related: #<pr-number> (if any)."
```

See `references/github-pr-sync.md` for draft PRs, PR templates, and linking.

### 5. Sync with main

```bash
# Inside the worktree
git fetch origin
git rebase origin/main   # keep history linear
```

Run this before opening a PR and before the final merge.

### 6. Merge and clean up

After the PR merges on GitHub:

```bash
# From the main repo (not inside the worktree)
git worktree remove ../myrepo-wt/feat/auth
git branch -d feat/auth
git worktree prune          # removes stale metadata entries
```

## Branch Naming

Use a consistent pattern so agents (and humans) can parse ownership at a
glance:

```
<type>/<scope>/<short-description>

feat/auth/jwt-login
fix/api/null-pointer
chore/deps/upgrade-pnpm
agent/experiment/refactor-parser   ← for exploratory agent sessions
```

## Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `fatal: 'branch' is already checked out` | Branch open in another worktree | Use a new branch name |
| `.git/index.lock` errors | Two processes on same worktree | One agent per worktree |
| Detached HEAD | Created from a commit SHA, not a branch | `git switch -c <new-branch>` |
| Worktree path gone after reboot | Dir deleted externally | `git worktree prune`, then recreate |
| `git worktree list` shows stale entries | Dir removed without `git worktree remove` | `git worktree prune` |
| Agent edits files in main checkout | Agent not scoped to worktree path | Re-brief agent with explicit working directory |

## References

Read these when you need more depth:

- `references/worktree-lifecycle.md` — Full command reference, flags, edge cases (multiple worktrees, bare repos, moving worktrees)
- `references/github-pr-sync.md` — PR creation, draft PRs, linking, status checks, merge strategies via `gh` CLI
- `references/agent-coordination.md` — Patterns for coordinating output across parallel sessions: sequencing, handoffs, shared state via PRs

## Setup & Activation

```bash
npx skills add codervisor/forge@parallel-worktrees -g -y
```

Auto-activates when: user mentions "worktree", "parallel agents", "multiple
agent sessions", or asks to work on several features simultaneously with AI.
