---
status: complete
created: 2025-12-18
priority: high
tags:
- rust
- ci-cd
- publishing
- distribution
- infrastructure
created_at: 2025-12-18T08:56:50.646815749Z
updated_at: 2026-01-12T08:27:52.916620313Z
---
# Align Pre-Release and Publish Workflows with Rust Distribution Model

> **Status**: 🗓️ Planned · **Created**: 2025-12-18

## Overview

LeanSpec's distribution model includes three artifact types (NPM packages, desktop executables, and Rust binaries), but the current pre-release script and GitHub workflows are not fully aligned with this architecture. While Rust binaries are being built, there are critical inconsistencies:

1. **Pre-release script doesn't validate Rust binaries** - missing `pnpm rust:build` step
2. **Directory structure mismatches** - binaries scattered across multiple locations
3. **Platform packages not properly integrated** - workflows build inline instead of using platform packages
4. **Desktop app builds isolated** - not included in release workflows
5. **Binary resolution logic incomplete** - wrapper scripts use different paths

This creates risk of publishing broken packages and makes the release process error-prone.

## Current State Analysis

### Pre-Release Script

**Current**: `package.json`
```json
"pre-release": "pnpm sync-versions && pnpm typecheck && pnpm test:run && pnpm build && node bin/lean-spec.js validate --warnings-only"
```

**Issues**:
- ❌ No Rust build validation
- ❌ Can pass pre-release even with missing Rust binaries
- ❌ `validate` command might run TypeScript version instead of Rust binary

### Directory Structure

**Current state** (3 different locations):

```
packages/cli/
  bin/lean-spec.js              # Points to dist/cli.js (TypeScript)
  binaries/
    darwin-arm64/
      package.json               # lean-spec-darwin-arm64
      lean-spec                  # Rust binary (copied here)
    darwin-x64/
    linux-x64/
    linux-arm64/
    windows-x64/

rust/
  npm-dist/
    binary-wrapper.js            # Wrapper template (not used)
    mcp-wrapper.js
    package.json.example         # Has optionalDependencies pattern
  target/release/
    lean-spec                    # Source of truth

packages/mcp/
  bin/leanspec-mcp.js            # Spawns `lean-spec mcp`
  binaries/
    darwin-arm64/
      package.json               # leanspec-mcp-darwin-arm64
      leanspec-mcp               # Rust binary
```

**Problem**: `rust/npm-dist/` contains templates but workflows write to `packages/*/binaries/`. Inconsistent.

### Binary Resolution

**CLI** (`packages/cli/bin/lean-spec.js`):
```javascript
import '../dist/cli.js';  // Still using TypeScript!
```

**MCP** (`packages/mcp/bin/leanspec-mcp.js`):
```javascript
spawn('lean-spec', ['mcp'], { stdio: 'inherit' });  // Delegates to CLI
```

**Intended wrapper** (`rust/npm-dist/binary-wrapper.js`):
```javascript
// Tries platform package first: @leanspec/${platform}-${arch}
// Falls back to local binaries/
// But this isn't being used!
```

### Workflow Analysis

**`publish.yml`** (production releases):
```yaml
- name: Build Rust binaries
  working-directory: rust
  run: cargo build --release

- name: Copy Rust binaries
  run: node scripts/copy-rust-binaries.mjs

- name: Publish CLI to npm
  working-directory: packages/cli
  run: npm publish
```

**Issues**:
- Builds Rust binaries inline (matrix) and uses the produced artifacts
- Publishes main package immediately (should publish platform packages first)
- No desktop app builds

**`rust-binaries.yml`** (removed; superseded by inline Rust builds in `publish.yml`):
- Builds all platforms via matrix
- Uploads artifacts
- Has conditional publish step
- **Not integrated with main release flow**

## Plan

### Phase 1: Fix Pre-Release Script

- [x] Update `package.json` pre-release script
- [x] Add Rust build validation
- [x] Ensure binary exists before validation
- [ ] Test locally

**Implementation**:

