---
name: leanspec-development
description: Development workflows, commands, publishing, CI/CD, changelog management, and contribution guidelines for LeanSpec. Use when contributing code, fixing bugs, setting up dev environment, running tests or linting, working with the monorepo structure, looking up build/dev/test/publish/format/lint commands, preparing releases, publishing to npm, bumping versions, syncing package versions, testing dev builds, troubleshooting npm distribution, updating changelogs, triggering CI/CD workflows, monitoring build status, debugging failed runs, managing artifacts, checking CI before releases, or researching AI agent runners. Triggers include any development, scripting, publishing, CI/CD, changelog, or runner research task in this project.
---

# LeanSpec Development Skill

Unified guide for all LeanSpec development: coding, commands, publishing, CI/CD, and runner research.

## Quick Navigation

| Goal | Reference |
|------|-----------|
| **Mandatory rules & conventions** | [RULES.md](./references/RULES.md) |
| **Changelog format & workflow** | [Changelog](#changelog) (below) |
| **i18n file locations & patterns** | [I18N.md](./references/I18N.md) |
| **Monorepo structure & packages** | [STRUCTURE.md](./references/STRUCTURE.md) |
| **Full release checklist** | [PUBLISHING.md](./references/PUBLISHING.md) |
| **npm distribution architecture** | [NPM-DISTRIBUTION.md](./references/NPM-DISTRIBUTION.md) |
| **Dev publishing workflow** | [DEV-PUBLISHING.md](./references/DEV-PUBLISHING.md) |
| **CI workflow details** | [CI-WORKFLOWS.md](./references/CI-WORKFLOWS.md) |
| **gh CLI command reference** | [CI-COMMANDS.md](./references/CI-COMMANDS.md) |
| **CI troubleshooting** | [CI-TROUBLESHOOTING.md](./references/CI-TROUBLESHOOTING.md) |
| **Runner ecosystem catalog** | [runners-catalog.md](./references/runners-catalog.md) |

## Core Principles

1. **Use pnpm** — Never npm or yarn
2. **DRY** — Extract shared logic, avoid duplication
3. **Test What Matters** — Business logic and data integrity, not presentation
4. **Leverage Turborepo** — Smart caching (19s → 126ms builds)
5. **i18n is MANDATORY** — Every user-facing string needs both en AND zh-CN (see [I18N.md](./references/I18N.md))
6. **Follow Rust Quality** — All code must pass `cargo clippy -- -D warnings`

---

## Commands

### Daily Development

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start web UI + Rust HTTP server
pnpm dev:watch            # Same + auto-rebuild Rust on changes
pnpm dev:web              # Start web UI only
pnpm dev:desktop          # Start desktop app
pnpm build                # Build all TS packages
pnpm build:rust           # Build Rust (debug)
pnpm build:rust:release   # Build Rust (release)
pnpm typecheck            # ← NEVER SKIP before marking work complete
pnpm test                 # Run all tests
pnpm test:watch           # Watch mode
pnpm test:coverage        # With coverage
pnpm test:rust            # Rust tests only
pnpm format               # Format all code
pnpm cli                  # Run LeanSpec CLI
```

### Validation

```bash
pnpm pre-push             # Quick: typecheck + clippy
pnpm pre-release          # Full: build + typecheck + test + lint
```

**⚠️ Always run `pnpm typecheck` before marking work complete.**

### Rust

```bash
pnpm build:rust           # Debug build
pnpm build:rust:release   # Release build
pnpm check:rust           # Quick check without building
pnpm lint:rust            # Clippy with warnings as errors
pnpm format:rust          # Format Rust code
pnpm format:rust:check    # Check Rust formatting

# Low-level
cargo build --manifest-path rust/Cargo.toml
node scripts/copy-rust-binaries.mjs --debug
```

### Documentation

```bash
pnpm docs:dev             # Start docs dev server
pnpm docs:build           # Build docs site
```

### Desktop

```bash
pnpm dev:desktop          # Start desktop app in dev mode
cd packages/desktop
pnpm bundle:linux         # Debian package
pnpm bundle:macos         # DMG
pnpm bundle:windows       # NSIS installer
```

---

## Critical Rules

Rules enforced by hooks or CI:

1. **Light/Dark Theme** — ALL UI must support both themes
2. **i18n** — Update BOTH en and zh-CN → [I18N.md](./references/I18N.md) ⚠️ commonly forgotten
3. **Regression Tests** — Bug fixes MUST include failing-then-passing tests
4. **Rust Quality** — Must pass `cargo clippy -- -D warnings`
5. **Rust Params Structs** — Functions with >7 args must use a params struct (enforced by `clippy.toml`)
6. **Use shadcn/ui** — No native HTML form elements
7. **cursor-pointer** — All clickable items must use `cursor-pointer`

**See [RULES.md](./references/RULES.md) for complete requirements.**

---

## Publishing & Releases

### Production Release (Recommended)

```bash
# 1. Update version (root only)
npm version patch  # or minor/major

# 2. Sync all packages
pnpm sync-versions

# 3. Validate everything
pnpm pre-release

# 4. Commit and push with tags
git add .
git commit -m "chore: release vX.X.X"
git push --follow-tags

# 5. Create GitHub Release (triggers publish workflow)
gh release create vX.X.X --title "vX.X.X" --notes "Release notes here"
```

### Development Release

```bash
# Publish dev version via GitHub Actions
gh workflow run publish.yml --field dev=true

# Dry run (validates without publishing)
gh workflow run publish.yml --field dev=true --field dry_run=true

# Install and test
npm install -g lean-spec@dev
lean-spec --version
```

### Version Management

- Root `package.json` is the single source of truth for versions
- `pnpm sync-versions` propagates to all packages (including Rust crates)
- CI automatically validates version alignment
- **Never manually edit package versions** — use `npm version` + `pnpm sync-versions`

### Distribution Architecture

LeanSpec uses optional dependencies for platform-specific Rust binaries:

| Type | Packages |
|------|----------|
| **Main** (published) | `lean-spec`, `@leanspec/mcp`, `@leanspec/ui` |
| **Platform** (published) | `@leanspec/cli-{platform}`, `@leanspec/mcp-{platform}` (5 platforms each) |
| **Internal** (not published) | `@leanspec/desktop`, `@leanspec/ui-components` |

⚠️ **Platform packages MUST be published before main packages.** The CI workflow handles this automatically.

See [PUBLISHING.md](./references/PUBLISHING.md) and [NPM-DISTRIBUTION.md](./references/NPM-DISTRIBUTION.md) for details.

---

## Changelog

Update `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Discovering Changes

```bash
# Commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Files changed since last release
git diff $(git describe --tags --abbrev=0)..HEAD --stat
```

### Entry Format

**Only include shipped/implemented changes** — not planned specs, drafts, or WIP.

Add under `## [Unreleased]` using these categories: **Added**, **Changed**, **Fixed**, **Deprecated**, **Removed**, **Security**, **Technical**.

```markdown
- **Feature Name** ([spec 123](https://web.lean-spec.dev/specs/123)) - Brief description
  - Sub-bullet with implementation details
```

### Writing Style

1. **Bold feature name** followed by description
2. **Link related specs** when applicable
3. **Present tense** — "Adds support for..." not "Added"
4. **Be specific** — include command names, flag names, component names
5. **Group related changes** under single bullet with sub-bullets
6. Include breaking changes with **Breaking:** prefix

### Creating a Release

1. Move entries from `[Unreleased]` to new version: `## [X.Y.Z] - YYYY-MM-DD`
2. Add release link at bottom: `[X.Y.Z]: https://github.com/codervisor/lean-spec/releases/tag/vX.Y.Z`

---

## CI/CD (GitHub Actions)

All workflow interactions use the `gh` CLI. Check status before triggering new runs; minimum 30s between polls.

### Available Workflows

| Workflow | File | Triggers | Purpose |
|----------|------|----------|---------|
| **CI** | `ci.yml` | push, PR to main | Build, test, lint (Node.js + Rust) |
| **Publish** | `publish.yml` | release, manual | Publish to npm (all platforms) |
| **Desktop Build** | `desktop-build.yml` | push, PR, manual | Build Tauri desktop apps |
| **Copilot Setup** | `copilot-setup-steps.yml` | push, PR, manual | Setup environment for Copilot agent |

### Quick Reference

```bash
# Check status
gh run list --limit 10
gh run list --workflow ci.yml --limit 5
gh run view <run-id>
gh run watch <run-id>

# Trigger
gh workflow run ci.yml
gh workflow run publish.yml --field dev=true

# Debug failures
gh run view <run-id> --log-failed
gh run rerun <run-id> --failed

# Artifacts
gh run download <run-id>
gh run download <run-id> --name ui-dist
```

See [CI-WORKFLOWS.md](./references/CI-WORKFLOWS.md), [CI-COMMANDS.md](./references/CI-COMMANDS.md), and [CI-TROUBLESHOOTING.md](./references/CI-TROUBLESHOOTING.md) for details.

---

## Runner Research

Research AI agent runners to keep LeanSpec's runner registry current as the ecosystem evolves.

### Workflow

1. **Read current state**: `rust/leanspec-core/src/sessions/runner.rs` (`RunnerRegistry::builtins()`)
2. **Read catalog**: [runners-catalog.md](./references/runners-catalog.md)
3. **Research via `web_search`**: Config format changes, CLI changes, new env vars, new capabilities, deprecations, new runners
4. **Compare & identify gaps**: Cross-reference findings against registry
5. **Report**: Minor updates → update catalog directly; major changes → create a spec

### Runner Tiers

1. **Tier 1** (high priority): Claude Code, Copilot, Cursor, Windsurf, Codex, Gemini
2. **Tier 2** (medium): Kiro, Amp, Aider, Goose, Continue, Roo Code
3. **Tier 3** (monitor): Droid, Kimi, Qodo, Trae, Qwen Code, OpenHands, Crush, CodeBuddy, Kilo, Augment

### Key Source Files

| File | Purpose |
|------|---------|
| `rust/leanspec-core/src/sessions/runner.rs` | Runner registry with detection config |
| `schemas/runners.json` | JSON schema for custom runner config |
| `packages/cli/templates/_shared/agents-components/` | AGENTS.md template components |
