---
status: planned
created: '2025-11-11'
tags:
  - architecture
  - refactor
  - monorepo
  - v0.3.0-launch
priority: high
created_at: '2025-11-11T13:33:33.321Z'
---

# Monorepo Structure & Core Package Extraction

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-11

**Project**: lean-spec  
**Team**: Core Development

## Overview

Restructure lean-spec into a **pnpm monorepo** with a shared `@leanspec/core` package that provides platform-agnostic spec parsing, validation, and utilities. This enables code reuse across CLI, MCP server, and the upcoming web application while maintaining consistency in how specs are processed.

**Problem**: The web application (spec 035) needs to parse and validate specs identically to the CLI/MCP server, but currently ~40% of the codebase is tightly coupled to Node.js file system operations. Duplicating this logic would lead to drift and inconsistency.

**Solution**: Extract shared logic into `@leanspec/core` with abstract storage interfaces, allowing the same parsing/validation code to work with both file systems (CLI) and GitHub API (web).

**Why now?** 
- Web app development starting (spec 035)
- Need guaranteed consistency between CLI and web parsing
- Already using pnpm (workspace support built-in)
- Prevents technical debt from code duplication

## Design

### Monorepo Structure

```
lean-spec/                         # Root monorepo
├── package.json                   # Workspace root
├── pnpm-workspace.yaml           # pnpm workspaces config
├── turbo.json                    # Turborepo build orchestration (optional)
├── packages/
│   ├── core/                     # 🎯 SHARED CORE PACKAGE
│   │   ├── package.json          # @leanspec/core
│   │   ├── src/
│   │   │   ├── index.ts          # Public API exports
│   │   │   ├── types/
│   │   │   │   ├── spec.ts       # SpecInfo, SpecFrontmatter, etc.
│   │   │   │   └── storage.ts    # Abstract storage interface
│   │   │   ├── parsers/
│   │   │   │   ├── frontmatter.ts
│   │   │   │   └── spec-loader.ts
│   │   │   ├── validators/
│   │   │   │   ├── frontmatter.ts
│   │   │   │   ├── structure.ts
│   │   │   │   ├── line-count.ts
│   │   │   │   └── sub-spec.ts
│   │   │   └── utils/
│   │   │       ├── spec-stats.ts
│   │   │       ├── insights.ts
│   │   │       └── filters.ts
│   │   └── tsconfig.json
│   │
│   ├── cli/                      # 🔧 CLI & MCP SERVER
│   │   ├── package.json          # lean-spec (existing CLI)
│   │   ├── src/
│   │   │   ├── cli.ts
│   │   │   ├── mcp-server.ts
│   │   │   ├── commands/
│   │   │   ├── adapters/
│   │   │   │   └── fs-storage.ts # File system adapter for core
│   │   │   └── utils/
│   │   │       └── cli-helpers.ts
│   │   └── bin/
│   │       └── lean-spec.js
│   │
│   └── web/                      # 🌐 WEB APP (future - spec 035)
│       ├── package.json          # @leanspec/web
│       ├── src/
│       │   ├── app/              # Next.js App Router
│       │   ├── components/
│       │   ├── lib/
│       │   │   ├── adapters/
│       │   │   │   └── github-storage.ts # GitHub adapter for core
│       │   │   └── db/           # Database queries
│       │   └── types/
│       └── prisma/
│
├── specs/                        # Keep at root (dogfooding)
├── docs-site/                    # Keep at root
└── templates/                    # Keep at root
```

### Core Package Architecture

**Abstract Storage Interface** (enables platform independence):

```typescript
// packages/core/src/types/storage.ts
export interface SpecStorage {
  // File operations
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  
  // Directory operations
  listFiles(dirPath: string): Promise<string[]>;
  listDirs(dirPath: string): Promise<string[]>;
  
  // Metadata
  getFileStats?(path: string): Promise<{ size: number; modified: Date }>;
}

// CLI adapter (Node.js fs)
export class FileSystemStorage implements SpecStorage {
  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf-8');
  }
  // ... etc
}

// Web adapter (GitHub API via Octokit)
export class GitHubStorage implements SpecStorage {
  constructor(private octokit: Octokit, private owner: string, private repo: string) {}
  
  async readFile(path: string): Promise<string> {
    const { data } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
    });
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  // ... etc
}
```

**Core API Design**:

```typescript
// packages/core/src/index.ts
export * from './types';
export * from './parsers/frontmatter';
export * from './parsers/spec-loader';
export * from './validators';
export * from './utils';

// Example usage in CLI:
import { SpecLoader, FileSystemStorage } from '@leanspec/core';

const storage = new FileSystemStorage();
const loader = new SpecLoader(storage);
const specs = await loader.loadAllSpecs({ includeArchived: false });

// Example usage in web:
import { SpecLoader, GitHubStorage } from '@leanspec/web/adapters';

const storage = new GitHubStorage(octokit, 'codervisor', 'lean-spec');
const loader = new SpecLoader(storage);
const specs = await loader.loadAllSpecs({ includeArchived: false });
```

### What Goes in Core?

**✅ Include in `@leanspec/core`:**
- **Type definitions**: `SpecInfo`, `SpecFrontmatter`, `SpecStatus`, `SpecPriority`, etc.
- **Parsers**: Frontmatter parsing (gray-matter), spec content parsing
- **Validators**: Frontmatter validation, structure validation, line count, sub-spec validation
- **Utils**: Stats calculation, insights generation, filtering, sorting
- **Pure functions**: Any logic that doesn't depend on I/O

**❌ Keep in `@leanspec/cli`:**
- CLI command implementations
- Terminal output formatting (colors, tables)
- MCP server logic
- File system operations (wrapped in adapter)
- Git operations

