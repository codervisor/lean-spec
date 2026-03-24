# GitHub PR Sync Reference

How to push worktree branches to GitHub and manage pull requests via the
`gh` CLI. Assumes `gh` is authenticated (`gh auth status`).

## Table of Contents
1. [Push a branch](#push-a-branch)
2. [Open a PR](#open-a-pr)
3. [Draft PRs](#draft-prs)
4. [Update a PR](#update-a-pr)
5. [Link related PRs](#link-related-prs)
6. [Check status](#check-status)
7. [Merge strategies](#merge-strategies)
8. [Clean up remote branches](#clean-up-remote-branches)

---

## Push a branch

From inside the worktree (or with explicit path):

```bash
git push -u origin <branch-name>
```

The `-u` flag sets the upstream tracking reference so future `git push` and
`git pull` in that worktree work without arguments.

---

## Open a PR

```bash
gh pr create \
  --title "<type>(<scope>): <subject>" \
  --body "$(cat <<'EOF'
## Summary
- What this PR does (1-3 bullets)

## Notes
- Related work: #<pr-number> (if any)
- Agent session: <branch-name>

## Test plan
- [ ] ...
EOF
)"
```

### Flags

| Flag | Use |
|------|-----|
| `--base <branch>` | Target branch (default: repo default branch) |
| `--draft` | Open as draft (see below) |
| `--assignee @me` | Assign to yourself |
| `--label <label>` | Add label (create labels in repo settings first) |
| `--no-maintainer-edit` | Prevent maintainers from pushing to the branch |

---

## Draft PRs

Open a PR as draft when the agent session is still in progress — signals to
reviewers that it's not ready:

```bash
gh pr create --draft --title "..." --body "..."
```

Mark ready when done:

```bash
gh pr ready <pr-number>
# or from inside the worktree:
gh pr ready
```

**Workflow for parallel sessions:** Open all sessions as drafts immediately
after the first commit. This reserves the PR slot and makes coordination
visible. Promote to ready one at a time as sessions complete.

---

## Update a PR

### Edit title or body

```bash
gh pr edit <pr-number> --title "new title"
gh pr edit <pr-number> --body "updated body"
```

### Add a comment (e.g., agent status update)

```bash
gh pr comment <pr-number> --body "Agent session complete. Ready for review."
```

### Force-push after rebase

```bash
# Inside the worktree after rebase
git push --force-with-lease
```

`--force-with-lease` is safer than `--force`: it fails if the remote has
commits you haven't fetched yet, preventing accidental overwrites.

---

## Link Related PRs

When parallel sessions work on dependent or related features, note the
relationship in the PR body:

```markdown
## Related PRs
- Depends on: #42 (must merge first — shared database schema)
- Related: #43 (parallel feature, independent)
- Supersedes: #38 (closing that one in favor of this approach)
```

GitHub will auto-link PR numbers in the body. Use keywords to auto-close
issues:

```markdown
Closes #99
Fixes #100
```

---

## Check Status

### View PR status and CI checks

```bash
gh pr status          # PRs involving you
gh pr view            # current branch's PR
gh pr checks          # CI check statuses for current branch's PR
```

### Wait for checks to pass (useful in scripts)

```bash
gh pr checks --watch  # polls until all checks resolve
```

### View all open PRs in the repo

```bash
gh pr list
gh pr list --state all   # includes closed/merged
```

---

## Merge Strategies

### Squash merge (recommended for feature PRs)

Keeps main history linear. Collapses all agent commits into one:

```bash
gh pr merge <pr-number> --squash --delete-branch
```

### Rebase merge

Replays commits on top of main individually. Preserves commit history:

```bash
gh pr merge <pr-number> --rebase --delete-branch
```

### Merge commit

Creates an explicit merge commit. Useful when you want to preserve the PR
boundary in history:

```bash
gh pr merge <pr-number> --merge --delete-branch
```

**`--delete-branch`** removes the remote branch after merge. Combine with
local cleanup (see below).

---

## Clean Up Remote Branches

### After PR merge (if not using `--delete-branch`)

```bash
git push origin --delete <branch-name>
```

### After local worktree removal

```bash
# Remove the local worktree + branch
git worktree remove ../myrepo-wt/<branch-path>
git branch -d <branch-name>

# Clean up remote tracking refs that no longer exist on GitHub
git fetch --prune
```

### List branches that are merged

```bash
git branch --merged main      # local
git branch -r --merged main   # remote tracking
```

---

## Prerequisite: gh auth

If `gh` isn't authenticated:

```bash
gh auth login
# Follow prompts: GitHub.com → HTTPS → Login with a web browser
```

Check status:

```bash
gh auth status
```
