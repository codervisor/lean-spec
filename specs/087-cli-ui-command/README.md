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
updated_at: '2025-11-17T06:12:03.020Z'
transitions:
  - status: in-progress
    at: '2025-11-17T01:59:34.354Z'
  - status: complete
    at: '2025-11-17T06:12:03.020Z'
completed_at: '2025-11-17T02:00:24.131Z'
completed: '2025-11-17'
---

# CLI UI Command: `lean-spec ui`

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-17 · **Tags**: cli, web, dx, integration

**Project**: lean-spec  
**Team**: Core Development  
**Related**: Spec 035 (live-specs-showcase), Spec 081 (web-app-ux-redesign), Spec 082 (web-realtime-sync-architecture)

## Current Status

**Phase 1: CLI Command (Monorepo Mode)** - ✅ **COMPLETE**
- Basic `lean-spec ui` command implemented with all options
- Monorepo detection working (checks for `packages/web`)
- Package manager auto-detection (pnpm/yarn/npm)
- Port validation (1-65535 range)
- Robust error handling and graceful shutdown
- Unit tests passing
- Code review feedback addressed

### Implementation Approach

**Phase 1: CLI command (packages/cli/src/commands/ui.ts)**
- `startUi` validates ports, resolves specs via explicit flag, `.lean-spec/config.json`, YAML configs, or common folder heuristics.
- `detectPackageManager()` centralizes pnpm/yarn/npm detection using user agents + lockfiles so both dev and production code paths invoke the right tool.
- `runLocalWeb()` now sets `SPECS_MODE=filesystem`, inherits the detected package manager (`pnpm run dev`, `yarn run dev`, etc.), auto-opens the browser, and tears down cleanly on `SIGINT`.

**Phase 2: Published runner (`runPublishedUI`)**
- Outside the monorepo we construct the proper command (`pnpm dlx --prefer-offline @leanspec/ui ...`, `yarn dlx ...`, or `npx --yes ...`) and stream stdio straight through so the packaged UI owns the console experience.
- Dry runs show the exact delegation command for both monorepo and external cases, enabling smoke tests without starting servers.

**@leanspec/ui package (packages/ui/)**
- Next.js config now emits `output: 'standalone'`, producing `/.next/standalone/packages/web/server.js` plus the necessary node_modules snapshot.
- `scripts/prepare-dist.mjs`
  - Ensures a fresh web build exists (running `pnpm --filter @leanspec/web build` on demand).
  - Copies `.next/standalone`, `.next/static`, `public/`, and `BUILD_ID` into `packages/ui/dist/`, handling the nested `packages/web` path automatically.
- `bin/ui.js`
  - Resolves specs via flag/config/heuristics, validates ports, and exposes `--port`, `--specs`, `--no-open`, and `--dry-run` flags.
  - Runs `node dist/standalone/packages/web/server.js` with `SPECS_MODE=filesystem`, opens the browser after launch, and surfaces troubleshooting hints when the build is missing.

**Release automation**
- `.github/workflows/publish-ui.yml` installs dependencies, runs `pnpm --filter @leanspec/ui build`, and publishes the package with provenance whenever a `ui-v*` tag is pushed or the workflow is dispatched.
  
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

**Day 1-2: Basic Command Implementation** - ✅ **COMPLETE**
- [x] Create `packages/cli/src/commands/ui.ts`
- [x] Implement command registration in registry
- [x] Add monorepo detection logic (check for `packages/web`)
- [x] Implement `runLocalWeb()` for dev mode
- [x] Add port, specs-dir, and no-open options
- [x] Add `--dry-run` flag for testing
- [x] Test in LeanSpec monorepo
- [x] Add port validation (1-65535)
- [x] Auto-detect package manager (pnpm/yarn/npm)
- [x] Fix race conditions and event listener leaks
- [x] Comprehensive error handling

**Day 3: External Package Delegation** - ✅ **COMPLETE**
- [x] Implement `runPublishedUI()` that spawns pnpm/yarn/npm runners for `@leanspec/ui`
- [x] Add specs directory auto-detection (config + heuristics)
- [x] Add error handling for missing specs / missing build artifacts
- [x] Add graceful shutdown (SIGINT handling)
- [x] Test with and without local monorepo context (dry-run)