```json
// package.json
{
  "scripts": {
    "pre-release": "pnpm sync-versions && pnpm rust:build && pnpm typecheck && pnpm test:run && pnpm build && node bin/lean-spec.js validate --warnings-only",
    "pre-release:skip-rust": "pnpm sync-versions && pnpm typecheck && pnpm test:run && pnpm build && node bin/lean-spec.js validate --warnings-only"
  }
}
```

**Validation**:
```bash
# Should succeed with Rust binary
pnpm pre-release

# Check binary exists
ls -lh packages/cli/binaries/$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')

# Verify validate uses Rust binary
which lean-spec  # Should show local path
lean-spec validate --warnings-only
```

### Phase 2: Consolidate Binary Paths

- [ ] Decide on canonical location: `packages/*/binaries/{platform}/`
- [ ] Remove or repurpose `rust/npm-dist/`
- [ ] Update all scripts to use consistent paths
- [ ] Update `.gitignore` patterns

**Decision**: Keep `packages/*/binaries/` as canonical location

**Actions**:

1. **Remove `rust/npm-dist/`** (keep templates in docs):
   ```bash
   rm -rf rust/npm-dist/
   ```

2. **Update `.gitignore`**:
   ```gitignore
   # In packages/cli/binaries/ and packages/mcp/binaries/
   # Don't ignore package.json, but ignore binaries
   */lean-spec
   */lean-spec.exe
   */leanspec-mcp
   */leanspec-mcp.exe
   ```

3. **Keep `copy-rust-binaries.mjs` as-is** (already correct)

### Phase 3: Fix Binary Resolution

- [ ] Replace TypeScript entry point with Rust wrapper
- [ ] Update `packages/cli/bin/lean-spec.js` to spawn Rust binary
- [ ] Update `packages/mcp/bin/leanspec-mcp.js` to spawn Rust binary directly
- [ ] Add platform detection and error messages
- [ ] Test on all platforms

**Implementation**:

