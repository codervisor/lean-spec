---
status: planned
created: '2025-12-18'
tags:
  - ci-cd
  - rust
  - github-actions
  - cross-compilation
  - automation
  - cli
  - mcp
priority: high
created_at: '2025-12-18T02:31:12.261Z'
depends_on:
  - 170-cli-mcp-core-rust-migration-evaluation
  - 172-rust-cli-mcp-npm-distribution
updated_at: '2025-12-18T02:31:20.918Z'
---

# Rust Binaries CI/CD Cross-Platform Build Pipeline

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-12-18 · **Tags**: ci-cd, rust, github-actions, cross-compilation, automation, cli, mcp

## Overview

### Problem Statement

Rust binaries must be built for multiple platforms to support cross-platform distribution (spec 172). Building locally is:
- **Time-consuming**: 5-10 minutes per platform
- **Platform-dependent**: Can't build macOS binaries on Linux
- **Inconsistent**: Different toolchains, Rust versions, system libraries
- **Manual**: Error-prone, requires developer intervention

**Solution:** GitHub Actions CI/CD pipeline with cross-compilation

### Requirements

**Target Platforms** (6 total):
- macOS Intel (x86_64-apple-darwin)
- macOS Apple Silicon (aarch64-apple-darwin)
- Linux x64 (x86_64-unknown-linux-gnu)
- Linux ARM64 (aarch64-unknown-linux-gnu)
- Windows x64 (x86_64-pc-windows-msvc)
- (Future: Windows ARM64 - aarch64-pc-windows-msvc)

**Binaries to Build:**
- `leanspec-cli` - Command-line tool
- `leanspec-mcp` - MCP server

**Success Criteria:**
- ✅ Automated: Triggers on git tags or manual dispatch
- ✅ Fast: <20 minutes for all platforms (parallel builds)
- ✅ Reliable: Deterministic builds, caching works
- ✅ Verified: Checksums generated, binaries tested
- ✅ Published: Automatic npm publishing (optional, secure)

## Design

### Workflow Architecture

**High-Level Flow:**
```
┌──────────────────────────────────────────────────────────┐
│              Trigger (git tag or manual)                  │
└───────────────────┬──────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │  Matrix Build (6x)    │ ← Parallel execution
        │  (macOS, Linux, Win)  │
        └───────────┬───────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼───┐       ┌───▼───┐      ┌───▼───┐
│ macOS │       │ Linux │      │  Win  │
│ x64   │       │ x64   │      │  x64  │
│ arm64 │       │ arm64 │      │       │
└───┬───┘       └───┬───┘      └───┬───┘
    │               │               │
    │   ┌───────────┴──────┐        │
    │   │ Upload Artifacts │        │
    │   └───────────┬──────┘        │
    └───────────────┼───────────────┘
                    │
        ┌───────────▼───────────┐
        │  Publish to npm       │ ← Optional, secure
        │  (platform packages)  │
        └───────────────────────┘
```

### GitHub Actions Workflow

**File:** `.github/workflows/rust-binaries.yml`

