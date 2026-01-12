---
status: planned
created: 2026-01-12
priority: high
tags:
- architecture
- migration
- next.js
- vite
- rust
- cleanup
created_at: 2026-01-12T13:27:28.890238Z
updated_at: 2026-01-12T13:27:28.890238Z
---

## Overview

**Context**: Over the past months, LeanSpec has successfully migrated from Next.js SSR architecture to a modern Vite SPA + Rust HTTP Server architecture. The migration work is complete and proven through specs 184-207.

**Current Reality**:
- ✅ **Vite SPA** (`@leanspec/ui-vite`) is feature-complete and production-ready
- ✅ **Rust HTTP Server** (`@leanspec/http-server`) is built, tested, and working
- ✅ **Desktop app** fully integrated with ui-vite (specs 204-207)
- ✅ **99.7% bundle reduction** - 492KB vs Next.js 129MB+
- ✅ **10x performance improvement** with Rust backend
- ⚠️ **Next.js UI** (`@leanspec/ui`) still exists but is **no longer used**

**Problem**: We have a fully functional new architecture but haven't officially retired the old one. This creates:

1. **Confusion** - Two UI implementations, unclear which is primary
2. **Maintenance burden** - Still need to update Next.js code for no reason
3. **npm bloat** - Publishing unused 150MB+ Next.js package
4. **Documentation debt** - Docs reference old architecture
5. **CI/CD overhead** - Building/testing unused code
6. **Translation duplication** - Maintaining translations in two places

**Solution**: Officially deprecate and archive Next.js UI, promote Vite+Rust as the primary architecture, and update all references.

**What This Is NOT**:
- Not a new feature - this is cleanup of completed migration
- Not a rewrite - Vite SPA already exists and works
- Not breaking existing installations - users on CLI will auto-use new architecture

## Design

### Migration History (Completed Work)

The groundwork is done across these completed specs:

| Spec | Component | Status |
|------|-----------|--------|
| **184** | Unified UI Architecture (Umbrella) | ✅ Complete |
| **185** | UI Components Extraction | ✅ Complete |
| **186** | Rust HTTP Server | ✅ Complete |
| **187** | Vite SPA Migration | ✅ Complete |
| **190** | UI-Vite Parity (Umbrella) | ✅ Complete |
| **191** | Rust HTTP API Tests | ✅ Complete |
| **192** | Backend API Parity | ✅ Complete |
| **193** | Frontend UI Parity | ✅ Complete |
| **194** | API Contract Tests | ✅ Complete |
| **197-207** | UI-Vite Polish & Desktop Integration | ✅ Complete |

**Result**: Both architectures coexist, but only Vite+Rust is actively used.

### Current Package Structure

```
packages/
├── ui/                    # ⚠️ LEGACY - Next.js SSR (150MB+)
│   ├── Next.js SSR
│   ├── API routes
│   └── SSR utilities
├── ui-vite/              # ✅ PRIMARY - Vite SPA (492KB)
│   ├── Vite build
│   ├── Backend adapter (HTTP + Tauri)
│   └── All features
├── ui-components/        # ✅ SHARED - Component library
├── http-server/          # ✅ RUST - HTTP server wrapper
├── desktop/              # ✅ ACTIVE - Uses ui-vite + Tauri
└── ...
```

### Target Architecture

```
packages/
├── ui/                   # ✅ PRIMARY - Renamed from ui-vite
│   ├── Vite SPA
│   ├── Backend adapter
│   └── Production ready
├── ui-components/        # ✅ SHARED - Component library
├── http-server/          # ✅ RUST - HTTP server
├── desktop/              # ✅ ACTIVE - Uses ui + Tauri
├── ui-legacy-nextjs/     # 🗄️ ARCHIVED - For reference only
│   ├── Not published to npm
│   ├── Not built in CI
│   └── Kept for emergency rollback
└── ...
```

### Removal Strategy

**Phase 1: Archive Next.js**
```bash
git mv packages/ui packages/ui-legacy-nextjs
echo "# ARCHIVED: This is the legacy Next.js implementation" > packages/ui-legacy-nextjs/ARCHIVED.md
# Mark as private in package.json
```