**`packages/cli/bin/lean-spec.js`** (new):
```javascript
#!/usr/bin/env node
import { spawn } from 'child_process';
import { platform, arch } from 'os';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Map Node.js platform/arch to our naming convention
const PLATFORM_MAP = {
  darwin: { x64: 'darwin-x64', arm64: 'darwin-arm64' },
  linux: { x64: 'linux-x64', arm64: 'linux-arm64' },
  win32: { x64: 'windows-x64', arm64: 'windows-arm64' }
};

function getPlatformKey() {
  const os = platform();
  const cpu = arch();
  return PLATFORM_MAP[os]?.[cpu];
}

function findBinary() {
  const platformKey = getPlatformKey();
  if (!platformKey) {
    throw new Error(`Unsupported platform: ${platform()}-${arch()}`);
  }

  const isWindows = platform() === 'win32';
  const binaryName = isWindows ? 'lean-spec.exe' : 'lean-spec';

  // Try local binaries first (for development)
  const localBinary = join(__dirname, '..', 'binaries', platformKey, binaryName);
  if (existsSync(localBinary)) {
    return localBinary;
  }

  // Try platform package (for published npm packages)
  try {
    const pkgName = `lean-spec-${platformKey}`;
    const { resolve } = await import(`${pkgName}/package.json`);
    return join(dirname(resolve), binaryName);
  } catch {
    // Not found
  }

  throw new Error(
    `LeanSpec binary not found for ${platform()}-${arch()}.\n` +
    `Expected at: ${localBinary}\n\n` +
    `If you installed via npm, try reinstalling:\n` +
    `  npm install -g lean-spec\n\n` +
    `Or install the platform-specific package:\n` +
    `  npm install lean-spec-${platformKey}`
  );
}

try {
  const binaryPath = findBinary();
  const child = spawn(binaryPath, process.argv.slice(2), {
    stdio: 'inherit',
    env: process.env
  });

  child.on('error', (err) => {
    console.error(`Failed to start LeanSpec: ${err.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
```

**`packages/mcp/bin/leanspec-mcp.js`** (new):
```javascript
#!/usr/bin/env node
import { spawn } from 'child_process';
import { platform, arch } from 'os';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getPlatformKey() {
  const PLATFORM_MAP = {
    darwin: { x64: 'darwin-x64', arm64: 'darwin-arm64' },
    linux: { x64: 'linux-x64', arm64: 'linux-arm64' },
    win32: { x64: 'windows-x64', arm64: 'windows-arm64' }
  };
  return PLATFORM_MAP[platform()]?.[arch()];
}

function findBinary() {
  const platformKey = getPlatformKey();
  if (!platformKey) {
    throw new Error(`Unsupported platform: ${platform()}-${arch()}`);
  }

  const isWindows = platform() === 'win32';
  const binaryName = isWindows ? 'leanspec-mcp.exe' : 'leanspec-mcp';
  const localBinary = join(__dirname, '..', 'binaries', platformKey, binaryName);

  if (existsSync(localBinary)) {
    return localBinary;
  }

  throw new Error(
    `LeanSpec MCP binary not found for ${platform()}-${arch()}.\n` +
    `Expected at: ${localBinary}\n\n` +
    `Try reinstalling: npm install @leanspec/mcp`
  );
}

try {
  const binaryPath = findBinary();
  const child = spawn(binaryPath, process.argv.slice(2), {
    stdio: 'inherit',
    env: process.env
  });

  child.on('error', (err) => {
    console.error(`Failed to start LeanSpec MCP: ${err.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
```

### Phase 4: Platform Package Publishing

- [ ] Ensure platform package `package.json` files are correct
- [ ] Add platform packages to main package `optionalDependencies`
- [ ] Update `publish-platform-packages.ts` script
- [ ] Test publishing to npm dev tag

**Platform Package Structure**:

Each `packages/{cli,mcp}/binaries/{platform}/package.json`:

```json
{
  "name": "lean-spec-darwin-arm64",
  "version": "0.2.10",
  "description": "LeanSpec CLI binary for macOS ARM64",
  "os": ["darwin"],
  "cpu": ["arm64"],
  "main": "lean-spec",
  "files": ["lean-spec"],
  "repository": {
    "type": "git",
    "url": "https://github.com/codervisor/lean-spec.git"
  },
  "license": "MIT"
}
```

**Main Package `optionalDependencies`**:

```json
// packages/cli/package.json
{
  "optionalDependencies": {
    "lean-spec-darwin-x64": "0.2.10",
    "lean-spec-darwin-arm64": "0.2.10",
    "lean-spec-linux-x64": "0.2.10",
    "lean-spec-linux-arm64": "0.2.10",
    "lean-spec-windows-x64": "0.2.10"
  }
}
```

**Script Enhancement** (`scripts/publish-platform-packages.ts`):

- Already looks in correct location
- Just needs version sync validation
- Should fail if binary missing

### Phase 5: Refactor Publish Workflows

- [x] Support dev publishing via `publish.yml` with `dev=true`
- [x] `publish.yml` builds Rust binaries inline
- [ ] Add desktop build integration
- [ ] Test in CI

**`publish.yml` (workflow_dispatch with `dev=true`)** (simplified for speed):

```yaml
name: Publish Dev Version

on:
  workflow_dispatch:
    inputs:
      dry_run:
        type: boolean
        default: false

jobs:
  publish-dev:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Auto-bump dev version
        run: |
          TIMESTAMP=$(date +%Y%m%d%H%M%S)
          CURRENT=$(node -p "require('./package.json').version")
          BASE=$(echo $CURRENT | sed 's/-dev\..*//')
          DEV_VERSION="${BASE}-dev.${TIMESTAMP}"
          
          # Update root package.json
          node -e "const fs=require('fs'),pkg=require('./package.json');pkg.version='$DEV_VERSION';fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');"
          pnpm sync-versions
          echo "DEV_VERSION=$DEV_VERSION" >> $GITHUB_ENV
      
      # Build Rust for current platform only (faster)
      - name: Build Rust binaries (linux-x64 only)
        working-directory: rust
        run: cargo build --release
      
      - name: Copy Rust binaries
        run: node scripts/copy-rust-binaries.mjs
      
      - name: Build TypeScript packages
        run: pnpm build
      
      - name: Validate
        run: node bin/lean-spec.js validate --warnings-only
      
      - name: Publish platform package (linux-x64 only)
        if: ${{ !inputs.dry_run }}
        working-directory: packages/cli/binaries/linux-x64
        run: npm publish --tag dev --access public || echo "Already published, skipping..."
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Publish CLI
        if: ${{ !inputs.dry_run }}
        working-directory: packages/cli
        run: npm publish --tag dev --access public || echo "Already published, skipping..."
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Publish MCP
        if: ${{ !inputs.dry_run }}
        working-directory: packages/mcp
        run: npm publish --tag dev --access public || echo "Already published, skipping..."
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Publish UI
        if: ${{ !inputs.dry_run }}
        working-directory: packages/ui
        run: npm publish --tag dev --access public || echo "Already published, skipping..."
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**`publish.yml`** (production - full cross-platform):

**Note (current repo state):** `publish.yml` builds Rust binaries inline; it does not call a separate `rust-binaries.yml` reusable workflow.

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  # Step 1: Build Rust binaries for all platforms
  rust-binaries:
    # (inline Rust build matrix)
  
  # Step 2: Publish platform packages
  publish-platform:
    needs: rust-binaries
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Download all platform binaries
        uses: actions/download-artifact@v4
        with:
          path: artifacts/
      
      - name: Copy binaries to packages
        run: |
          for platform in darwin-x64 darwin-arm64 linux-x64 linux-arm64 windows-x64; do
            # CLI
            mkdir -p packages/cli/binaries/$platform
            cp artifacts/binaries-$platform/lean-spec* packages/cli/binaries/$platform/
            
            # MCP
            mkdir -p packages/mcp/binaries/$platform
            cp artifacts/binaries-$platform/leanspec-mcp* packages/mcp/binaries/$platform/
          done
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Sync versions
        run: pnpm sync-versions
      
      - name: Publish CLI platform packages
        run: pnpm publish:platforms --filter='*cli*'
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Publish MCP platform packages
        run: pnpm publish:platforms --filter='*mcp*'
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  
  # Step 3: Publish main packages
  publish-main:
    needs: publish-platform
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: pnpm build
      
      - name: Publish main packages
        run: pnpm publish:main
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  
  # Step 4: Build desktop apps
  desktop:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install Linux dependencies
        if: matrix.os == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libayatana-appindicator3-dev \
            libsoup-3.0-dev libjavascriptcoregtk-4.1-dev webkit2gtk-4.1-dev
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build Rust binaries
        run: pnpm rust:build
      
      - name: Build desktop app
        run: pnpm build:desktop
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: desktop-${{ matrix.os }}
          path: packages/desktop/src-tauri/target/release/bundle/
  
  # Step 5: Create GitHub release with all artifacts
  github-release:
    needs: [publish-main, desktop]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Download desktop artifacts
        uses: actions/download-artifact@v4
        with:
          path: release-artifacts/
      
      - name: Organize release artifacts
        run: |
          mkdir -p final-artifacts
          
          # macOS
          find release-artifacts/desktop-macos-latest -name "*.dmg" \
            -exec cp {} final-artifacts/ \;
          
          # Linux
          find release-artifacts/desktop-ubuntu-latest -name "*.deb" \
            -exec cp {} final-artifacts/ \;
          
          # Windows
          find release-artifacts/desktop-windows-latest -name "*.exe" \
            -exec cp {} final-artifacts/ \;
          
          ls -lh final-artifacts/
      
      - name: Update release with desktop artifacts
        uses: softprops/action-gh-release@v1
        with:
          files: final-artifacts/*
          tag_name: ${{ github.ref_name }}
```

### Phase 6: Desktop App Integration

- [ ] Verify desktop build in CI
- [ ] Test installers on each platform
- [ ] Add to GitHub release assets
- [ ] Update documentation

**Platforms**:
- macOS: `.dmg` (Intel + Apple Silicon universal binary via lipo)
- Linux: `.deb` (x64 + arm64)
- Windows: `.exe` NSIS installer (x64)

## Testing Strategy

### Local Testing

**Pre-release validation**:
```bash
# Clean build
pnpm rust:clean
rm -rf packages/*/binaries/*/lean-spec*

# Run pre-release
pnpm pre-release

# Verify binaries exist
find packages -name "lean-spec*" -type f -executable

# Test CLI
./packages/cli/binaries/$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')/lean-spec --version

# Test MCP
./packages/mcp/binaries/$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')/leanspec-mcp --version
```

**Wrapper testing**:
```bash
# Test CLI wrapper
cd packages/cli
node bin/lean-spec.js list

# Test MCP wrapper
cd packages/mcp
node bin/leanspec-mcp.js --help
```

**Platform package testing**:
```bash
# Simulate npm install
cd /tmp
mkdir test-install && cd test-install
npm init -y

# Link local packages
npm link ../../lean-spec/packages/cli
npm link ../../lean-spec/packages/cli/binaries/darwin-arm64

# Test execution
npx lean-spec list
```

### CI Testing

**Dev workflow test**:
```bash
# Trigger manually
gh workflow run publish.yml --field dev=true --field dry_run=true

# Check logs
gh run list --workflow=publish.yml
gh run view <run-id> --log
```

**Production workflow test**:
```bash
# Create test tag
git tag v0.2.11-test
git push origin v0.2.11-test

# Check rust-binaries workflow
gh run list --workflow=publish.yml

# Check publish workflow (should wait for binaries)
gh run list --workflow=publish.yml
```

### Cross-Platform Validation

**After publishing**:

```bash
# macOS Intel
docker run --platform linux/amd64 -it node:20 bash
npm install -g lean-spec@dev
lean-spec --version
lean-spec list

# macOS ARM
# (Test on actual M1/M2 Mac)
npm install -g lean-spec@dev
lean-spec --version

# Linux x64
docker run --platform linux/amd64 -it node:20 bash
npm install -g lean-spec@dev
lean-spec --version

# Linux ARM64
docker run --platform linux/arm64 -it node:20 bash
npm install -g lean-spec@dev
lean-spec --version

# Windows (via WSL or Windows machine)
npm install -g lean-spec@dev
lean-spec.cmd --version
```

## Risk Analysis

### High Risk

1. **Breaking change for existing users**
   - **Impact**: Users on TypeScript version will suddenly get Rust version
   - **Mitigation**: 
     - Major version bump (v0.3.0)
     - Clear migration guide
     - Keep TypeScript fallback for one version
     - Test in dev tag first

2. **Platform package installation failures**
   - **Impact**: `npm install` fails on unsupported platforms
   - **Mitigation**:
     - Use `optionalDependencies` (already doing this)
     - Clear error messages with fallback instructions
     - Test on all platforms before release

3. **Binary size increase in npm**
   - **Impact**: Larger package sizes (Rust binaries ~5-15MB each)
   - **Mitigation**:
     - Use optional dependencies (only download current platform)
     - Strip binaries: `cargo build --release` already does this
     - Consider upx compression

### Medium Risk

1. **CI/CD workflow orchestration complexity**
   - **Impact**: Workflows depend on each other, harder to debug
   - **Mitigation**:
     - Keep dev workflow simple (inline build)
     - Add workflow visualization
     - Comprehensive logging

2. **Desktop app build failures**
   - **Impact**: Release blocked by desktop build issues
   - **Mitigation**:
     - Make desktop builds optional (separate workflow)
     - Can publish npm packages first
     - Add to releases later if needed

3. **Version drift between platform packages**
   - **Impact**: Main package v0.2.10 but platform package v0.2.9
   - **Mitigation**:
     - `sync-versions` script updates all packages
     - CI validation check
     - Fail fast if versions mismatch

### Low Risk

1. **Documentation outdated**
   - **Impact**: Users confused by new installation process
   - **Mitigation**:
     - Update docs in same PR
     - Add troubleshooting section
     - Migration guide

## Timeline & Effort

**Total Estimate**: 2-3 days

| Phase                  | Effort  | Dependencies |
| ---------------------- | ------- | ------------ |
| 1. Pre-release script  | 1 hour  | None         |
| 2. Consolidate paths   | 2 hours | Phase 1      |
| 3. Binary resolution   | 4 hours | Phase 2      |
| 4. Platform packages   | 3 hours | Phase 3      |
| 5. Workflow refactor   | 6 hours | Phase 4      |
| 6. Desktop integration | 4 hours | Phase 5      |
| Testing                | 4 hours | All phases   |
| Documentation          | 2 hours | All phases   |

**Critical Path**: Phase 1 → 2 → 3 → 4 → 5

**Can parallelize**: Phase 6 (desktop) independent

## Success Criteria

### Must Have

- [x] Pre-release script includes Rust build
- [ ] Single source of truth for binary locations
- [ ] Wrapper scripts spawn Rust binaries
- [ ] Platform packages published before main packages
- [ ] All workflows use consistent binary paths
- [ ] CI passes on all platforms

### Should Have

- [ ] Desktop app builds in CI
- [ ] GitHub release includes all artifacts
- [ ] Clear error messages for unsupported platforms
- [ ] Migration guide for existing users
- [ ] Comprehensive test coverage

### Nice to Have

- [ ] Binary size optimization (upx)
- [ ] Checksum verification in wrappers
- [ ] Auto-update mechanism for binaries
- [ ] Performance benchmarks (Rust vs TypeScript)

## Open Questions

1. **Should we publish desktop apps to npm** (e.g., `@leanspec/desktop-darwin-arm64`)?
   - **Recommendation**: No, use GitHub Releases only
   - **Rationale**: Desktop apps are large (50-100MB), npm not ideal for this
   - **Alternative**: Auto-update via Tauri's built-in updater

2. **Should dev releases skip platform packages** (faster iteration)?
   - **Current**: Build inline, no platform packages
   - **Recommendation**: Keep current approach for dev, full flow for production
   - **Rationale**: Dev speed > consistency for rapid iteration

3. **Should we keep backward compatibility with TypeScript version**?
   - **Recommendation**: Add `--use-typescript` flag for one version (v0.3.x)
   - **Rationale**: Give users time to migrate, report bugs
   - **Implementation**: Check env var `LEANSPEC_USE_TS=1`

4. **How to handle platforms we don't support yet** (e.g., Windows ARM)?
   - **Recommendation**: Clear error message + fallback to TypeScript
   - **Future**: Add cross-compilation targets as needed

## Implementation Notes (2025-12-22)

- Auto-generate platform package manifests for CLI, MCP, and HTTP binaries when syncing versions or copying artifacts, creating missing package.json files with correct metadata in [scripts/sync-rust-versions.ts](../../scripts/sync-rust-versions.ts) and [scripts/copy-rust-binaries.mjs](../../scripts/copy-rust-binaries.mjs).

## Documentation Updates

- [ ] Update [AGENTS.md](../../AGENTS.md) with new pre-release requirements
- [ ] Add "Publishing" section to [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [ ] Create [docs/architecture/distribution.md](../../docs/architecture/distribution.md)
- [ ] Update [docs/agents/PUBLISHING.md](../../docs/agents/PUBLISHING.md)
- [ ] Add troubleshooting section for binary resolution errors
- [ ] Create migration guide for v0.2.x → v0.3.x

## References

- Current workflow files:
  - [.github/workflows/publish.yml](../../.github/workflows/publish.yml)
  - [.github/workflows/publish.yml](../../.github/workflows/publish.yml)
  - [.github/workflows/desktop-build.yml](../../.github/workflows/desktop-build.yml)
- Scripts:
  - [scripts/copy-rust-binaries.mjs](../../scripts/copy-rust-binaries.mjs)
  - [scripts/publish-platform-packages.ts](../../scripts/publish-platform-packages.ts)
- Related specs:
  - [172-rust-cli-mcp-npm-distribution](../172-rust-cli-mcp-npm-distribution/README.md)
  - [173-rust-binaries-ci-cd-pipeline](../173-rust-binaries-ci-cd-pipeline/README.md)
