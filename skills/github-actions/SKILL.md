---
name: github-actions
description: GitHub Actions workflow management for LeanSpec. Use when triggering, monitoring, or debugging CI/CD workflows.
compatibility: Requires GitHub CLI (gh) and repository access
metadata:
  author: LeanSpec
  version: 0.1.0
  homepage: https://leanspec.dev
  internal: true
---

# GitHub Actions Skill

Teach agents how to trigger, monitor, and manage GitHub Actions workflows for the LeanSpec project.

## When to Use This Skill

Activate this skill when any of the following are true:
- Triggering CI/CD workflows manually
- Monitoring workflow run status
- Debugging failed workflow runs
- Managing workflow artifacts
- Checking build status before releases

## Core Principles

1. **Use GitHub CLI (`gh`)** - All workflow interactions use the `gh` CLI tool
2. **Check Status Before Acting** - Always verify current run status before triggering new ones
3. **Monitor Until Completion** - Background workflows need periodic status checks
4. **Artifacts Are Ephemeral** - Download important artifacts before they expire (default: 30 days)
5. **Respect Rate Limits** - Don't poll too frequently (minimum 30s between checks)

## Available Workflows

| Workflow | File | Triggers | Purpose |
|----------|------|----------|---------|
| **CI** | `ci.yml` | push, PR to main | Build, test, lint (Node.js + Rust) |
| **Publish** | `publish.yml` | release, manual | Publish to npm (all platforms) |
| **Desktop Build** | `desktop-build.yml` | push, PR, manual | Build Tauri desktop apps |
| **Copilot Setup** | `copilot-setup-steps.yml` | push, PR, manual | Setup environment for Copilot agent |

## Quick Reference

### Check Workflow Status

```bash
# List recent workflow runs
gh run list --limit 10

# View specific workflow runs
gh run list --workflow ci.yml --limit 5
gh run list --workflow publish.yml --limit 5

# Get details of a specific run
gh run view <run-id>

# Watch a run in progress
gh run watch <run-id>
```

### Trigger Workflows

```bash
# Trigger CI manually (usually automatic on push/PR)
gh workflow run ci.yml

# Trigger publish (dev version)
gh workflow run publish.yml --field dev=true

# Trigger publish (dry run - validates without publishing)
gh workflow run publish.yml --field dev=true --field dry_run=true

# Trigger desktop build
gh workflow run desktop-build.yml
```

### Debug Failed Runs

```bash
# View failed run logs
gh run view <run-id> --log-failed

# View full logs
gh run view <run-id> --log

# Re-run failed jobs only
gh run rerun <run-id> --failed

# Re-run entire workflow
gh run rerun <run-id>
```

### Manage Artifacts

```bash
# List artifacts from a run
gh run view <run-id>

# Download all artifacts from a run
gh run download <run-id>

# Download specific artifact
gh run download <run-id> --name ui-dist
gh run download <run-id> --name binaries-linux-x64
```

## Workflow Details

### CI Workflow (`ci.yml`)

**Triggers**: Push to main, PRs to main

**Jobs**:
1. **node** - Node.js/TypeScript build and test
   - Install dependencies
   - Build all packages
   - Run typecheck
   - Run tests
   - Upload UI build artifact

2. **rust** - Rust build and test (depends on node)
   - Check formatting (`cargo fmt`)
   - Run clippy linting
   - Build binaries
   - Run tests
   - Validate specs

**Common Failures**:
- TypeScript errors → Run `pnpm typecheck` locally
- Test failures → Run `pnpm test` locally
- Clippy warnings → Run `cargo clippy -- -D warnings` in `rust/`
- Formatting issues → Run `cargo fmt` in `rust/`

### Publish Workflow (`publish.yml`)

**Triggers**:
- GitHub Release creation (primary production method)
- Manual workflow dispatch (for dev/testing)

**Inputs** (for manual dispatch):
- `dry_run` (boolean) - Validate without publishing
- `dev` (boolean) - Publish with `@dev` tag

**Jobs**:
1. **build-ui** - Build UI package first
2. **rust-binaries** - Build for all platforms (matrix: darwin-x64, darwin-arm64, linux-x64, windows-x64)
3. **publish-platform** - Publish platform-specific npm packages
4. **publish-main** - Publish main packages (after platform packages propagate)

**Common Failures**:
- Platform packages not propagating → Retry publish-main job
- Version mismatch → Run `pnpm sync-versions` locally
- npm auth errors → Check `NPM_TOKEN` secret

### Desktop Build Workflow (`desktop-build.yml`)

**Triggers**: Changes to `packages/desktop/`, `packages/ui/`, or the workflow file

**Jobs**:
- Matrix build on macOS, Ubuntu, Windows
- Builds Tauri desktop bundle
- Uploads artifacts per platform

## Workflow Patterns for Agents

### Pattern 1: Check Before Triggering

Always check if a workflow is already running before triggering:

```bash
# Check for running CI workflows
gh run list --workflow ci.yml --status in_progress

# Only trigger if nothing is running
gh workflow run ci.yml
```

### Pattern 2: Wait for Completion

```bash
# Trigger and wait
gh workflow run publish.yml --field dev=true

# Get the latest run ID
RUN_ID=$(gh run list --workflow publish.yml --limit 1 --json databaseId --jq '.[0].databaseId')

# Watch until completion
gh run watch $RUN_ID
```

### Pattern 3: Debug and Retry

```bash
# Check what failed
gh run view <run-id> --log-failed

# If transient failure, retry just failed jobs
gh run rerun <run-id> --failed

# If you need clean state, retry all
gh run rerun <run-id>
```

### Pattern 4: Pre-Release Validation

Before publishing a release:

```bash
# 1. Ensure CI passes
gh run list --workflow ci.yml --branch main --limit 1

# 2. Run publish dry run
gh workflow run publish.yml --field dev=true --field dry_run=true

# 3. Watch the dry run
RUN_ID=$(gh run list --workflow publish.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $RUN_ID

# 4. If successful, trigger real dev publish
gh workflow run publish.yml --field dev=true
```

## Decision Tree

```
Need to check if build passing?
└─> gh run list --workflow ci.yml --limit 1

Need to publish packages?
├─> Production: Create GitHub Release (recommended)
└─> Testing: gh workflow run publish.yml --field dev=true

Workflow failed?
├─> View logs: gh run view <id> --log-failed
├─> Transient: gh run rerun <id> --failed
└─> Real issue: Fix locally, push, let CI re-run

Need build artifacts?
└─> gh run download <run-id> --name <artifact-name>
```

## Reference Documentation

- [references/WORKFLOWS.md](./references/WORKFLOWS.md) - Detailed workflow documentation
- [references/COMMANDS.md](./references/COMMANDS.md) - Complete command reference
- [references/TROUBLESHOOTING.md](./references/TROUBLESHOOTING.md) - Common issues and solutions

## Setup Requirements

### GitHub CLI Authentication

```bash
# Check if authenticated
gh auth status

# Login if needed
gh auth login

# Verify repo access
gh repo view codervisor/lean-spec
```

### Required Permissions

- Repository read access (for viewing runs)
- Repository write access (for triggering workflows)
- `NPM_TOKEN` secret configured (for publish workflow)

## Auto-activation Hints

If the tool supports auto-activation, detect:
- Tasks related to: "CI", "workflow", "build", "deploy", "publish", "GitHub Actions"
- Commands being run: `gh run`, `gh workflow`
- Errors mentioning: workflow failures, CI failures, build errors