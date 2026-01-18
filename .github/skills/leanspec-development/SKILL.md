---
name: leanspec-development
description: Development workflows and contribution guidelines for LeanSpec. Use when contributing code or setting up development environment.
compatibility: Requires pnpm, Node.js 18+, and Rust toolchain
metadata:
  author: LeanSpec
  version: 0.1.0
  homepage: https://leanspec.dev
---

# LeanSpec Development Skill

Teach agents how to contribute to LeanSpec development. This skill covers setup, testing strategies, monorepo structure, and development workflows.

## When to Use This Skill

Activate this skill when any of the following are true:
- Setting up local development environment
- Writing or running tests
- Contributing code to the project
- Understanding monorepo structure
- Working with Turborepo caching
- Making changes that require testing

## Core Principles

1. **Use pnpm**: Always use `pnpm` instead of `npm`
2. **DRY Principle**: Extract shared logic, avoid duplication
3. **Test What Matters**: Focus on business logic and data integrity, not presentation
4. **Leverage Turborepo**: Utilize caching for faster builds
5. **Maintain i18n**: Update both en and zh-CN translations

## Quick Commands

```bash
# Setup
pnpm install
pnpm build

# Development
pnpm dev          # Web UI + Rust server
pnpm dev:cli      # CLI in watch mode
pnpm dev:desktop  # Desktop app

# Testing & Validation
pnpm test         # Tests in watch mode
pnpm test:run     # CI mode
pnpm typecheck    # Type check all
pnpm pre-release  # Full validation

# Rust
pnpm rust:build   # Build binaries
pnpm rust:test    # Run Rust tests
```

## Testing Strategy

Focus on **business logic and data integrity**, not UI presentation.

**Test**: Algorithms, parsers, data transformations, file operations  
**Don't test**: CSS classes, icons, trivial getters, third-party libraries

**Test types**:
- **Unit** (`*.test.ts`) - Pure functions
- **Integration** - Cross-package workflows
- **E2E** (`__e2e__/*.e2e.test.ts`) - CLI scenarios
- **Regression** - Add when fixing bugs

See [references/CONTRIBUTING.md](./references/CONTRIBUTING.md) for detailed philosophy.

## Common Workflows

**Adding a feature**:
1. Search/create spec, mark in-progress
2. Implement with tests
3. Run `pnpm pre-release`
4. Mark spec complete

**Fixing a bug**:
1. Write regression test (must fail)
2. Fix bug (test now passes)
3. Add test to E2E suite

**i18n changes**:
Update both `en` and `zh-CN` locales in:
- `packages/ui/src/locales/`
- `packages/mcp/src/locales/`
- `docs-site/` (English + i18n/zh-Hans)

## Pre-PR Checklist

- [ ] `pnpm test:run` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm pre-release` passes
- [ ] i18n updated (if UI/MCP changes)
- [ ] Regression test added (if bug fix)

## Detailed References

For comprehensive documentation:
- [references/CONTRIBUTING.md](./references/CONTRIBUTING.md) - Full contribution guide, testing, version management
- [references/MONOREPO.md](./references/MONOREPO.md) - Turborepo details and structure
- [references/RULES.md](./references/RULES.md) - Development rules and UI guidelines
- [references/RUST-QUALITY.md](./references/RUST-QUALITY.md) - Rust code quality standards

## Setup & Activation

### Auto-activation Hints
If the tool supports auto-activation, detect:
- Tasks related to: "test", "contribute", "setup", "build"
- Files being edited: test files, source code
- Commands being run: `pnpm test`, `pnpm build`, `pnpm dev`

## Compatibility Notes

- Requires Node.js 18+ and pnpm 8+
- Rust toolchain needed for binary development
- Turborepo is pre-configured, no setup needed
- Works with all major IDEs (VS Code, Cursor, etc.)
