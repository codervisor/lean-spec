# LeanSpec Packages

This directory contains the LeanSpec monorepo packages.

## Structure

```
packages/
├── core/       - @leanspec/core: Platform-agnostic spec parsing & validation
├── cli/        - lean-spec: CLI tool and MCP server (Node.js)
├── mcp/        - @leanspec/mcp: MCP server wrapper (spec 102)
└── ui/         - @leanspec/ui: Standalone UI bundle + launcher (spec 087)
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

## @leanspec/mcp

**MCP server integration wrapper.**

Simple passthrough wrapper that delegates to `lean-spec mcp`. Makes MCP setup more discoverable with a dedicated package name.

### Usage

```bash
# Use with Claude Desktop, Cline, Zed, etc.
npx -y @leanspec/mcp
```

The package automatically installs `lean-spec` as a dependency and runs `lean-spec mcp`. See [MCP Integration docs](https://lean-spec.dev/docs/guide/usage/ai-assisted/mcp-integration) for setup instructions.

## Storage Adapters

The core package uses abstract storage interfaces to enable platform independence:

### FileSystemStorage (CLI)

```typescript
// packages/cli/src/adapters/fs-storage.ts
import { FileSystemStorage } from './adapters/fs-storage.js';

const storage = new FileSystemStorage();
const content = await storage.readFile('/path/to/spec/README.md');
```

## @leanspec/ui

**Published UI bundle and launcher.**

Contains the Next.js application and exposes a CLI (`npx @leanspec/ui`). Used automatically by `lean-spec ui` outside the monorepo.

### Development

```bash
pnpm --filter @leanspec/ui build    # build Next.js app and prepare artifacts
node packages/ui/bin/ui.js --dry-run
```

The build script produces `.next/standalone` and prepares assets for publishing via the GitHub Actions workflow.

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

The CLI package (`lean-spec`), the MCP wrapper (`@leanspec/mcp`), and the UI bundle (`@leanspec/ui`) are published to npm. The core package (`@leanspec/core`) is currently workspace-only but can be published if needed for external use.

## Architecture

```
┌─────────────────┐
│   UI App        │
│  @leanspec/ui   │
└────────┬────────┘
         │
         │ uses Core
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
