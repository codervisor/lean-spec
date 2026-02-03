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
| **Monorepo structure & packages** | [STRUCTURE.md](./references/STRUCTURE.md) |

**Everything else**: Read root `README.md`, `package.json` scripts, or explore the codebase.

## Core Principles

The non-negotiable mental model:

1. **Use pnpm** - Never npm or yarn
2. **DRY** - Extract shared logic, avoid duplication
3. **Test What Matters** - Business logic and data integrity, not presentation
4. **Leverage Turborepo** - Smart caching (19s → 126ms builds)
5. **Maintain i18n** - Update both en and zh-CN translations
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

# Development (see package.json for all scripts)
pnpm dev                  # Start all dev servers
pnpm dev:cli              # CLI watch mode
pnpm dev:web              # Web UI only

# Validation (run before PR)
pnpm pre-release          # Full validation: typecheck, test, build, lint
pnpm test:run             # All tests (CI mode)
pnpm lint:rust            # Rust clippy checks
```

**All commands are in root `package.json` - AI agents should read it directly.**

## Critical Rules

Rules enforced by hooks or CI:

1. **Light/Dark Theme** - ALL UI must support both themes
   ```typescript
   // ✅ Good
   className="text-blue-700 dark:text-blue-300"
   ```

2. **i18n** - Update BOTH en and zh-CN locales

3. **Regression Tests** - Bug fixes MUST include failing-then-passing tests

4. **Rust Quality** - Must pass `cargo clippy -- -D warnings`

5. **Use shadcn/ui** - No native HTML form elements (`<input>`, `<select>`, `<button>`, etc.)
   ```typescript
   // ✅ Good - shadcn/ui
   import { Input } from '@/components/ui/input';
   <Input placeholder="..." />
   
   // ❌ Bad - native HTML
   <input type="text" />
   ```

6. **cursor-pointer on interactive items** - All clickable dropdown/select items must use `cursor-pointer`
   ```typescript
   // ✅ Good - cursor-pointer for clickable items
   className="... cursor-pointer ..."
   
   // ❌ Bad - cursor-default on interactive items
   className="... cursor-default ..."
   ```

**See [RULES.md](./references/RULES.md) for complete requirements.**