```yaml
name: Build Rust Binaries

on:
  # Trigger on version tags
  push:
    tags:
      - 'v*.*.*'
  
  # Manual trigger for testing
  workflow_dispatch:
    inputs:
      publish:
        description: 'Publish to npm after building'
        required: false
        type: boolean
        default: false

jobs:
  build:
    name: Build ${{ matrix.target }}
    runs-on: ${{ matrix.os }}
    
    strategy:
      fail-fast: false  # Continue other builds if one fails
      matrix:
        include:
          # macOS Intel
          - os: macos-latest
            target: x86_64-apple-darwin
            platform: darwin-x64
            
          # macOS Apple Silicon
          - os: macos-latest
            target: aarch64-apple-darwin
            platform: darwin-arm64
            
          # Linux x64
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            platform: linux-x64
            
          # Linux ARM64 (cross-compile)
          - os: ubuntu-latest
            target: aarch64-unknown-linux-gnu
            platform: linux-arm64
            
          # Windows x64
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            platform: windows-x64

    steps:
      - uses: actions/checkout@v4
      
      # Setup Rust toolchain
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: ${{ matrix.target }}
          override: true
          profile: minimal
      
      # Cache Rust dependencies
      - name: Cache cargo registry
        uses: actions/cache@v4
        with:
          path: ~/.cargo/registry
          key: ${{ runner.os }}-cargo-registry-${{ hashFiles('**/Cargo.lock') }}
      
      - name: Cache cargo index
        uses: actions/cache@v4
        with:
          path: ~/.cargo/git
          key: ${{ runner.os }}-cargo-index-${{ hashFiles('**/Cargo.lock') }}
      
      - name: Cache cargo build
        uses: actions/cache@v4
        with:
          path: rust/target
          key: ${{ runner.os }}-${{ matrix.target }}-cargo-build-${{ hashFiles('**/Cargo.lock') }}
      
      # Linux ARM64: Install cross-compilation tools
      - name: Install cross-compilation tools (Linux ARM64)
        if: matrix.target == 'aarch64-unknown-linux-gnu'
        run: |
          sudo apt-get update
          sudo apt-get install -y gcc-aarch64-linux-gnu
      
      # Build binaries
      - name: Build CLI binary
        working-directory: rust/leanspec-cli
        run: cargo build --release --target ${{ matrix.target }}
      
      - name: Build MCP binary
        working-directory: rust/leanspec-mcp
        run: cargo build --release --target ${{ matrix.target }}
      
      # Prepare artifacts
      - name: Prepare artifacts
        shell: bash
        run: |
          mkdir -p dist/${{ matrix.platform }}
          
          # Copy CLI binary
          if [ "${{ runner.os }}" = "Windows" ]; then
            cp rust/target/${{ matrix.target }}/release/lean-spec.exe dist/${{ matrix.platform }}/
          else
            cp rust/target/${{ matrix.target }}/release/lean-spec dist/${{ matrix.platform }}/
          fi
          
          # Copy MCP binary
          if [ "${{ runner.os }}" = "Windows" ]; then
            cp rust/target/${{ matrix.target }}/release/leanspec-mcp.exe dist/${{ matrix.platform }}/
          else
            cp rust/target/${{ matrix.target }}/release/leanspec-mcp dist/${{ matrix.platform }}/
          fi
          
          # Generate checksums
          cd dist/${{ matrix.platform }}
          if [ "${{ runner.os }}" = "Windows" ]; then
            certutil -hashfile lean-spec.exe SHA256 > lean-spec.exe.sha256
            certutil -hashfile leanspec-mcp.exe SHA256 > leanspec-mcp.exe.sha256
          else
            shasum -a 256 lean-spec > lean-spec.sha256
            shasum -a 256 leanspec-mcp > leanspec-mcp.sha256
          fi
      
      # Upload artifacts
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: binaries-${{ matrix.platform }}
          path: dist/${{ matrix.platform }}
          retention-days: 30
  
  # Publish to npm (optional, requires secrets)
  publish:
    name: Publish to npm
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v') || inputs.publish
    
    steps:
      - uses: actions/checkout@v4
      
      # Download all artifacts
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          path: dist
      
      # Setup Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      # Setup pnpm
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      # Install dependencies
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      # Copy binaries to platform packages
      - name: Prepare platform packages
        run: |
          # CLI packages
          for platform in darwin-x64 darwin-arm64 linux-x64 linux-arm64 windows-x64; do
            mkdir -p packages/cli/binaries/$platform
            cp -r dist/binaries-$platform/* packages/cli/binaries/$platform/
          done
          
          # MCP packages
          for platform in darwin-x64 darwin-arm64 linux-x64 linux-arm64 windows-x64; do
            mkdir -p packages/mcp/binaries/$platform
            cp -r dist/binaries-$platform/* packages/mcp/binaries/$platform/
          done
      
      # Publish platform packages
      - name: Publish platform packages
        run: |
          pnpm publish:platforms
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      # Publish main packages
      - name: Publish main packages
        run: |
          pnpm publish:main
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Caching Strategy

**Three-tier caching:**

1. **Cargo Registry** (~500MB):
   - All downloaded crate source code
   - Rarely changes (only on dependency updates)
   - Key: `${{ runner.os }}-cargo-registry-${{ hashFiles('Cargo.lock') }}`

2. **Cargo Index** (~100MB):
   - crates.io index (metadata)
   - Changes frequently, but small
   - Key: `${{ runner.os }}-cargo-index-${{ hashFiles('Cargo.lock') }}`

3. **Build Artifacts** (~1-2GB):
   - Compiled dependencies and incremental builds
   - Platform-specific
   - Key: `${{ runner.os }}-${{ target }}-cargo-build-${{ hashFiles('Cargo.lock') }}`

**Expected Performance:**
- First build: ~15-20 minutes (cold cache)
- Cached build: ~5-7 minutes (warm cache)
- **Savings: ~70% faster**

### Cross-Compilation Setup

**Linux ARM64** (runs on x64 runner):
```yaml
- name: Install cross-compilation tools
  if: matrix.target == 'aarch64-unknown-linux-gnu'
  run: |
    sudo apt-get update
    sudo apt-get install -y gcc-aarch64-linux-gnu
    
- name: Configure linker
  if: matrix.target == 'aarch64-unknown-linux-gnu'
  run: |
    echo "[target.aarch64-unknown-linux-gnu]" >> ~/.cargo/config.toml
    echo "linker = \"aarch64-linux-gnu-gcc\"" >> ~/.cargo/config.toml
