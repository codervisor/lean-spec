# Copilot Setup Steps Reference

Complete guide to `.github/copilot-setup-steps.yml` — the workflow that
configures cloud coding sessions for Claude Code and GitHub Copilot agents.

## Table of Contents
1. [What it is](#what-it-is)
2. [File location](#file-location)
3. [Minimal example](#minimal-example)
4. [Full example](#full-example)
5. [Adding project dependencies](#adding-project-dependencies)
6. [Caching](#caching)
7. [Multiple language stacks](#multiple-language-stacks)
8. [Testing the workflow](#testing-the-workflow)

---

## What It Is

`copilot-setup-steps.yml` is a GitHub Actions workflow that runs when a
cloud coding session starts. It prepares the environment so the AI agent
can:

- Authenticate with `gh` CLI
- Install project dependencies
- Build the project
- Run linters, formatters, and tests

The workflow uses the `repository_dispatch` event and runs in the same
container that the agent session uses.

---

## File Location

Must be at exactly:
```
.github/copilot-setup-steps.yml
```

Not in `.github/workflows/` — this is intentional. It's a setup config,
not a CI workflow.

---

## Minimal Example

Just gh authentication — no project-specific setup:

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

---

## Full Example

Node.js project with pnpm, linting, and build:

```yaml
name: "Copilot Setup Steps"

on: repository_dispatch

jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate gh CLI
        run: gh auth status
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Verify linter works
        run: pnpm lint --quiet
```

---

## Adding Project Dependencies

### Node.js (pnpm)

```yaml
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'pnpm'
- run: pnpm install --frozen-lockfile
```

### Node.js (npm)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'
- run: npm ci
```

### Rust

```yaml
- uses: dtolnay/rust-toolchain@stable
- uses: Swatinem/rust-cache@v2
- run: cargo build
```

### Python

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: 'pip'
- run: pip install -r requirements.txt
```

### Go

```yaml
- uses: actions/setup-go@v5
  with:
    go-version: '1.22'
- run: go mod download
```

---

## Caching

GitHub Actions caching works in copilot-setup-steps just like in CI.
Use the `cache` parameter in setup actions (e.g., `actions/setup-node`)
or `actions/cache` directly:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/some-tool
    key: ${{ runner.os }}-some-tool-${{ hashFiles('**/lockfile') }}
```

Caching significantly speeds up repeated cloud sessions on the same repo.

---

## Multiple Language Stacks

For hybrid projects (e.g., Rust + Node.js), combine steps:

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Authenticate gh CLI
    run: gh auth status
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # Node.js
  - uses: pnpm/action-setup@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '22'
      cache: 'pnpm'
  - run: pnpm install --frozen-lockfile

  # Rust
  - uses: dtolnay/rust-toolchain@stable
  - uses: Swatinem/rust-cache@v2

  - run: pnpm build
```

---

## Testing the Workflow

You can't trigger `repository_dispatch` directly from the GitHub UI.
To test:

### 1. Trigger manually via gh CLI

```bash
gh api repos/{owner}/{repo}/dispatches \
  --method POST \
  --field event_type=copilot-setup
```

### 2. Check the workflow ran

```bash
gh run list --workflow=copilot-setup-steps.yml
gh run view <run-id> --log
```

### 3. Validate locally

Run the same commands from the workflow steps in your local terminal to
verify they work before committing.