**❌ Goes in `@leanspec/web`:**
- Next.js app code
- React components
- Database queries
- GitHub API client
- Web-specific adapters

### Migration Strategy

**Phase 1: Setup Monorepo (No Breaking Changes)**
1. Create `pnpm-workspace.yaml`
2. Create `packages/core/` structure
3. Create `packages/cli/` and move existing code
4. Update import paths in CLI
5. Ensure all tests pass

**Phase 2: Extract Core Package**
1. Copy shared code to `packages/core/`
2. Refactor to use abstract storage interface
3. Update CLI to use `@leanspec/core` + FileSystemStorage
4. Update MCP server to use `@leanspec/core`
5. Ensure all tests pass

**Phase 3: Optimize & Document**
1. Add tests for core package
2. Update documentation
3. Publish `@leanspec/core` to npm (optional)
4. Create migration guide

## Plan

### Phase 1: Monorepo Setup (1-2 days)
- [ ] Create `pnpm-workspace.yaml` config
- [ ] Create `packages/` directory structure
- [ ] Move existing code to `packages/cli/`
- [ ] Update all import paths in CLI
- [ ] Update `package.json` workspace dependencies
- [ ] Run tests to ensure nothing broke
- [ ] Update CI/CD to handle monorepo structure

### Phase 2: Core Package Extraction (3-4 days)
- [ ] Create `packages/core/` structure
- [ ] Design abstract `SpecStorage` interface
- [ ] Extract and refactor `frontmatter.ts` (remove fs dependencies)
- [ ] Extract and refactor `spec-loader.ts` (use SpecStorage interface)
- [ ] Extract all validators (pure functions, no refactoring needed)
- [ ] Extract utils: `spec-stats.ts`, `insights.ts`, `filters.ts`
- [ ] Create `FileSystemStorage` adapter in CLI package
- [ ] Update CLI to use `@leanspec/core` + adapter
- [ ] Update MCP server to use `@leanspec/core` + adapter

### Phase 3: Testing & Validation (2-3 days)
- [ ] Write unit tests for core package
- [ ] Write integration tests for storage adapters
- [ ] Run full test suite (ensure >80% coverage maintained)
- [ ] Benchmark performance (ensure no regression)
- [ ] Test CLI commands end-to-end
- [ ] Test MCP server end-to-end

### Phase 4: Documentation & Polish (1-2 days)
- [ ] Document `@leanspec/core` API
- [ ] Document storage adapter pattern
- [ ] Update CONTRIBUTING.md with monorepo workflow
- [ ] Create architecture diagram
- [ ] Update build and release scripts
- [ ] Optional: Add Turborepo for build caching

## Test

### Unit Tests
- [ ] Core parsers work with string input (no fs dependencies)
- [ ] Validators work with in-memory data
- [ ] Utils produce correct calculations
- [ ] FileSystemStorage adapter works with real files
- [ ] GitHubStorage adapter works with mocked Octokit

### Integration Tests
- [ ] CLI commands work unchanged
- [ ] MCP server works unchanged
- [ ] Spec loading via FileSystemStorage matches old behavior
- [ ] All existing tests pass with new structure

### Performance Tests
- [ ] No performance regression in CLI operations
- [ ] Spec loading time unchanged (<10ms)
- [ ] Memory usage unchanged

### Quality Gates
- [ ] Test coverage >80% maintained
- [ ] All existing functionality works
- [ ] No breaking changes for end users
- [ ] Build succeeds in CI

## Notes

### Why Monorepo?

**Benefits:**
- ✅ Shared code between CLI and web (30-40% reusable)
- ✅ Type safety across packages
- ✅ Atomic commits across changes
- ✅ Simpler local development
- ✅ Already using pnpm (workspaces built-in)

**Alternatives Considered:**

**Option 1: Separate npm package**
- ❌ More overhead (separate repo, publishing)
- ❌ Slower iteration (need to publish to test)
- ❌ Version coordination issues

**Option 2: Code duplication**
- ❌ High risk of drift/inconsistency
- ❌ Double maintenance burden
- ❌ Different parsing behavior = bugs

**Decision**: Monorepo is best fit for this project's needs.

### Dependencies

**Required by:**
- spec 035 (live-specs-showcase) - Needs `@leanspec/core` for GitHub parsing
- spec 065 (v0.3 launch) - This is a critical path item

**Blocks:**
- Web app development cannot start without shared core
- GitHub integration needs consistent parsing logic

### Migration Path

**For end users:**
- ✅ No breaking changes
- ✅ CLI commands work identically
- ✅ MCP server works identically
- ✅ Same npm package name: `lean-spec`

**For contributors:**
- Updated CONTRIBUTING.md with monorepo workflow
- Run `pnpm install` at root (installs all packages)
- Run `pnpm test` at root (tests all packages)
- Package-specific commands: `pnpm --filter @leanspec/cli test`

### Tools & Configuration

**Workspace Management:**
- pnpm workspaces (built-in, already using pnpm)
- Turborepo (optional - adds build caching, can add later)

**TypeScript:**
- Shared `tsconfig.base.json` at root
- Package-specific configs extend base
- Path aliases for clean imports

**Testing:**
- Vitest at root (already using)
- Run all tests: `pnpm test`
- Run specific: `pnpm --filter @leanspec/core test`

### Open Questions

- [ ] Should we publish `@leanspec/core` to npm or keep workspace-only?
- [ ] Do we need Turborepo now or add later when we have 3+ packages?
- [ ] Should MCP server be separate package or stay in CLI?

### Success Criteria

- ✅ Monorepo structure in place
- ✅ Core package extracted and tested
- ✅ CLI/MCP work identically to before
- ✅ Zero breaking changes for users
- ✅ Ready for web app to consume `@leanspec/core`
- ✅ All tests passing
- ✅ Documentation updated
