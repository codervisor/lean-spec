# Cloud Authentication Reference

How `gh` CLI authentication works in Claude Code cloud and GitHub Copilot
coding agent environments.

## Table of Contents
1. [Claude Code cloud architecture](#claude-code-cloud-architecture)
2. [GitHub Copilot agent architecture](#github-copilot-agent-architecture)
3. [Token types](#token-types)
4. [Configuring gh](#configuring-gh)
5. [The sandbox proxy](#the-sandbox-proxy)
6. [Network access](#network-access)
7. [Troubleshooting](#troubleshooting)

---

## Claude Code Cloud Architecture

Claude Code cloud runs sessions in **Anthropic-managed VMs** (Ubuntu 24.04).
Key facts:

- Each session gets an isolated VM with your repo cloned
- `gh` is **not pre-installed** — must be installed via setup script
- Git auth is handled by a **dedicated proxy** (not a token in the sandbox)
- The git client uses a scoped credential that the proxy translates to your
  actual GitHub auth token
- `gh` CLI needs its own auth via the `GH_TOKEN` environment variable
- The proxy restricts `git push` to the current working branch only

### Session Lifecycle

1. VM spins up, repo is cloned via the GitHub proxy
2. Setup script runs (if configured) — install `gh` here
3. SessionStart hooks run (if configured in `.claude/settings.json`)
4. Claude Code launches and begins working
5. On completion, changes are pushed to a branch via the proxy

### What's Pre-installed

The universal image includes Python, Node.js, Ruby, PHP, Java, Go, Rust,
C++, PostgreSQL 16, Redis 7.0, and common package managers. Run
`check-tools` to see the full list.

**Not pre-installed:** `gh` CLI. Install it in your setup script.

---

## GitHub Copilot Agent Architecture

GitHub Copilot coding agents (including Claude as a Copilot agent) run in
**GitHub-managed containers** using GitHub Actions infrastructure.

- `gh` **is pre-installed** and available immediately
- `GITHUB_TOKEN` is provided automatically via `secrets.GITHUB_TOKEN`
- Configure the environment with `.github/copilot-setup-steps.yml`
- The job **must** be named `copilot-setup-steps`

---

## Token Types

### GitHub Personal Access Token (PAT) — Claude Code Cloud

For Claude Code cloud, you provide your own PAT:

| Setting | Value |
|---------|-------|
| Where to create | GitHub → Settings → Developer settings → Personal access tokens |
| Recommended type | Fine-grained (scoped to specific repos) |
| Required scopes | `repo` (for full repo access) or fine-grained: `contents:write`, `pull_requests:write`, `issues:write` |
| Where to set | Claude Code → Environment Settings → Environment Variables |
| Variable name | `GH_TOKEN` |

**Security:** The PAT is stored in Anthropic's environment settings and
injected into the VM at session start. It is not committed to the repo.

### GITHUB_TOKEN — Copilot Agent

For Copilot coding agents, `GITHUB_TOKEN` is provided automatically:

| Property | Value |
|----------|-------|
| Lifetime | Scoped to the workflow run |
| Scope | Repository that triggered the session |
| Default permissions | `contents:read`, `metadata:read` |
| Configurable | Yes, via `permissions:` block in the workflow |

---

## Configuring gh

### Claude Code Cloud

**Option 1: `GH_TOKEN` environment variable (recommended)**

Set `GH_TOKEN` in the environment settings UI. `gh` detects it automatically.

```bash
# Verify it works
gh auth status
```

**Option 2: `gh auth login --with-token`**

If you need explicit login (rare):

```bash
echo "$GH_TOKEN" | gh auth login --with-token
```

### Copilot Agent

Pass the token in the workflow step:

```yaml
- name: Authenticate gh CLI
  run: gh auth status
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## The Sandbox Proxy

Claude Code cloud routes all GitHub traffic through a **dedicated proxy**.

### How it works

- The git client inside the sandbox uses a scoped credential
- The proxy verifies this credential and translates it to your actual
  GitHub token
- `git push` is restricted to the current working branch
- `git clone`, `git fetch`, and `git pull` work transparently

### Impact on gh

The proxy handles git operations, but `gh` makes its own HTTP requests to
the GitHub API. This means:

1. `gh` needs its own token (`GH_TOKEN`) — it doesn't share the git proxy
   credential
2. `gh` may not auto-detect the repo from git remotes due to the proxy
   configuration — use the `-R owner/repo` flag

```bash
# Instead of:
gh pr list

# Use:
gh pr list -R codervisor/myrepo
```

---

## Network Access

### Claude Code Cloud

Three levels:

| Level | Description |
|-------|-------------|
| **Limited** (default) | Allows common registries (npm, PyPI, crates.io, etc.) and GitHub domains |
| **Full** | Unrestricted outbound access |
| **None** | No internet (API communication to Anthropic still allowed) |

Key allowed domains for gh (in Limited mode):
- `github.com`, `api.github.com`
- `raw.githubusercontent.com`, `objects.githubusercontent.com`
- `npm.pkg.github.com`, `ghcr.io`

**Note:** Setup scripts that install packages (like `apt install gh`) need
network access. The default "Limited" mode allows this since Ubuntu package
repos (`archive.ubuntu.com`, `security.ubuntu.com`) are in the allowlist.

### Copilot Agent

Full GitHub Actions network — no restrictions beyond standard Actions limits.

---

## Troubleshooting

### gh: command not found

**Environment:** Claude Code cloud only.

**Cause:** `gh` is not pre-installed in the default image.

**Fix:** Add to your setup script:
```bash
apt update && apt install -y gh
```

Or use a SessionStart hook:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "if [ \"$CLAUDE_CODE_REMOTE\" = \"true\" ]; then apt update && apt install -y gh; fi",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

### gh auth status shows "not logged in"

**Cause:** `GH_TOKEN` not set in the environment.

**Fix (Claude Code cloud):** Add `GH_TOKEN=ghp_...` to Environment Settings →
Environment Variables.

**Fix (Copilot agent):** Ensure the workflow step has:
```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### "could not determine base repo" / repo not detected

**Cause:** Sandbox proxy obscures the git remote from `gh`.

**Fix:** Always pass `-R owner/repo`:
```bash
gh pr create -R codervisor/myrepo --title "..."
```

### HTTP 401 Unauthorized

**Cause:** Token expired, revoked, or never set.

**Fix:**
1. Check `gh auth status`
2. Verify `GH_TOKEN` is set: `echo $GH_TOKEN | head -c 10`
3. If expired, regenerate the PAT and update environment settings

### HTTP 403 Forbidden

**Cause:** Token lacks required permission scope.

**Fix:**
1. Check error message for the required scope
2. Regenerate PAT with the needed scopes (at minimum: `repo`)
3. For Copilot agents, add permissions to the workflow:
   ```yaml
   permissions:
     contents: write
     pull-requests: write
   ```

### gh works but git push fails

**Cause:** In Claude Code cloud, git push is restricted to the current
working branch by the proxy.

**Fix:** Ensure you're pushing to the branch Claude Code checked out.
You cannot push to other branches.

### Setup script fails to install gh

**Cause:** Network access is disabled or too restrictive.

**Fix:** Set network access to "Limited" (default) or "Full" in
environment settings. The default allowlist includes Ubuntu package repos.

### Rate limiting

**Cause:** Too many API calls in a short period.

**Fix:**
1. Check limits: `gh api rate_limit`
2. Use GraphQL for batch queries: `gh api graphql`
3. Add delays between bulk operations