**Phase 2: Promote Vite**
```bash
git mv packages/ui-vite packages/ui
# Update package name: @leanspec/ui-vite → @leanspec/ui
# Keep version continuity for npm
```

**Phase 3: Update References**
- CI/CD workflows (remove Next.js builds)
- Documentation (all UI references point to Vite)
- Root scripts (remove Next.js dev/build commands)
- CLI launcher (already using correct architecture)
- Agent instructions (remove Next.js references)

**Phase 4: Cleanup**
- Remove Next.js from pnpm-workspace
- Remove Next.js from turbo.json
- Update CONTRIBUTING.md
- Update packages/README.md architecture diagram

### What Gets Archived

**Files to move to `packages/ui-legacy-nextjs/`**:
- All Next.js configuration (next.config.js, etc.)
- SSR/SSG pages and API routes
- Server-side utilities
- Next.js-specific dependencies
- Old translation files (packages/ui/src/locales/)

**Keep as Reference**:
- Test files may have useful patterns
- Complex components might inform future work
- DB schema if we ever add persistence

**Delete Completely**:
- `.next/` build artifacts (gitignored anyway)
- `node_modules/` (gitignored anyway)

### What Stays Active

**No changes needed**:
- `@leanspec/ui-components` - Already shared, works with Vite
- `@leanspec/http-server` - Already Rust-based
- `@leanspec/desktop` - Already uses ui-vite
- `@leanspec/cli` - Already launches correct architecture
- `@leanspec/mcp` - Already uses Rust implementation

### Version Management

**Package Rename Strategy**:

Option 1: **Keep version continuity** (Recommended)
```json
// packages/ui/package.json (formerly ui-vite)
{
  "name": "@leanspec/ui",
  "version": "0.3.0", // Continue from ui-vite's version
  "description": "LeanSpec web UI launcher for visual spec management (Vite SPA)"
}
```

Option 2: **Fresh start**
```json
{
  "name": "@leanspec/ui",
  "version": "1.0.0", // New major version
  "description": "..."
}
```

**Recommendation**: Option 1 - No version jump needed since npm already knows `@leanspec/ui@0.2.x` was the Next.js version. Publishing `@leanspec/ui@0.3.0` with Vite is a minor upgrade.

### CLI Integration

**Current State**: CLI already uses correct architecture
- `lean-spec ui` command spawns HTTP server + opens browser
- No changes needed to CLI logic
- Already using `@leanspec/http-server` package

**After Rename**:
- CLI continues working exactly the same
- Internally points to `@leanspec/ui` (now Vite)
- No breaking changes for users

### Documentation Updates

**Files to Update**:

1. **Root README.md**
   - Update architecture diagram (remove Next.js)
   - Update "Technology Stack" section
   - Highlight Vite+Rust architecture

2. **CONTRIBUTING.md**
   - Remove Next.js dev setup instructions
   - Update package listing
   - Update build commands

3. **packages/README.md**
   - Update architecture diagram
   - Update package descriptions
   - Remove Next.js references

4. **AGENTS.md / CLAUDE.md**
   - Remove Next.js references
   - Update UI package paths
   - Update translation file paths (packages/ui/src/locales → no longer exists)
   - Update dev commands

