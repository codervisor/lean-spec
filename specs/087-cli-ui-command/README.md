---
status: complete
created: '2025-11-17'
tags:
  - cli
  - web
  - dx
  - integration
priority: medium
created_at: '2025-11-17T01:31:21.397Z'
related:
  - 035-live-specs-showcase
  - 081-web-app-ux-redesign
  - 082-web-realtime-sync-architecture
updated_at: '2025-11-17T02:00:24.131Z'
transitions:
  - status: in-progress
    at: '2025-11-17T01:59:34.354Z'
  - status: complete
    at: '2025-11-17T02:00:24.131Z'
completed_at: '2025-11-17T02:00:24.131Z'
completed: '2025-11-17'
---

# CLI UI Command: `lean-spec ui`

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-17 · **Tags**: cli, web, dx, integration

**Project**: lean-spec  
**Team**: Core Development  
**Related**: Spec 035 (live-specs-showcase), Spec 081 (web-app-ux-redesign), Spec 082 (web-realtime-sync-architecture)

## Overview

Add a `lean-spec ui` command to the CLI that launches the local web interface for visual spec management. This provides a better UX for users who prefer graphical interfaces over CLI commands, especially for browsing, searching, and understanding spec relationships.

**Why now?**
- Web app is production-ready (specs 035, 081, 082 completed)
- Filesystem-based architecture (spec 082) enables realtime local spec viewing
- Natural complement to CLI workflow - some tasks are better visual (board view, search, relationships)
- Low effort, high value feature for improving DX

**What's the problem?**
- Users must manually navigate to `packages/web` and run `npm run dev` to access the UI
- No integrated workflow between CLI and web interface
- External projects using `lean-spec` have no easy way to access the web UI
- Missing discoverability - users may not know the web interface exists

**What's the solution?**
Add `lean-spec ui` command that:
1. **For external projects**: Runs a published standalone web UI package (`@leanspec/ui`)
2. **For LeanSpec monorepo** (dev): Optionally detects and runs local `packages/web` dev server
3. Opens browser automatically to the UI
4. Watches specs directory for changes (realtime updates via spec 082 architecture)

## Design

### Package Strategy

**Published Package Approach** (Preferred for external projects):

Create a separate `@leanspec/ui` package that:
- Bundles the web app as a standalone executable
- Can be run via `npx @leanspec/ui` or installed globally
- Detects specs directory automatically (looks for `specs/` or `leanspec.yaml`)
- Lightweight CLI wrapper around Next.js production build

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│ User Project                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  specs/                                                 │
│  └── 001-my-spec/                                       │
│      └── README.md                                      │
│                                                         │
│  $ npx lean-spec ui                                     │
│         ↓                                               │
│  Runs: npx @leanspec/ui --specs ./specs                 │
│         ↓                                               │
│  Opens: http://localhost:3000                           │
│         ↓                                               │
│  Web UI (filesystem mode) ← reads specs/ directly       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Command Interface

```bash
# Start web UI (auto-detect specs directory)
lean-spec ui

# Specify custom specs directory
lean-spec ui --specs ./my-specs

# Specify custom port
lean-spec ui --port 3001

# Don't open browser automatically
lean-spec ui --no-open

# Show what would run without executing
lean-spec ui --dry-run
```

### Implementation Approach

**Phase 1: CLI Command (packages/cli/src/commands/ui.ts)**

```typescript
import { Command } from 'commander';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

export function registerUiCommand(program: Command) {
  program
    .command('ui')
    .description('Start local web UI for spec management')
    .option('-s, --specs <dir>', 'Specs directory', './specs')
    .option('-p, --port <port>', 'Port to run on', '3000')
    .option('--no-open', "Don't open browser automatically")
    .option('--dry-run', 'Show what would run without executing')
    .action(async (options) => {
      const specsDir = resolve(process.cwd(), options.specs);
      
      // Verify specs directory exists
      if (!existsSync(specsDir)) {
        console.error(chalk.red(`✗ Specs directory not found: ${specsDir}`));
        console.log(chalk.dim('\nRun `lean-spec init` to initialize LeanSpec in this directory.'));
        process.exit(1);
      }
      
      // Check if running in LeanSpec monorepo (dev mode)
      const localWebDir = join(process.cwd(), 'packages/web');
      const isMonorepo = existsSync(localWebDir);
      
      if (isMonorepo) {
        // Dev mode: Run local web package
        return runLocalWeb(localWebDir, options);
      } else {
        // Production mode: Run published @leanspec/ui package
        return runPublishedUI(specsDir, options);
      }
    });
}

async function runLocalWeb(webDir: string, options: any) {
  console.log(chalk.dim('→ Detected LeanSpec monorepo, using local web package\n'));
  
  if (options.dryRun) {
    console.log(chalk.cyan('Would run:'));
    console.log(chalk.dim(`  cd ${webDir} && npm run dev`));
    return;
  }
  
  const spinner = ora('Starting web UI...').start();
  
  const child = spawn('npm', ['run', 'dev'], {
    cwd: webDir,
    stdio: 'inherit',
    env: { ...process.env, PORT: options.port }
  });
  
  // Wait for server to be ready
  setTimeout(async () => {
    spinner.succeed('Web UI running');
    console.log(chalk.green(`\n✨ LeanSpec UI: http://localhost:${options.port}\n`));
    console.log(chalk.dim('Press Ctrl+C to stop\n'));
    
    if (options.open) {
      const open = (await import('open')).default;
      await open(`http://localhost:${options.port}`);
    }
  }, 3000);
  
  // Handle shutdown
  process.on('SIGINT', () => {
    child.kill();
    console.log(chalk.dim('\n✓ Web UI stopped'));
    process.exit(0);
  });
}