### Phase 2: Standalone UI Package (Week 2) - ✅ **COMPLETE**

**Day 4-5: Package Structure**
- [x] Create `packages/ui/` directory
- [x] Build wrapper + dist copier sourced from `packages/web`
- [x] Create `bin/ui.js` wrapper script
- [x] Update package.json with bin entry point + publish config
- [x] Configure build scripts (`scripts/prepare-dist.mjs` + `prepublishOnly`)
- [x] Add README with usage + troubleshooting instructions

**Day 6-7: Standalone Build**
- [x] Configure Next.js for standalone builds (`output: 'standalone'`)
- [x] Test production build works and copies nested workspace paths
- [x] Verify bundle completeness via `node packages/ui/bin/ui.js --dry-run`
- [x] Add CLI arg parsing (--specs, --port, --no-open, --dry-run)
- [x] Browser auto-open + graceful shutdown

**Day 8: Integration Testing**
- [x] Test `lean-spec ui` in monorepo (dev mode, dry-run)
- [x] Test external invocation (`node ... ui --specs ... --dry-run`)
- [x] Validate missing specs messaging + port validation
- [ ] Full manual verification of realtime filesystem cache (tracked for follow-up release)

### Phase 3: Documentation & Polish (Week 3)

**Day 9-10: Documentation**
- [x] Update CLI help text with `ui` command + specs override example
- [x] Add examples to main README (Quick Start step 4)
- [x] Create @leanspec/ui README with usage + env docs
- [x] Document environment variables in the package README
- [x] Add troubleshooting guide for the published package

**Day 11-12: Publishing Preparation**
- [x] Version bump coordination (`@leanspec/ui@0.3.0`)
- [x] Update CHANGELOG.md
- [ ] Test npm publish dry-run (handled during release freeze)
- [x] Verify package.json metadata + files list
- [ ] Test installation from npm registry (will happen after first publish)

**Day 13: Release**
- [ ] Publish `@leanspec/ui` to npm (next release tag `ui-v0.3.0`)
- [ ] Publish updated `lean-spec` CLI to npm (bundled with release cadence)
- [ ] Create GitHub release with notes
- [ ] Announce feature in docs/social once npm publish is live

## Test

### Functional Testing

**CLI Command:**
- [x] `lean-spec ui` works in LeanSpec monorepo (dev mode dry-run)
- [x] `lean-spec ui` works in external projects (delegates via pnpm/yarn/npm dry-run)
- [x] `--specs` option overrides auto-detection
- [x] `--port` option changes port correctly
- [x] `--no-open` prevents browser from opening
- [x] `--dry-run` shows what would run without executing
- [x] Error message when specs directory not found
- [x] Graceful shutdown on Ctrl+C
- [x] Port validation (1-65535 range)
- [x] Package manager detection (pnpm/yarn/npm)

**Standalone UI Package:**
- [ ] `npx @leanspec/ui` launches web UI (will verify after first publish)
- [x] Dry-run confirms env vars (SPECS_MODE/SPECS_DIR) and command construction
- [x] Works with custom `--specs` directory via CLI flag
- [x] Browser auto-open + graceful shutdown logic implemented
- [ ] Filesystem mode async cache + live reload acceptance (tracked via spec 082 instrumentation)
- [ ] Cache updates work (realtime within 60s)

**Integration:**
- [x] CLI delegates to standalone package when outside the monorepo (dry-run verification)
- [x] Monorepo dev mode takes precedence over published package
- [ ] Both modes can run simultaneously (different ports)
- [x] Process cleanup works (SIGINT propagated to child processes)

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

- [ ] Should we support watching for file changes (instant reload) beyond the filesystem cache window? (Deferred to a future spec once we feel pain)
- [ ] Should we add `lean-spec ui export/share` flows for static hosting or temporary sharing?
- [ ] Should we bundle a version checker (warn if CLI/UI versions are out of sync)? (Candidate for the docs polish phase)

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