5. **docs-site/** (docs.lean-spec.dev)
   - Architecture overview
   - Development setup guide
   - Contributing guide
   - API documentation

### CI/CD Updates

**GitHub Actions Workflows to Update**:

1. **.github/workflows/ci.yml**
   - Remove Next.js build steps
   - Update test commands
   - Remove Next.js-specific checks

2. **.github/workflows/publish-*.yml**
   - Update package paths
   - Remove Next.js publishing steps
   - Update version sync scripts

3. **scripts/**
   - `sync-versions.ts` - Update package references
   - `prepare-publish.ts` - Remove ui-legacy from publish list
   - `publish-main-packages.ts` - Update to use new ui path

### Risk Mitigation

**Rollback Plan**:
1. Keep `ui-legacy-nextjs` in repo (not on npm)
2. Git tag before rename: `pre-nextjs-removal`
3. Can revert if critical issue found
4. Emergency: `git mv packages/ui-legacy-nextjs packages/ui`

**Testing Strategy**:
1. Full CI/CD run after rename
2. Manual smoke test of web UI
3. Manual smoke test of desktop app
4. Verify npm publish works
5. Test installation in fresh project

### Translation File Migration

**Current State**:
- Next.js UI: `packages/ui/src/locales/en/common.json` (will be archived)
- Vite UI: `packages/ui-vite/src/locales/en/common.json` (will become primary)
- MCP: `packages/mcp/src/locales/en/common.json` (no change)

**After Rename**:
- Primary: `packages/ui/src/locales/en/common.json` (from ui-vite)
- Archived: `packages/ui-legacy-nextjs/src/locales/en/common.json`
- MCP: `packages/mcp/src/locales/en/common.json` (no change)

**AGENTS.md Update Required**:
```diff
- Update both `en/common.json` and `zh-CN/common.json` in `packages/ui/src/locales/` and `packages/mcp/src/locales/`
+ Update both `en/common.json` and `zh-CN/common.json` in `packages/ui/src/locales/` (Vite UI) and `packages/mcp/src/locales/`
```

## Plan

### Phase 1: Pre-Removal Verification (2 hours)

- [ ] **Verify Vite UI is production-ready**
  - [ ] Run full test suite: `pnpm test`
  - [ ] Build production bundle: `pnpm --filter @leanspec/ui-vite build`
  - [ ] Check bundle size (should be ~492KB, not 150MB+)
  - [ ] Verify dev server starts: `pnpm dev:web`
  - [ ] Manual smoke test: specs list, detail, stats, deps, search, filters
  
- [ ] **Verify Desktop Integration**
  - [ ] Build desktop: `pnpm build:desktop`
  - [ ] Run desktop dev: `pnpm dev:desktop`
  - [ ] Test project switching, navigation, window controls
  - [ ] Verify no errors in console
  
- [ ] **Verify CLI Integration**
  - [ ] Test `lean-spec ui` command in test project
  - [ ] Verify HTTP server starts
  - [ ] Verify browser opens to correct URL
  - [ ] Verify no Next.js processes spawned

- [ ] **Document current state**
  - [ ] Take screenshots of working Vite UI (all pages)
  - [ ] Record bundle sizes and build times
  - [ ] Note any known issues or limitations

### Phase 2: Archive Next.js Package (1 hour)

- [ ] **Create git tag for rollback**
  ```bash
  git tag -a pre-nextjs-removal -m "State before removing Next.js UI"
  git push origin pre-nextjs-removal
  ```

- [ ] **Move Next.js to archive**
  ```bash
  git mv packages/ui packages/ui-legacy-nextjs
  ```

- [ ] **Create ARCHIVED.md in legacy package**
  ```markdown
  # ARCHIVED: Next.js UI Implementation
  
  This is the legacy Next.js SSR implementation of LeanSpec web UI.
  
  **Status**: Archived on 2026-01-12
  **Replaced by**: @leanspec/ui (Vite SPA)
  **Reason**: Migrated to Vite + Rust for 99.7% smaller bundle and 10x performance
  
  ## History
  - Served LeanSpec v0.1.0 - v0.2.x
  - Replaced by Vite SPA in v0.3.0
  - Kept for reference and emergency rollback only
  
  ## Do Not Use
  - Not published to npm
  - Not maintained
  - Not tested in CI
  
  ## See Also
  - Spec 184: Unified UI Architecture
  - Spec 187: Vite SPA Migration
  - Spec 208: Next.js Complete Removal
  ```

- [ ] **Mark as private in package.json**
  ```json
  {
    "name": "@leanspec/ui-legacy-nextjs",
    "version": "0.2.12",
    "private": true,
    "description": "ARCHIVED: Legacy Next.js implementation"
  }
  ```

- [ ] **Remove from pnpm-workspace.yaml**
  ```diff
  packages:
    - 'packages/*'
  + - '!packages/ui-legacy-nextjs'
  ```

- [ ] **Remove from turbo.json**
  ```diff
  {
    "pipeline": {
  -   "@leanspec/ui#build": { ... },
  -   "@leanspec/ui#dev": { ... }
    }
  }
  ```

### Phase 3: Promote Vite to Primary UI (1 hour)

- [ ] **Rename ui-vite to ui**
  ```bash
  git mv packages/ui-vite packages/ui
  ```

- [ ] **Update package.json**
  ```diff
  {
  - "name": "@leanspec/ui-vite",
  + "name": "@leanspec/ui",
    "version": "0.3.0",
  - "description": "LeanSpec Vite SPA - Lightweight UI for spec management",
  + "description": "LeanSpec web UI launcher for visual spec management",
  - "private": true,
  + "bin": {
  +   "leanspec-ui": "./bin/ui.js"
  + }
  }
  ```

- [ ] **Create bin/ui.js launcher** (if needed)
  ```javascript
  #!/usr/bin/env node
  // Starts HTTP server and opens browser
  // (May already exist in ui-vite, verify)
  ```

- [ ] **Update imports in desktop package**
  ```diff
  // packages/desktop/package.json
  {
    "dependencies": {
  -   "@leanspec/ui-vite": "workspace:*",
  +   "@leanspec/ui": "workspace:*"
    }
  }
  ```
  
  ```diff
  // packages/desktop/src/main.tsx and other files
  - import { ... } from '@leanspec/ui-vite';
  + import { ... } from '@leanspec/ui';
  ```

- [ ] **Update turbo.json**
  ```diff
  {
    "pipeline": {
  +   "@leanspec/ui#build": {
  +     "dependsOn": ["@leanspec/ui-components#build"],
  +     "outputs": ["dist/**"]
  +   },
  +   "@leanspec/ui#dev": {
  +     "cache": false,
  +     "persistent": true
  +   }
    }
  }
  ```

### Phase 4: Update Root Configuration (1 hour)

- [ ] **Update root package.json scripts**
  ```diff
  {
    "scripts": {
  -   "dev": "turbo run dev --filter=@leanspec/ui-vite --filter=@leanspec/http-server",
  +   "dev": "turbo run dev --filter=@leanspec/ui --filter=@leanspec/http-server",
  -   "dev:web": "turbo run dev:web --filter=@leanspec/ui-vite",
  +   "dev:web": "turbo run dev --filter=@leanspec/ui"
    }
  }
  ```

- [ ] **Update pnpm-workspace.yaml overrides**
  ```diff
  packageExtensions:
    # Keep Next.js overrides for legacy package (archived)
    # But remove from active workspace
  ```

- [ ] **Verify workspace integrity**
  ```bash
  pnpm install
  pnpm -r list --depth=0  # Should show @leanspec/ui, not ui-vite
  ```

### Phase 5: Update Documentation (2 hours)

- [ ] **Update root README.md**
  - [ ] Architecture diagram: Remove Next.js, show Vite+Rust
  - [ ] Technology stack: Replace "Next.js" with "Vite"
  - [ ] Bundle size stats: Update with new numbers
  - [ ] Development setup: Remove Next.js instructions

- [ ] **Update CONTRIBUTING.md**
  - [ ] Package listing: Remove Next.js, update ui-vite → ui
  - [ ] Build commands: Update filter names
  - [ ] Dev workflow: Update package paths

- [ ] **Update packages/README.md**
  - [ ] Architecture diagram: Update package names
  - [ ] Package descriptions: Update @leanspec/ui description
  - [ ] Remove Next.js references

- [ ] **Update AGENTS.md**
  - [ ] Translation paths: Remove packages/ui/src/locales reference (was Next.js)
  - [ ] Update to `packages/ui/src/locales/` (now Vite)
  - [ ] Development commands: Update package names
  - [ ] Remove any Next.js-specific instructions

- [ ] **Update CLAUDE.md** (copy from AGENTS.md changes)

- [ ] **Update docs-site/ (if exists in monorepo)**
  - [ ] Architecture overview page
  - [ ] Development setup guide
  - [ ] API documentation
  - [ ] Contributing guide

### Phase 6: Update CI/CD (1.5 hours)

- [ ] **Update .github/workflows/ci.yml**
  ```diff
  - name: Build Next.js UI
  - run: pnpm --filter @leanspec/ui build
  
  + name: Build Vite UI
  + run: pnpm --filter @leanspec/ui build
  ```

- [ ] **Update .github/workflows/publish-*.yml**
  - [ ] Update package paths in build steps
  - [ ] Verify @leanspec/ui gets published
  - [ ] Ensure ui-legacy-nextjs does NOT get published

- [ ] **Update version sync scripts**
  ```diff
  // scripts/sync-versions.ts
  const packages = [
    'packages/cli',
    'packages/mcp',
  - 'packages/ui-vite',
  + 'packages/ui',
    'packages/desktop',
    // Do NOT include ui-legacy-nextjs
  ];
  ```

- [ ] **Update publish scripts**
  ```diff
  // scripts/publish-main-packages.ts
  const packages = [
  - '@leanspec/ui-vite',
  + '@leanspec/ui',
    // ...
  ];
  ```

- [ ] **Test CI/CD locally**
  ```bash
  pnpm build
  pnpm typecheck
  pnpm test
  pnpm lint
  ```

### Phase 7: Testing & Validation (2 hours)

- [ ] **Build all packages**
  ```bash
  pnpm clean
  pnpm install
  pnpm build
  ```

- [ ] **Run test suites**
  ```bash
  pnpm test           # All unit tests
  pnpm typecheck      # TypeScript compilation
  pnpm lint           # Linting
  pnpm lint:rust      # Rust linting
  ```

- [ ] **Test web UI manually**
  ```bash
  pnpm dev:web
  # Open http://localhost:3000
  # Test: specs list, detail, stats, deps, search, project switching, theme toggle
  ```

- [ ] **Test desktop app**
  ```bash
  pnpm dev:desktop
  # Test: same as web UI plus window controls, projects manager
  ```

- [ ] **Test CLI launcher** (in separate test project)
  ```bash
  cd /tmp/test-leanspec
  lean-spec init
  lean-spec ui
  # Verify HTTP server starts and browser opens
  ```

- [ ] **Test npm publishing (dry-run)**
  ```bash
  pnpm pre-release
  pnpm prepare-publish
  npm pack --dry-run  # For each package
  ```

- [ ] **Verify bundle sizes**
  ```bash
  du -sh packages/ui/dist/        # Should be ~1-2MB uncompressed
  gzip -9 < packages/ui/dist/assets/*.js | wc -c  # Should be ~150KB gzipped
  ```

### Phase 8: Commit & Release (1 hour)

- [ ] **Commit changes**
  ```bash
  git add -A
  git commit -m "feat: Remove Next.js UI, promote Vite+Rust as primary architecture
  
  - Archive packages/ui → packages/ui-legacy-nextjs
  - Rename packages/ui-vite → packages/ui
  - Update all references and documentation
  - Remove Next.js from CI/CD workflows
  - Update translation paths in AGENTS.md
  
  BREAKING CHANGE: @leanspec/ui is now Vite SPA (was Next.js)
  - No user-facing breakage (CLI handles new architecture)
  - Old Next.js code archived in ui-legacy-nextjs
  
  See Spec 208 for full migration details"
  ```

- [ ] **Create release PR**
  - Title: "feat: Complete migration to Vite+Rust architecture (remove Next.js)"
  - Body: Link to spec 208, list key changes, screenshots
  - Label: breaking-change, architecture, migration

- [ ] **After PR approval: Tag and release**
  ```bash
  git tag -a v0.3.0 -m "LeanSpec v0.3.0: Vite+Rust Architecture"
  git push origin main --tags
  ```

- [ ] **Publish to npm**
  ```bash
  pnpm publish-main-packages  # Publishes @leanspec/ui (Vite version)
  ```

- [ ] **Verify npm package**
  ```bash
  npm info @leanspec/ui
  # Should show v0.3.0 with Vite description
  ```

- [ ] **Update CHANGELOG.md**
  ```markdown
  ## [0.3.0] - 2026-01-12
  
  ### Breaking Changes
  - Removed Next.js UI implementation, promoted Vite SPA as primary
  - @leanspec/ui now ships Vite build (was Next.js in v0.2.x)
  - 99.7% smaller bundle (492KB vs 129MB+)
  - 10x faster with Rust HTTP backend
  
  ### Migration
  - No action required for CLI users (`lean-spec ui` works the same)
  - npm package name unchanged (@leanspec/ui)
  - Desktop app automatically uses new architecture
  
  ### Archived
  - Next.js implementation moved to ui-legacy-nextjs (not published)
  - Kept in repo for reference and emergency rollback
  
  See Spec 208 for full details.
  ```

## Test

### Pre-Removal Checklist

- [ ] Vite UI builds without errors
- [ ] Vite UI bundle size is ~492KB (not 150MB+)
- [ ] Desktop app builds and runs with ui-vite
- [ ] CLI `lean-spec ui` works with HTTP server
- [ ] All tests pass (unit, integration, e2e)
- [ ] TypeScript compilation passes
- [ ] Linting passes (JS + Rust)

### Post-Removal Checklist

- [ ] Workspace installs without errors (`pnpm install`)
- [ ] All packages build successfully (`pnpm build`)
- [ ] No broken imports or references
- [ ] Desktop package correctly imports from @leanspec/ui
- [ ] Root scripts work (dev, build, test)
- [ ] CI/CD workflows pass
- [ ] Documentation is accurate and complete
- [ ] Translation paths in AGENTS.md are correct

### Functional Testing

**Web UI** (`pnpm dev:web`):
- [ ] Specs list page renders
- [ ] Spec detail page renders markdown correctly
- [ ] Stats page shows charts
- [ ] Dependencies page shows graph
- [ ] Search works
- [ ] Filters work
- [ ] Project switching works
- [ ] Theme toggle works (light/dark)
- [ ] i18n works (en/zh-CN)
- [ ] No console errors

**Desktop App** (`pnpm dev:desktop`):
- [ ] All web UI tests pass
- [ ] Window controls work (minimize, maximize, close)
- [ ] Title bar renders correctly
- [ ] Projects manager modal opens
- [ ] Tauri commands work
- [ ] Navigation between pages works
- [ ] No console errors
- [ ] Bundle size similar to before

**CLI Launcher** (test in separate project):
- [ ] `lean-spec init` works
- [ ] `lean-spec ui` starts HTTP server
- [ ] Browser opens to correct URL
- [ ] UI loads and functions
- [ ] No Next.js processes in background
- [ ] Server stops cleanly on Ctrl+C

### Regression Testing

- [ ] No increase in bundle size
- [ ] No performance degradation
- [ ] No broken features from previous version
- [ ] All keyboard shortcuts still work
- [ ] All API endpoints still work
- [ ] Multi-project support still works
- [ ] Desktop-specific features still work

### npm Package Verification

- [ ] `npm pack` succeeds for @leanspec/ui
- [ ] Package size is reasonable (~2-3MB with node_modules)
- [ ] Package includes correct files (dist/, bin/, README, LICENSE)
- [ ] bin/ui.js is executable
- [ ] Package installs in clean project
- [ ] Installed package works (`npx @leanspec/ui`)

## Notes

### Why Now?

**Migration is complete** - Specs 184-207 finished months of work:
- Vite SPA has 100% feature parity with Next.js
- Rust HTTP server is production-tested
- Desktop fully integrated
- Bundle size proven (99.7% reduction)
- Performance proven (10x faster)

**Keeping both is costly**:
- Maintenance overhead (fix bugs twice)
- Translation duplication (two sets of i18n files)
- CI/CD complexity (build/test both)
- Developer confusion (which to use?)
- Documentation drift (two architectures to explain)

**No risk to users**:
- CLI already uses new architecture
- npm package name stays the same
- Rollback plan exists (archived code + git tag)
- Users won't notice the change

### What This Achieves

**Technical Benefits**:
- ✅ Single UI codebase (Vite SPA)
- ✅ Single backend (Rust HTTP server)
- ✅ Unified architecture (web + desktop)
- ✅ 99.7% smaller bundle
- ✅ 10x faster performance
- ✅ Simpler CI/CD

**Developer Benefits**:
- ✅ Clear primary implementation
- ✅ Less code to maintain
- ✅ Faster builds
- ✅ Simpler onboarding
- ✅ Single translation file set

**User Benefits**:
- ✅ Faster load times
- ✅ Better performance
- ✅ Consistent UX across platforms
- ✅ Smaller npm install size
- ✅ Faster updates (less code to change)

### Risks & Mitigation

**Risk 1: Unforeseen Next.js dependency**
- Mitigation: Thorough testing before removal
- Rollback: Git tag + archived code
- Timeline: Can restore in <30 minutes

**Risk 2: npm publish breaks**
- Mitigation: Dry-run testing before release
- Rollback: Previous npm version still available
- Timeline: Can republish old version if needed

**Risk 3: Desktop integration breaks**
- Mitigation: Already tested in specs 204-207
- Rollback: Revert desktop package.json imports
- Timeline: <10 minutes to fix

**Risk 4: Documentation becomes outdated**
- Mitigation: Update docs in same PR
- Rollback: Git history has old docs
- Timeline: Docs can be updated independently

**Risk 5: CLI launcher breaks**
- Mitigation: Test in fresh project before commit
- Rollback: CLI already uses new architecture (no change needed)
- Timeline: N/A - CLI shouldn't break

### Alternatives Considered

**Alternative 1: Keep both implementations**
- Pros: Zero risk, gradual transition
- Cons: Maintenance burden, confusion, bloat
- Rejected: Migration is complete, no benefit to keeping both

**Alternative 2: Delete Next.js entirely**
- Pros: Clean slate, no archive baggage
- Cons: No rollback option, lose reference code
- Rejected: Too risky without rollback plan

**Alternative 3: Publish both as separate packages**
- Pros: Users can choose
- Cons: Maintenance overhead, split ecosystem
- Rejected: No demand for Next.js version

**Selected: Archive Next.js, promote Vite**
- Pros: Clear primary, rollback available, clean architecture
- Cons: One-time migration effort
- Best balance of safety and clarity

### Post-Removal Roadmap

**Immediate (v0.3.0)**:
- ✅ Next.js removed
- ✅ Vite promoted
- ✅ Documentation updated
- ✅ npm published

**Short-term (v0.3.x)**:
- Polish Vite UI based on user feedback
- Add missing features (if any discovered)
- Performance optimizations
- Better error handling

**Mid-term (v0.4.0+)**:
- Consider removing ui-legacy-nextjs from repo entirely
- Extract more shared components
- WebSocket for live updates
- Advanced visualization features

**Long-term (v1.0.0)**:
- Stabilize API
- Production-grade performance
- Comprehensive documentation
- Enterprise features

### Related Specs

**Migration Foundation**:
- [184](../184-ui-packages-consolidation/) - Unified UI Architecture (Umbrella)
- [185](../185-ui-components-extraction/) - UI Components Extraction
- [186](../186-rust-http-server/) - Rust HTTP Server
- [187](../187-vite-spa-migration/) - Vite SPA Migration

**Feature Parity**:
- [190](../190-ui-vite-parity-rust-backend/) - UI-Vite Parity (Umbrella)
- [192](../192-backend-api-parity/) - Backend API Parity
- [193](../193-frontend-ui-parity/) - Frontend UI Parity

**Testing & Quality**:
- [191](../191-rust-http-api-test-suite/) - Rust HTTP API Tests
- [194](../194-api-contract-test-suite/) - API Contract Tests
- [195](../195-api-contract-test-failures/) - API Contract Test Failures

**Desktop Integration**:
- [204](../204-desktop-ui-vite-integration/) - Desktop UI Integration
- [205](../205-desktop-ui-vite-alignment-fixes/) - Desktop UI Alignment Fixes
- [206](../206-desktop-navigation-seamless-integration/) - Desktop Navigation
- [207](../207-ui-vite-title-subtitle-alignment/) - Title/Subtitle Alignment

**This Spec Completes**: The architectural migration started in Spec 184, officially retiring the old stack and promoting the new one as primary.