async function runPublishedUI(specsDir: string, options: any) {
  if (options.dryRun) {
    console.log(chalk.cyan('Would run:'));
    console.log(chalk.dim(`  npx @leanspec/ui --specs ${specsDir} --port ${options.port}`));
    return;
  }
  
  console.log(chalk.dim('→ Using published @leanspec/ui package\n'));
  
  const spinner = ora('Starting web UI...').start();
  
  const child = spawn('npx', [
    '@leanspec/ui',
    '--specs', specsDir,
    '--port', options.port,
    options.open ? '' : '--no-open'
  ].filter(Boolean), {
    stdio: 'inherit',
    env: process.env
  });
  
  // Handle shutdown
  process.on('SIGINT', () => {
    child.kill();
    console.log(chalk.dim('\n✓ Web UI stopped'));
    process.exit(0);
  });
}
```

**Phase 2: Standalone UI Package (packages/ui/)**

Create new package `@leanspec/ui`:

```json
{
  "name": "@leanspec/ui",
  "version": "0.3.0",
  "description": "Web UI for LeanSpec - visual spec management",
  "bin": {
    "leanspec-ui": "./bin/ui.js"
  },
  "dependencies": {
    "@leanspec/core": "workspace:*",
    "next": "16.0.1",
    "react": "19.2.0",
    "react-dom": "19.2.0"
    // ... other web dependencies
  },
  "scripts": {
    "build": "next build",
    "start": "node bin/ui.js"
  }
}
```

**Standalone UI Wrapper (packages/ui/bin/ui.js):**

```javascript
#!/usr/bin/env node
import { spawn } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nextDir = join(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const specsDir = args[args.indexOf('--specs') + 1] || './specs';
const port = args[args.indexOf('--port') + 1] || '3000';
const noOpen = args.includes('--no-open');

// Set environment variables
process.env.SPECS_DIR = resolve(process.cwd(), specsDir);
process.env.PORT = port;
process.env.SPECS_MODE = 'filesystem'; // Force filesystem mode

// Start Next.js server
const child = spawn('next', ['start'], {
  cwd: nextDir,
  stdio: 'inherit',
  env: process.env
});

// Open browser
if (!noOpen) {
  setTimeout(async () => {
    const open = (await import('open')).default;
    await open(`http://localhost:${port}`);
  }, 2000);
}

process.on('SIGINT', () => {
  child.kill();
  process.exit(0);
});
```

### Package Publishing Strategy

**Option 1: Separate @leanspec/ui package** (Recommended)
- **Pros**: Clean separation, can be used standalone, smaller CLI package
- **Cons**: One more package to maintain
- **Use case**: External projects using `npx lean-spec ui`

**Option 2: Bundle in @leanspec/web**
- **Pros**: Reuse existing package
- **Cons**: Web package is currently private, larger dependency
- **Use case**: Make `@leanspec/web` public with CLI wrapper

**Option 3: Bundle in lean-spec CLI**
- **Pros**: Single package install
- **Cons**: CLI becomes massive (Next.js + React = ~50MB)
- **Use case**: All-in-one installation

**Recommendation: Option 1** - Create `@leanspec/ui` as a thin wrapper around `@leanspec/web` that:
- Shares code with `@leanspec/web` (monorepo symlinks)
- Has its own bin/ui.js entry point
- Can be published separately
- CLI delegates to it via `npx @leanspec/ui`

### Auto-Detection Logic

```typescript
function detectSpecsDirectory(): string | null {
  const candidates = [
    './specs',
    './spec',
    './docs/specs',
    './docs/spec',
    './.lean-spec/specs'
  ];
  
  for (const candidate of candidates) {
    if (existsSync(resolve(process.cwd(), candidate))) {
      return candidate;
    }
  }
  
  // Check for leanspec.yaml config
  const configPath = resolve(process.cwd(), 'leanspec.yaml');
  if (existsSync(configPath)) {
    const config = yaml.load(readFileSync(configPath, 'utf-8'));
    return config.specsDirectory || null;
  }
  
  return null;
}
```

### Integration with Spec 082 Architecture

The web UI will use the **filesystem mode** (spec 082) for local projects:

- Direct reads from `specs/` directory (no database required)
- In-memory caching with 60s TTL
- Realtime updates (changes appear within 60s)
- No manual seeding or sync required

**Environment Configuration:**
```bash
# Automatically set by lean-spec ui command
SPECS_MODE=filesystem
SPECS_DIR=/absolute/path/to/project/specs
PORT=3000
```

## Plan

### Phase 1: CLI Command (Week 1)

**Day 1-2: Basic Command Implementation**
- [ ] Create `packages/cli/src/commands/ui.ts`
- [ ] Implement command registration in registry
- [ ] Add monorepo detection logic (check for `packages/web`)
- [ ] Implement `runLocalWeb()` for dev mode
- [ ] Add port, specs-dir, and no-open options
- [ ] Add `--dry-run` flag for testing
- [ ] Test in LeanSpec monorepo

**Day 3: External Package Delegation**
- [ ] Implement `runPublishedUI()` that spawns `npx @leanspec/ui`
- [ ] Add specs directory auto-detection
- [ ] Add error handling (specs dir not found)
- [ ] Add graceful shutdown (SIGINT handling)
- [ ] Test with non-existent @leanspec/ui (show helpful error)

### Phase 2: Standalone UI Package (Week 2)

**Day 4-5: Package Structure**
- [ ] Create `packages/ui/` directory
- [ ] Copy/symlink relevant files from `packages/web`
- [ ] Create `bin/ui.js` wrapper script
- [ ] Update package.json with bin entry point
- [ ] Configure build scripts
- [ ] Add README with usage instructions

**Day 6-7: Standalone Build**
- [ ] Configure Next.js for standalone builds
- [ ] Test production build works
- [ ] Verify all dependencies bundled correctly
- [ ] Test bin script launches correctly
- [ ] Add CLI arg parsing (--specs, --port, --no-open)
- [ ] Test opening browser automatically

**Day 8: Integration Testing**
- [ ] Test `lean-spec ui` in monorepo (dev mode)
- [ ] Test `npx @leanspec/ui` in external project
- [ ] Test `lean-spec ui` in external project (delegates to npx)
- [ ] Verify realtime updates work (spec 082 filesystem mode)
- [ ] Test error cases (no specs dir, port already in use)

### Phase 3: Documentation & Polish (Week 3)

**Day 9-10: Documentation**
- [ ] Update CLI help text with `ui` command
- [ ] Add examples to main README
- [ ] Create @leanspec/ui README
- [ ] Document environment variables
- [ ] Add troubleshooting guide

**Day 11-12: Publishing Preparation**
- [ ] Version bump coordination (CLI + UI packages)
- [ ] Update CHANGELOG.md for both packages
- [ ] Test npm publish dry-run
- [ ] Verify package.json metadata
- [ ] Test installation from npm registry

**Day 13: Release**
- [ ] Publish `@leanspec/ui` to npm
- [ ] Publish updated `lean-spec` CLI to npm
- [ ] Create GitHub release with notes
- [ ] Announce feature in docs and social media

## Test

### Functional Testing

**CLI Command:**
- [ ] `lean-spec ui` works in LeanSpec monorepo (launches local web)
- [ ] `lean-spec ui` works in external project (delegates to @leanspec/ui)
- [ ] `--specs` option overrides auto-detection
- [ ] `--port` option changes port correctly
- [ ] `--no-open` prevents browser from opening
- [ ] `--dry-run` shows what would run without executing
- [ ] Error message when specs directory not found
- [ ] Graceful shutdown on Ctrl+C

**Standalone UI Package:**
- [ ] `npx @leanspec/ui` launches web UI
- [ ] Auto-detects specs directory correctly
- [ ] Works with custom `--specs` directory
- [ ] Opens browser to correct URL
- [ ] Environment variables set correctly (SPECS_MODE, SPECS_DIR)
- [ ] Filesystem mode reads specs correctly
- [ ] Cache updates work (realtime within 60s)

**Integration:**
- [ ] CLI delegates to standalone package correctly
- [ ] Monorepo dev mode takes precedence over published package
- [ ] Both modes can run simultaneously (different ports)
- [ ] Process cleanup works (no orphaned processes)

### Performance Testing

- [ ] Startup time <5s (cold start)
- [ ] Startup time <2s (warm cache)
- [ ] Memory usage reasonable (<200MB)
- [ ] No memory leaks during extended runs

### Compatibility Testing

- [ ] Works on macOS
- [ ] Works on Linux
- [ ] Works on Windows (WSL)
- [ ] Works with Node 20+
- [ ] Works with npm, pnpm, yarn
- [ ] Works when installed globally vs locally

### User Experience Testing

- [ ] Clear startup messages
- [ ] Helpful error messages
- [ ] Browser opens to correct page
- [ ] UI loads specs correctly
- [ ] Changes to specs appear within 60s
- [ ] Shutdown is clean (no errors)

## Notes

### Design Decisions

**Why separate @leanspec/ui package?**
- **Clean separation**: CLI stays lightweight, UI is separate concern
- **Standalone use**: Users can run `npx @leanspec/ui` directly
- **Smaller CLI**: Don't bloat CLI with Next.js/React dependencies
- **Easier maintenance**: UI can version independently

**Why not bundle UI in CLI?**
- **Size**: Next.js + React = ~50MB, too large for CLI
- **Dependencies**: React, Next.js not needed for CLI users who never use UI
- **Complexity**: Build process more complicated
- **Performance**: Slower CLI startup if bundled

**Why detect monorepo mode?**
- **Dev experience**: LeanSpec contributors shouldn't need published package
- **Faster iteration**: Local changes immediately available
- **Flexibility**: Can test unreleased UI changes

**Why filesystem mode (spec 082)?**
- **No setup**: Works immediately, no database required
- **Realtime**: Changes appear within 60s (cache TTL)
- **Simple**: Single source of truth (specs/ directory)
- **Fast**: <100ms reads from filesystem

### Package Size Comparison

| Package | Compressed | Unpacked | Dependencies |
|---------|-----------|----------|--------------|
| `lean-spec` CLI | ~500KB | ~2MB | 20 packages |
| `@leanspec/ui` | ~5MB | ~25MB | Next.js, React, UI libs |
| **Combined** | ~5.5MB | ~27MB | Separate installs |

**If bundled in CLI**: ~50MB unpacked (not acceptable)

### Alternative Approaches Considered

**1. Embedded Server in CLI**
- Pros: Single package
- Cons: Massive size, complex build, slow startup
- **Rejected**: Too complex, violates Unix philosophy

**2. Static HTML Export**
- Pros: No server needed, tiny package
- Cons: No realtime updates, limited interactivity
- **Rejected**: Defeats purpose of web UI

**3. Electron App**
- Pros: Native feel, auto-updates
- Cons: Even larger (100MB+), more maintenance
- **Rejected**: Overkill for this use case

**4. Browser Extension**
- Pros: Integrated in browser
- Cons: Limited filesystem access, requires extension install
- **Rejected**: Adds friction to workflow

### Open Questions

- [ ] Should `@leanspec/ui` be in this monorepo or separate repo?
  - **Recommendation**: Same monorepo (`packages/ui/`)
- [ ] Should we support watching for file changes (instant reload)?
  - **Recommendation**: Spec 082 cache (60s) is sufficient for v1
- [ ] Should UI command be `lean-spec ui` or `lean-spec web`?
  - **Recommendation**: `ui` is shorter, more intuitive
- [ ] Should we add `lean-spec ui build` for static export?
  - **Recommendation**: Not needed yet, defer to future
- [ ] Should we bundle a version checker (warn if outdated)?
  - **Recommendation**: Yes, add to Phase 3

### Related Work

- **Spec 035**: Live Specs Showcase - Web app foundation
- **Spec 081**: Web App UX Redesign - UI improvements
- **Spec 082**: Web Realtime Sync Architecture - Filesystem mode enables this

### Future Enhancements

**v0.4+:**
- [ ] `lean-spec ui export` - Static HTML export
- [ ] `lean-spec ui share` - Temporary public URL (via ngrok/tunneling)
- [ ] `lean-spec ui --watch` - Instant reload on file changes
- [ ] Desktop app wrapper (Tauri/Electron)
- [ ] VSCode webview integration (spec 017)
- [ ] Multi-project mode (switch between projects in UI)

### Dependencies

**This spec depends on:**
- Spec 082 (filesystem mode) - Must be complete for realtime updates
- Spec 081 (UX redesign) - UI should be polished before exposing via CLI

**This spec enables:**
- Better DX for visual learners
- Easier onboarding (show, don't tell)
- Spec 017 (VSCode extension) - Can embed UI in webview
- External adoption - Easy way to explore LeanSpec
