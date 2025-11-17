# LeanSpec Packages

This directory contains the LeanSpec monorepo packages.

## Structure

```
packages/
├── core/       - @leanspec/core: Platform-agnostic spec parsing & validation
├── cli/        - lean-spec: CLI tool and MCP server (Node.js)
├── ui/         - @leanspec/ui: Standalone UI bundle + launcher (spec 087)
└── web/        - @leanspec/web: Web application (future - spec 035)
```

## @leanspec/core

**Platform-agnostic spec parsing and validation library.**

The core package provides:
- Type definitions (`SpecInfo`, `SpecFrontmatter`, etc.)
- Frontmatter parsing (using gray-matter)
- Validators (frontmatter, structure, line count)
- Utilities (stats, insights, filters)
- Abstract storage interface (`SpecStorage`)

**No file system dependencies** - uses storage adapters for platform-specific I/O.

### Usage

```typescript
import { 
  parseFrontmatterFromString,
  FrontmatterValidator,
  type SpecStorage 
} from '@leanspec/core';

// Parse frontmatter from markdown content
const content = await storage.readFile('spec.md');
const frontmatter = parseFrontmatterFromString(content);

// Validate spec
const validator = new FrontmatterValidator();
const result = await validator.validate(spec);
```

## lean-spec (CLI)

**Command-line interface and MCP server.**

Implements:
- All CLI commands (`list`, `create`, `update`, `validate`, etc.)
- MCP server for AI agent integration
- FileSystemStorage adapter (Node.js fs operations)
- Terminal output formatting

### Development

```bash
cd packages/cli
pnpm install
pnpm build
pnpm test
```

## Storage Adapters

The core package uses abstract storage interfaces to enable platform independence:

### FileSystemStorage (CLI)

```typescript
// packages/cli/src/adapters/fs-storage.ts
import { FileSystemStorage } from './adapters/fs-storage.js';

const storage = new FileSystemStorage();
const content = await storage.readFile('/path/to/spec/README.md');
```

### GitHubStorage (Web - future)

```typescript
// packages/web/lib/adapters/github-storage.ts
import { GitHubStorage } from '@leanspec/web/adapters';

const storage = new GitHubStorage(octokit, 'owner', 'repo');
const content = await storage.readFile('specs/001-example/README.md');
```

## @leanspec/ui

**Published UI bundle and launcher.**

Packages the Next.js app from `@leanspec/web` using standalone output and exposes a CLI (`npx @leanspec/ui`). Used automatically by `lean-spec ui` outside the monorepo.

### Development

```bash
pnpm --filter @leanspec/web build   # produce .next/standalone assets
pnpm --filter @leanspec/ui build    # copy artifacts into packages/ui/dist
node packages/ui/bin/ui.js --dry-run
```

The build script copies `.next/standalone`, `.next/static`, and `public/` into `packages/ui/dist/` for publishing via the GitHub Actions workflow.

## Building

Build all packages:
```bash
pnpm build
```

Build specific package:
```bash
pnpm --filter @leanspec/core build
pnpm --filter lean-spec build
```

## Testing

Run all tests:
```bash
pnpm test
```

Run tests for specific package:
```bash
pnpm --filter @leanspec/core test
pnpm --filter lean-spec test
```

## Publishing

The CLI package (`lean-spec`) and the UI bundle (`@leanspec/ui`) are published to npm. The core package (`@leanspec/core`) is currently workspace-only but can be published if needed for external use.

## Architecture

```
┌─────────────────┐
│   Web App       │  (future)
│  @leanspec/web  │
└────────┬────────┘
         │
         │ uses GitHubStorage
         │
         ▼
┌─────────────────┐
│  @leanspec/core │  ◄── Platform-agnostic
│                 │
│  • Types        │
│  • Parsers      │
│  • Validators   │
│  • Utilities    │
└────────┬────────┘
         │
         │ uses FileSystemStorage
         │
         ▼
┌─────────────────┐
│   CLI & MCP     │
│   lean-spec     │
└─────────────────┘
```

## Migration Notes

The monorepo was created in spec 067 by:
1. Creating `packages/core/` with extracted shared logic
2. Moving existing code to `packages/cli/`
3. Implementing `FileSystemStorage` adapter in CLI
4. Core package exports validators, parsers, and utilities

**Zero breaking changes** for end users - the `lean-spec` CLI works identically to before.
