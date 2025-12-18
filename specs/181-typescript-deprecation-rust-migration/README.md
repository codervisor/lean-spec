---
status: planned
created: '2025-12-18'
tags:
  - architecture
  - rust
  - typescript
  - migration
  - deprecation
priority: high
created_at: '2025-12-18T09:33:42.792888425+00:00'
depends_on:
  - 170-cli-mcp-core-rust-migration-evaluation
  - 172-rust-cli-mcp-npm-distribution
  - 173-rust-binaries-ci-cd-pipeline
---

# Deprecate TypeScript Core in Favor of Rust Implementation

> **Status**: 🗓️ Planned · **Created**: 2025-12-18

## Overview

With Rust implementations of CLI and MCP server now complete (specs 170, 172, 173), we need to deprecate all TypeScript core code and ensure TypeScript packages become thin wrappers around Rust binaries rather than reimplementing features.

**Current Problem:**
- `@leanspec/core` (TypeScript) still contains core logic
- `@leanspec/ui` imports from `@leanspec/core` causing build dependencies
- TypeScript and Rust implementations diverge over time
- Double maintenance burden for features
- CI workflows must build both TypeScript and Rust

**Goal:** Single source of truth in Rust. TypeScript packages either deleted or become minimal adapters.

## Current State

### TypeScript Packages Using Core Logic

**@leanspec/core** (`packages/core/src/`):
- Frontmatter parsing/updating (`createUpdatedFrontmatter`)
- File I/O utilities (`atomicWriteFile`)
- Token counting (tiktoken-based)
- Spec validation
- Search utilities

**@leanspec/ui** uses `@leanspec/core` for:
- `createUpdatedFrontmatter` - updating spec frontmatter in API routes
- `atomicWriteFile` - safe file writing
- Files: `packages/ui/src/app/api/projects/[id]/specs/[spec]/metadata/route.ts`
- Files: `packages/ui/src/app/api/projects/[id]/specs/[spec]/status/route.ts`

**@leanspec/cli** (TypeScript version):
- Entire CLI implementation wraps `@leanspec/core`

**@leanspec/mcp** (TypeScript version):
- MCP server wraps `@leanspec/core`

### Rust Implementations (Already Complete)

- `rust/leanspec-cli/` - Full CLI in Rust
- `rust/leanspec-mcp/` - Full MCP server in Rust
- `rust/leanspec-core/` - Core functionality library
- Distribution via npm with platform-specific binaries (spec 172)

## Migration Strategy

### Phase 1: Remove TypeScript CLI/MCP Packages
- [ ] Delete `packages/cli/` (TypeScript version)
- [ ] Delete `packages/mcp/` (TypeScript version)
- [ ] Update root `package.json` scripts to use Rust binaries
- [ ] Update monorepo workspace config to remove these packages
- [ ] Update documentation to reference Rust binaries only

### Phase 2: Inline Minimal Functions in @leanspec/ui
- [ ] Identify the 2 functions UI needs from `@leanspec/core`:
  - `createUpdatedFrontmatter` - Update spec frontmatter fields
  - `atomicWriteFile` - Safe file writing
- [ ] Create `packages/ui/src/lib/spec-utils/frontmatter.ts` with inline implementation
- [ ] Create `packages/ui/src/lib/spec-utils/file-ops.ts` with inline implementation
- [ ] Update imports in affected files:
  - `packages/ui/src/app/api/projects/[id]/specs/[spec]/metadata/route.ts`
  - `packages/ui/src/app/api/projects/[id]/specs/[spec]/status/route.ts`
- [ ] Remove `@leanspec/core` from UI's `devDependencies`
- [ ] Test metadata/status update endpoints work correctly

### Phase 3: Delete @leanspec/core Package
- [ ] Mark `@leanspec/core` as deprecated in npm (publish final version)
- [ ] Add deprecation notice to README
- [ ] Publish final version with deprecation notice
- [ ] Delete `packages/core/` directory entirely
- [ ] Remove from monorepo workspace configuration
- [ ] Update `pnpm-workspace.yaml` to remove core package

### Phase 4: Update CI/CD
- [ ] Remove TypeScript build from CI (except UI)
- [ ] Simplify CI to: Rust build → UI build (inline utils)
- [ ] Update publish workflows
- [ ] Remove `pnpm build` from copilot-setup-steps (except UI)

### Phase 5: Documentation Updates
- [ ] Update AGENTS.md to clarify Rust is primary
- [ ] Update CONTRIBUTING.md
- [ ] Update architecture diagrams
- [ ] Remove references to TypeScript CLI/MCP/core
- [ ] Add migration guide for contributors

## Decision: Inline Functions in UI Package

**Approach: Inline 2 Functions Directly in @leanspec/ui**

Only 2 functions from `@leanspec/core` are used by UI:
- `createUpdatedFrontmatter` (used in 2 API routes)
- `atomicWriteFile` (used in 1 API route)

**Implementation:**
```typescript
// packages/ui/src/lib/spec-utils/frontmatter.ts
import matter from 'gray-matter';

export function createUpdatedFrontmatter(content: string, updates: Record<string, any>) {
  const { data, content: body } = matter(content);
  const updated = { ...data, ...updates };
  return matter.stringify(body, updated);
}

// packages/ui/src/lib/spec-utils/file-ops.ts
import { writeFile, rename } from 'fs/promises';
import { join } from 'path';

export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, content, 'utf-8');
  await rename(tmpPath, filePath);
}
```

**Rationale:**
- Only ~20 lines of code total
- No point maintaining entire package for 2 functions
- UI already has `gray-matter` as dependency
- Simpler architecture, fewer packages to manage
- Desktop already uses Rust directly (no TypeScript core)

## Verification

- [ ] `pnpm build` works with only Rust + UI
- [ ] UI functionality unchanged (metadata updates, etc.)
- [ ] CI passes without TypeScript CLI/MCP/core
- [ ] No imports from deleted packages
- [ ] Documentation updated
- [ ] Deprecation notices published

## Risks

1. **Breaking changes for contributors** - Clear communication needed
2. **Build system changes** - Need to update CI/CD pipelines
3. **Complex migration** - Incremental approach mitigates

## Related Specs

- 170-cli-mcp-core-rust-migration-evaluation
- 172-rust-cli-mcp-npm-distribution
- 173-rust-binaries-ci-cd-pipeline
- 180-rust-distribution-workflow-alignment
