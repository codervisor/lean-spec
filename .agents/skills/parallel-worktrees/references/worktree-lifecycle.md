# Worktree Lifecycle Reference

Full command reference for git worktree operations — creation, inspection,
maintenance, and removal.

## Table of Contents
1. [Create](#create)
2. [Inspect](#inspect)
3. [Move](#move)
4. [Lock / Unlock](#lock--unlock)
5. [Remove and Prune](#remove-and-prune)
6. [Edge Cases](#edge-cases)

---

## Create

### New branch (most common)

```bash
git worktree add <path> -b <branch-name>
```

- Creates the directory at `<path>` if it doesn't exist.
- Creates and checks out `<branch-name>` in one step.
- The branch starts at `HEAD` of the current checkout unless you pass a
  base commit.

```bash
# Start from a specific base
git worktree add ../myrepo-wt/feat/auth -b feat/auth origin/main
```

### Existing local branch

```bash
git worktree add <path> <branch-name>
```

The branch must not already be checked out in another worktree.

### From a remote tracking branch

```bash
git worktree add <path> origin/<branch-name>
```

This creates a **detached HEAD** pointing at the remote commit. If you want a
local branch that tracks the remote:

```bash
git worktree add -b <local-branch> <path> origin/<remote-branch>
```

### Detached HEAD (for read-only inspection)

```bash
git worktree add --detach <path> <commit-or-tag>
```

Useful for running tests against an old version without a branch name.

---

## Inspect

### List all worktrees

```bash
git worktree list
```

Output:
```
/home/user/myrepo           abc1234 [main]
/home/user/myrepo-wt/feat/auth  def5678 [feat/auth]
/home/user/myrepo-wt/fix/bug    ghi9012 [fix/bug]
```

### Verbose output (shows locked status)

```bash
git worktree list --porcelain
```

---

## Move

Rename or relocate a worktree directory:

```bash
git worktree move <old-path> <new-path>
```

Git updates the internal metadata so `git worktree list` reflects the new
location. Do NOT just `mv` the directory — the internal bookkeeping won't
update and you'll end up with a stale entry.

---

## Lock / Unlock

Locking prevents `git worktree prune` from removing a worktree that happens to
be on a removable drive or network share that's temporarily unmounted:

```bash
git worktree lock <path> --reason "on external drive"
git worktree unlock <path>
```

---

## Remove and Prune

### Clean removal (recommended)

```bash
git worktree remove <path>
```

Fails if the worktree has uncommitted changes. Force:

```bash
git worktree remove --force <path>
```

This removes the directory AND cleans up the metadata entry inside `.git/`.

### Prune stale entries

If a worktree directory was deleted by other means (e.g., `rm -rf`), the
`.git/worktrees/<name>/` metadata entry is left behind. Prune cleans it:

```bash
git worktree prune
```

Dry run first to see what would be removed:

```bash
git worktree prune --dry-run --verbose
```

---

## Edge Cases

### "fatal: 'branch' is already checked out"

```
fatal: 'feat/auth' is already checked out at '/home/user/myrepo-wt/feat/auth'
```

**Cause:** The branch is open in another worktree.
**Fix:** Use a different branch name, or remove the existing worktree first.

### Detached HEAD after `git worktree add <path> origin/<branch>`

This is expected behavior when adding from a remote tracking ref without `-b`.
To attach to a branch:

```bash
# Inside the worktree
git switch -c <new-branch-name>
# or to track the remote
git switch -c <local-branch> --track origin/<remote-branch>
```

### `.git/index.lock` errors

```
fatal: Unable to create '/home/user/myrepo-wt/feat/auth/.git': File exists
```

Each worktree has its own index file inside `.git/worktrees/<name>/index`.
This error means *another process* is running git in the same worktree.

**Fix:** Ensure only one agent session operates per worktree. If the lock file
is truly stale (the process crashed), remove it:

```bash
rm /path/to/worktree/.git/index.lock
```

### Multiple worktrees, bare repo

If the main repo is a bare clone (`git clone --bare`), you can still use
worktrees — they're added with:

```bash
git -C <bare-repo-path> worktree add <path> -b <branch>
```

This is common in CI/CD setups and server-side deployments.

### Worktree inside the repo directory

You *can* put a worktree inside the main repo (e.g., `<repo>/.worktrees/`),
but then you need to add it to `.gitignore`:

```
# .gitignore
.worktrees/
```

The sibling-directory convention avoids this entirely.

### Checking which worktree owns a branch

```bash
git worktree list | grep <branch-name>
```

### Running git commands across all worktrees

There is no built-in `--all-worktrees` flag. Use a shell loop:

```bash
for wt in $(git worktree list --porcelain | grep '^worktree' | awk '{print $2}'); do
  echo "=== $wt ===" && git -C "$wt" status --short
done
```