```

**macOS ARM64** (runs on x64 runner):
- GitHub Actions `macos-latest` supports universal builds
- No additional setup needed, Rust handles it

**Windows ARM64** (future):
- Requires Windows ARM64 runner (not yet available)
- Alternative: Cross-compile from x64 (experimental)

### Artifact Organization

**Upload Structure:**
```
artifacts/
├── binaries-darwin-x64/
│   ├── lean-spec
│   ├── lean-spec.sha256
│   ├── leanspec-mcp
│   └── leanspec-mcp.sha256
├── binaries-darwin-arm64/
│   └── (same structure)
├── binaries-linux-x64/
│   └── (same structure)
├── binaries-linux-arm64/
│   └── (same structure)
└── binaries-windows-x64/
    ├── lean-spec.exe
    ├── lean-spec.exe.sha256
    ├── leanspec-mcp.exe
    └── leanspec-mcp.exe.sha256
```

**Retention:**
- Manual builds: 30 days
- Release builds: 90 days (GitHub Actions limit)
- Published packages: Permanent (npm registry)

### Security Considerations

**npm Token:**
- Store `NPM_TOKEN` in GitHub Secrets
- Scope: Organization-level or repository-level
- Permissions: Publish-only (not full access)

**Artifact Integrity:**
- Generate SHA256 checksums for all binaries
- Store checksums alongside binaries
- Users can verify downloads: `sha256sum -c lean-spec.sha256`

**Supply Chain:**
- Builds run on GitHub-hosted runners (trusted)
- Rust toolchain from official sources
- Dependencies locked with `Cargo.lock`
- Reproducible builds (same input = same output)

## Plan

### Phase 1: Workflow Setup
- [ ] Create `.github/workflows/rust-binaries.yml`
- [ ] Define build matrix for 6 platforms
- [ ] Set up Rust toolchain installation
- [ ] Configure workflow triggers (tags, manual dispatch)
- [ ] Add fail-fast: false for independent builds

### Phase 2: Caching Implementation
- [ ] Add cargo registry cache
- [ ] Add cargo index cache
- [ ] Add build artifacts cache
- [ ] Test cache hit rate
- [ ] Measure build time improvement (target: 70% faster)

### Phase 3: Cross-Compilation
- [ ] Set up Linux ARM64 cross-compilation
  - [ ] Install gcc-aarch64-linux-gnu
  - [ ] Configure Cargo linker
  - [ ] Test binary on ARM64 device
- [ ] Verify macOS ARM64 universal builds
- [ ] Test Windows builds on Windows runner

### Phase 4: Artifact Management
- [ ] Create artifact preparation script
- [ ] Copy binaries to dist/ directory
- [ ] Generate SHA256 checksums
- [ ] Upload artifacts with `actions/upload-artifact@v4`
- [ ] Set retention policy (30 days manual, 90 days release)
- [ ] Test artifact download from Actions UI

### Phase 5: npm Publishing (Optional)
- [ ] Create `NPM_TOKEN` secret in GitHub
- [ ] Add publish job (depends on build job)
- [ ] Download all artifacts in publish job
- [ ] Copy binaries to platform package directories
- [ ] Create `pnpm publish:platforms` script
- [ ] Create `pnpm publish:main` script
- [ ] Test publish workflow (dry-run first)

### Phase 6: Testing & Validation
- [ ] Trigger workflow on test tag (`v0.3.0-test`)
- [ ] Verify all 6 platforms build successfully
- [ ] Download artifacts and test binaries locally
- [ ] Verify checksums match
- [ ] Test npm install from published packages (if publishing)
- [ ] Measure build times (cold and warm cache)

### Phase 7: Documentation
- [ ] Document workflow in `docs/ci-cd.md`
- [ ] Add troubleshooting guide for build failures
- [ ] Document how to trigger manual builds
- [ ] Document npm publishing process
- [ ] Add workflow status badge to README

## Test

### Workflow Validation
- [ ] YAML syntax is valid (use `actionlint`)
- [ ] All matrix combinations are defined
- [ ] Triggers work (tag push, manual dispatch)
- [ ] Secrets are configured correctly
- [ ] Permissions are minimal (principle of least privilege)

### Build Quality
- [ ] All 6 platforms build successfully
- [ ] Binaries are executable on target platforms
- [ ] Binary sizes are reasonable (<10MB each)
- [ ] Checksums are generated correctly
- [ ] Builds are deterministic (same commit = same hash)

### Cross-Compilation
- [ ] Linux ARM64 binary runs on Raspberry Pi
- [ ] macOS ARM64 binary runs on Apple Silicon
- [ ] Windows x64 binary runs on Windows 11
- [ ] No "wrong architecture" errors

### Performance
- [ ] First build: <20 minutes per platform
- [ ] Cached build: <7 minutes per platform
- [ ] Cache hit rate: >80%
- [ ] Total workflow time: <20 minutes (all platforms parallel)

### Artifact Management
- [ ] Artifacts upload successfully
- [ ] Artifact names are correct (`binaries-{platform}`)
- [ ] Checksums match binary content
- [ ] Artifacts are downloadable from Actions UI
- [ ] Retention policies work (expire after 30/90 days)

### npm Publishing (if enabled)
- [ ] Platform packages publish before main package
- [ ] All platform packages are available on npm
- [ ] Main packages reference correct platform versions
- [ ] `npm install -g lean-spec` works after publish
- [ ] Published binaries are executable

### Security
- [ ] `NPM_TOKEN` is not exposed in logs
- [ ] Checksums are verified before publishing
- [ ] Workflow only runs on trusted branches/tags
- [ ] Dependencies are locked (`Cargo.lock` committed)

## Notes

### Alternative Approaches Considered

**1. Use `cross` for Cross-Compilation**
- ✅ Pros: Simplifies cross-compilation setup
- ❌ Cons: Docker overhead, slower builds, complex caching
- **Decision**: Native cross-compilation is simpler for our use case

**2. Use `cargo-zigbuild` for Universal Builds**
- ✅ Pros: Single command for all platforms
- ❌ Cons: Additional dependency, less tested
- **Decision**: Use native toolchains for stability

**3. Build on Each Platform (no cross-compilation)**
- ✅ Pros: Most reliable, true native builds
- ❌ Cons: Requires runners for each platform (macOS, Linux, Windows)
- **Decision**: We already do this for macOS/Windows, only cross-compile Linux ARM64

**4. Use Tauri GitHub Action**
- ✅ Pros: Pre-configured for Tauri projects
- ❌ Cons: Designed for desktop apps, not CLI tools
- **Decision**: Custom workflow gives more control

### Platform-Specific Notes

**macOS:**
- GitHub Actions `macos-latest` = macOS 13 (Ventura)
- Supports both x64 and ARM64 targets
- No code signing needed for CLI tools (users will see Gatekeeper warning)

**Linux:**
- GitHub Actions `ubuntu-latest` = Ubuntu 22.04
- ARM64 cross-compilation requires `gcc-aarch64-linux-gnu`
- MUSL vs GLIBC: We use GNU (better compatibility)

**Windows:**
- GitHub Actions `windows-latest` = Windows Server 2022
- MSVC toolchain (not MinGW)
- No code signing needed for CLI tools (SmartScreen warning expected)

### Future Enhancements

**Code Signing:**
- macOS: Apple Developer ID signing + notarization
- Windows: Authenticode signing certificate
- Cost: ~$300-500/year for certificates

**Additional Targets:**
- Windows ARM64 (when runners available)
- Alpine Linux (MUSL builds)
- FreeBSD (via cross-compilation)

**Advanced Caching:**
- Use `sccache` for faster Rust compilation
- Cache across branches (not just same branch)
- Incremental builds (only changed crates)

**Monitoring:**
- Build time metrics dashboard
- Cache hit rate tracking
- Binary size trends over time

### References

**GitHub Actions:**
- [actions-rs/toolchain](https://github.com/actions-rs/toolchain) - Rust setup
- [actions/cache](https://github.com/actions/cache) - Caching dependencies
- [actions/upload-artifact](https://github.com/actions/upload-artifact) - Artifact management

**Cross-Compilation:**
- [Rust Cross-Compilation](https://rust-lang.github.io/rustup/cross-compilation.html)
- [cargo-cross](https://github.com/cross-rs/cross) - Cross-compilation tool
- [Linux ARM64 Cross](https://github.com/rust-lang/rust/issues/79609)

**Similar Projects:**
- [esbuild CI](https://github.com/evanw/esbuild/blob/master/.github/workflows/ci.yml)
- [swc CI](https://github.com/swc-project/swc/blob/main/.github/workflows/CI.yml)
- [Tauri GitHub Action](https://github.com/tauri-apps/tauri-action)

### Success Metrics

**Must Have:**
- ✅ All 6 platforms build successfully
- ✅ Build time <20 minutes (parallel)
- ✅ Artifacts are downloadable and executable
- ✅ Caching reduces build time by 70%

**Nice to Have:**
- ✅ Automated npm publishing
- ✅ Checksum verification
- ✅ Build time <10 minutes (cached)

**Optional:**
- Code signing for macOS/Windows
- Additional platforms (ARM64 Windows, FreeBSD)
- Build time metrics dashboard
