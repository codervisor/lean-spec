---
name: github-integration
description: >
  Enable the GitHub CLI (`gh`) in Claude Code cloud sessions and GitHub
  Copilot coding agent environments. Use this skill when: (1) setting up a
  project so cloud AI agents can use `gh` for PRs, issues, and releases,
  (2) configuring setup scripts or SessionStart hooks for `gh` installation,
  (3) adding `copilot-setup-steps.yml` for GitHub Copilot agents,
  (4) troubleshooting `gh` auth failures in cloud sessions, or
  (5) configuring `GH_TOKEN` for headless environments. Triggers on:
  "enable gh", "github integration", "Claude Code cloud setup",
  "copilot setup steps", "gh auth in cloud", "gh not working in cloud",
  "setup script", or any request involving GitHub CLI access from
  cloud-based AI coding agents.
metadata:
  author: Codervisor
  version: 0.2.0
  homepage: https://github.com/codervisor/forge
---

# GitHub Integration

Enable `gh` CLI access in Claude Code cloud and GitHub Copilot coding agent
environments so agents can create PRs, manage issues, and interact with
GitHub APIs.

## When to Use This Skill

Activate when:
- User wants cloud AI agents to use `gh` (PRs, issues, releases, API calls)
- User needs to install `gh` in Claude Code cloud sessions
- User wants to add `copilot-setup-steps.yml` for GitHub Copilot agents
- `gh` commands fail with auth or "not found" errors in a cloud session
- User wants to enable GitHub integration for any cloud-based AI coding agent

## Decision Tree

```
Which cloud environment?

Claude Code cloud (claude.ai/code)?
  → gh is NOT pre-installed in the default image
  → Install via setup script: apt update && apt install -y gh
  → Set GH_TOKEN as environment variable in environment settings
  → For repo-portable setup, use SessionStart hook instead
  → Use -R owner/repo flag with gh due to sandbox proxy

GitHub Copilot coding agent?
  → Add .github/copilot-setup-steps.yml to the repo
  → gh IS pre-installed; just configure GH_TOKEN
  → Commit and push — agent sessions pick it up automatically

gh commands failing?
  → "command not found" → gh not installed; add to setup script
  → HTTP 401 → GH_TOKEN not set; add to environment variables
  → HTTP 403 → Token lacks required scope; check permissions
  → "could not determine repo" → Use -R owner/repo flag
  → See references/cloud-auth.md for more

Need gh in local dev too?
  → Run: gh auth login (interactive, browser-based)
  → Or set GH_TOKEN env var for headless/CI use
```

## Two Environments, Two Approaches

### Claude Code Cloud (claude.ai/code)

Claude Code cloud runs sessions in Anthropic-managed VMs. The `gh` CLI
is **not pre-installed**. You need two things:

1. **Setup script** — installs `gh` when the session starts
2. **`GH_TOKEN` env var** — authenticates `gh` with your GitHub PAT

#### Quick Start: Setup Script

In the Claude Code web UI: Environment Settings → Setup script:

```bash
#!/bin/bash
apt update && apt install -y gh
```

Then add `GH_TOKEN` as an environment variable with your GitHub Personal
Access Token (needs `repo` scope).

#### Alternative: SessionStart Hook (repo-portable)

Add to `.claude/settings.json` in your repo:

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

The `CLAUDE_CODE_REMOTE` check ensures it only runs in cloud sessions.

#### Important: The `-R` Flag

Due to the sandbox proxy, `gh` may not auto-detect the repo. Use the
`-R owner/repo` flag:

```bash
gh pr create -R codervisor/myrepo --title "..." --body "..."
gh issue list -R codervisor/myrepo
```

### GitHub Copilot Coding Agent

Copilot coding agents use `.github/copilot-setup-steps.yml`. The `gh` CLI
is pre-installed; you just need to authenticate it.

Add this file at `.github/copilot-setup-steps.yml`:

```yaml
name: "Copilot Setup Steps"

on: repository_dispatch

jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate gh CLI
        run: gh auth status
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

See `templates/copilot-setup-steps.yml` for a full template with
dependency installation.

## Setup Scripts vs SessionStart Hooks vs copilot-setup-steps

|                  | Setup scripts            | SessionStart hooks              | copilot-setup-steps.yml          |
|------------------|--------------------------|---------------------------------|----------------------------------|
| **Platform**     | Claude Code cloud only   | Claude Code (local + cloud)     | GitHub Copilot agents only       |
| **Configured in**| Environment settings UI  | `.claude/settings.json` in repo | `.github/copilot-setup-steps.yml`|
| **Runs**         | Before Claude launches   | After Claude launches           | Before Copilot agent launches    |
| **Runs on resume**| No (new sessions only) | Yes (every session)             | Yes                              |
| **Network**      | Needs registry access    | Needs registry access           | Full GitHub Actions network      |

## Common gh Commands for Agents

```bash
# PRs (use -R in Claude Code cloud)
gh pr create -R owner/repo --title "..." --body "..."
gh pr list -R owner/repo
gh pr view -R owner/repo
gh pr merge -R owner/repo --squash --delete-branch

# Issues
gh issue list -R owner/repo
gh issue view 42 -R owner/repo
gh issue create -R owner/repo --title "..." --body "..."

# API (for anything not covered by subcommands)
gh api repos/owner/repo/actions/runs
```

## Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `gh: command not found` | Not installed (Claude Code cloud) | Add `apt install -y gh` to setup script |
| `HTTP 401` / auth error | `GH_TOKEN` not set | Add to environment variables in settings UI |
| `HTTP 403` on push | Token lacks `repo` scope | Regenerate PAT with `repo` scope |
| `could not determine repo` | Sandbox proxy hides git remote | Use `-R owner/repo` flag |
| `gh pr create` fails | No upstream branch | Push with `git push -u origin <branch>` first |
| Setup script fails | No network access | Set network to "Limited" (default) or "Full" |

## References

- `references/cloud-auth.md` — Token auth, scopes, proxy details, troubleshooting
- `references/copilot-setup-steps.md` — Full guide to customizing the Copilot setup workflow

## Setup & Activation

```bash
npx skills add codervisor/forge@github-integration -g -y
```

Auto-activates when: user mentions "gh in cloud", "github integration",
"setup script", "copilot setup steps", or `gh` auth failures in cloud
environments.
