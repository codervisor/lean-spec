---
name: leanspec-development
description: Development workflows and contribution guidelines for LeanSpec. Use when contributing code or setting up development environment.
compatibility: Requires pnpm, Node.js 18+, and Rust toolchain
metadata:
  author: LeanSpec
  version: 0.3.0
  homepage: https://leanspec.dev
  internal: true
---

# LeanSpec Development Skill

**Quick activation context** for AI agents working on LeanSpec development.

## When to Use

Activate when:
- Setting up development environment
- Contributing code or fixing bugs
- Running tests or validation
- Working with the monorepo structure

## Quick Navigation

| Goal | Reference |
|------|-----------|
| **Mandatory rules & conventions** | [RULES.md](./references/RULES.md) |
| **i18n file locations & patterns** | [I18N.md](./references/I18N.md) |
| **Monorepo structure & packages** | [STRUCTURE.md](./references/STRUCTURE.md) |
| **All scripts & commands** | Use skill: `leanspec-scripts` |

**Everything else**: Read root `README.md`, `package.json` scripts, or explore the codebase.

## Core Principles

The non-negotiable mental model:

1. **Use pnpm** - Never npm or yarn
2. **DRY** - Extract shared logic, avoid duplication
3. **Test What Matters** - Business logic and data integrity, not presentation
4. **Leverage Turborepo** - Smart caching (19s → 126ms builds)
5. **i18n is MANDATORY** - Every user-facing string needs both en AND zh-CN (see [I18N.md](./references/I18N.md))
6. **Follow Rust Quality** - All code must pass `cargo clippy -- -D warnings`
7. **Delegate Complex Tasks** - Use `runSubagent` for multi-step investigations

## Working with Subagents

**For AI agents**: Delegate complex tasks to subagents rather than attempting extensive manual searches.

### When to Use `runSubagent`

✅ **Delegate**:
- Searching patterns across multiple files
- Investigating unfamiliar code areas
- Cross-package changes requiring context
- Debugging with comprehensive exploration

❌ **Don't delegate**:
- Simple single-file edits
- Well-known commands
- Already clear and scoped tasks

### Delegation Pattern

```typescript
runSubagent({
  description: "Find validation logic",
  prompt: `Search for all spec validation logic.
  
  Return:
  1. Where rules are defined
  2. What checks are performed
  3. Where validation is called
  
  Focus on: packages/mcp, rust/leanspec-core`
});
```

## Critical Commands

The 20% you need 80% of the time:

```bash
# Setup
pnpm install              # Install dependencies
pnpm build                # Build all packages

# Development
pnpm dev                  # Start web UI + HTTP server
pnpm dev:watch            # Same + auto-rebuild Rust on changes
pnpm dev:web              # Web UI only
pnpm build:rust           # Build Rust (debug)

# Validation (run before PR) - ⚠️ ALL REQUIRED
pnpm typecheck            # ← NEVER SKIP - Check TypeScript errors
pnpm test                 # All tests
pnpm lint                 # Lint checks
pnpm lint:rust            # Rust clippy checks
pnpm pre-release          # Full validation: typecheck, test, build, lint
```

**⚠️ Always run `pnpm typecheck` before marking work complete.**

**All commands in root `package.json`. For full reference, use skill: `leanspec-scripts`.**

## Critical Rules

Rules enforced by hooks or CI:

1. **Light/Dark Theme** - ALL UI must support both themes
2. **i18n** - Update BOTH en and zh-CN → [I18N.md](./references/I18N.md) ⚠️ commonly forgotten
3. **Regression Tests** - Bug fixes MUST include failing-then-passing tests
4. **Rust Quality** - Must pass `cargo clippy -- -D warnings`
5. **Use shadcn/ui** - No native HTML form elements
6. **cursor-pointer** - All clickable items must use `cursor-pointer`

**See [RULES.md](./references/RULES.md) for complete requirements.**
