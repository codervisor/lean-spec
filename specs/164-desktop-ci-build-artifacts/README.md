---
status: planned
created: '2025-12-10'
tags:
  - desktop
  - ci-cd
  - github-actions
  - tauri
  - build-automation
  - distribution
priority: high
created_at: '2025-12-10T10:33:09.478Z'
depends_on:
  - 148-leanspec-desktop-app
updated_at: '2025-12-10T10:33:09.530Z'
---

# Desktop CI Build Artifacts for Multiple Platforms

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-12-10 · **Tags**: desktop, ci-cd, github-actions, tauri, build-automation, distribution

## Overview

Set up GitHub Actions CI/CD to build desktop packages for Windows, macOS, and Linux, publishing them as GitHub artifacts for easy distribution and testing.

## Motivation

Building desktop apps for multiple platforms is time-consuming and resource-intensive. Developers need to:
- Manually set up build environments for Windows, macOS, and Linux
- Install platform-specific toolchains (Rust, system dependencies)
- Run builds locally (slow, inconsistent results)
- Share binaries manually for testing

**With GitHub Actions CI/CD:**
- ✅ Automated multi-platform builds on every commit/PR
- ✅ Consistent build environments (no "works on my machine")
- ✅ Downloadable artifacts for testing without local builds
- ✅ Foundation for future release automation
- ✅ No local Rust/Tauri setup required for contributors

## Design

### Multi-Platform Build Matrix

Use GitHub Actions matrix strategy to build for all platforms in parallel:

| Platform | Runner | Output Format | Artifacts |
|----------|--------|---------------|-----------|
| **macOS (Intel)** | `macos-latest` | `.dmg`, `.app.tar.gz` | macOS disk image + app bundle |
| **macOS (Apple Silicon)** | `macos-latest` | `.dmg`, `.app.tar.gz` | Native ARM64 build (future) |
| **Windows** | `windows-latest` | `.msi`, `.exe` | Windows installer + portable exe |
| **Linux (AppImage)** | `ubuntu-latest` | `.AppImage` | Universal Linux binary |
| **Linux (Debian)** | `ubuntu-latest` | `.deb` | Debian/Ubuntu package |

**Why These Formats?**
- **DMG (macOS)**: Standard macOS distribution format
- **MSI (Windows)**: Official installer format, supports auto-update
- **AppImage (Linux)**: Works on all distros, no installation required
- **DEB (Linux)**: Native package for Debian/Ubuntu users

### Workflow Trigger Strategy

```yaml
on:
  # Build on release tags (v*.*.* pattern)
  push:
    tags:
      - 'v*.*.*'
  
  # Build when GitHub Release is published
  release:
    types: [published]
  
  # Manual trigger for testing/ad-hoc builds
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to build (overrides package.json)'
        required: false
        type: string
      platforms:
        description: 'Platforms to build (comma-separated: macos,windows,linux)'
        required: false
        default: 'macos,windows,linux'
        type: string
```

**Rationale:**
- **No PR/push builds** → Saves CI minutes, builds only when ready to release
- **Release trigger** → Automatic builds when version is tagged or release published
- **Manual dispatch** → Quick testing without creating releases

### Build Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Actions Workflow                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   macOS     │  │   Windows   │  │    Linux    │        │
│  │   Runner    │  │   Runner    │  │   Runner    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                 │
│         ▼                ▼                ▼                 │
│  ┌────────────────────────────────────────────────┐        │
│  │  1. Setup: Node, pnpm, Rust toolchain          │        │
│  │  2. Install: Dependencies (pnpm install)       │        │
│  │  3. Build: Next.js UI → Tauri bundles          │        │
│  │  4. Package: Platform-specific installers      │        │
│  │  5. Upload: Artifacts to GitHub                │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Downloadable Artifacts                  │   │
│  │  • leanspec-desktop-0.1.0-macos.dmg                 │   │
│  │  • leanspec-desktop-0.1.0-windows.msi               │   │
│  │  • leanspec-desktop-0.1.0-linux.AppImage            │   │
│  │  • leanspec-desktop-0.1.0-linux.deb                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Tauri Build Configuration

**Current State** (from `tauri.conf.json`):
```json
{
  "bundle": {
    "targets": "all",  // Builds all platform formats
    "identifier": "dev.leanspec.desktop"
  }
}
```

**CI-Specific Build Command:**
```bash
pnpm build:desktop
# Internally runs:
# 1. pnpm --filter @leanspec/ui build (Next.js standalone)
# 2. pnpm prepare:ui (copy to Tauri resources)
# 3. cargo tauri build (Rust + bundle)
```

### Artifact Organization

**Naming Convention:**
```
leanspec-desktop-{version}-{platform}-{arch}.{ext}

Examples:
- leanspec-desktop-0.1.0-macos-x64.dmg
- leanspec-desktop-0.1.0-macos-arm64.dmg (future)
- leanspec-desktop-0.1.0-windows-x64.msi
- leanspec-desktop-0.1.0-linux-x64.AppImage
- leanspec-desktop-0.1.0-linux-x64.deb
```

**Artifact Storage Strategy:**
- **Manual builds**: Keep for 30 days (testing only)
- **Release builds**: Keep for 90 days (versioned releases)
- **GitHub Releases**: Permanent (attached to release)

### Security & Code Signing (Future)

**Current Scope:** Unsigned builds for testing

**Future Enhancements:**
- **macOS**: Apple Developer ID signing + notarization
- **Windows**: Code signing certificate + SmartScreen bypass
- **Linux**: No signing required (community standard)

*Note: Code signing requires paid certificates (~$300-500/yr) and is **not required** for initial MVP. Add in future release workflow.*

## Plan

### Phase 1: Basic Multi-Platform Workflow
- [ ] Create `.github/workflows/desktop-build.yml`
- [ ] Set up build matrix for macOS, Windows, Linux
- [ ] Configure Node.js (v20) and pnpm setup
- [ ] Install Rust toolchain for each platform
- [ ] Add platform-specific dependencies (Linux: webkit2gtk, etc.)

### Phase 2: Build Process Integration
- [ ] Run `pnpm install --frozen-lockfile` in CI
- [ ] Execute `pnpm build:desktop` command
- [ ] Handle build failures gracefully
- [ ] Add timeout protection (30 min max per platform)
- [ ] Cache dependencies (pnpm store, Rust cargo)

### Phase 3: Artifact Upload & Organization
- [ ] Upload build artifacts with `actions/upload-artifact@v4`
- [ ] Name artifacts by platform and version
- [ ] Set retention policies (7 days PR, 90 days main)
- [ ] Generate checksums (SHA256) for each artifact
- [ ] Create artifact index/manifest file

### Phase 4: Release Integration & Testing
- [ ] Configure release tag trigger (`v*.*.*` pattern)
- [ ] Test manual workflow dispatch with version input
- [ ] Verify artifacts attach to GitHub Releases automatically
- [ ] Add workflow status badge to README
- [ ] Test with actual release creation

### Phase 5: Documentation & Developer Experience
- [ ] Document how to download artifacts from Actions tab
- [ ] Add troubleshooting guide for build failures
- [ ] Create testing checklist for QA on different platforms
- [ ] Update contributing guide with CI/CD info
- [ ] Add workflow status badge to README

### Phase 6: Optimization & Polish
- [ ] Parallelize builds (already done via matrix)
- [ ] Optimize caching strategy (Rust incremental builds)
- [ ] Add build time metrics
- [ ] Set up build failure notifications (Slack/Discord)
- [ ] Consider conditional builds based on changed files

## Test

### Workflow Validation
- [ ] Workflow YAML syntax is valid (`actionlint` or GitHub's checker)
- [ ] All required secrets/variables are documented
- [ ] Workflow triggers correctly on release tags, release publish, manual
- [ ] Matrix builds run in parallel
- [ ] Failed builds don't block other platforms
- [ ] Manual dispatch platform filtering works correctly

### Build Quality Checks
- [ ] macOS `.dmg` mounts and installs correctly
- [ ] Windows `.msi` installs without admin warnings
- [ ] Linux `.AppImage` runs on Ubuntu 22.04, Fedora 39
- [ ] Linux `.deb` installs on Debian/Ubuntu systems
- [ ] All artifacts launch the desktop app successfully

### Artifact Verification
- [ ] Artifacts are named correctly (`leanspec-desktop-{version}-{platform}`)
- [ ] Checksums are generated and match
- [ ] Artifact sizes are reasonable (<100 MB each)
- [ ] Artifacts attach to GitHub Releases correctly
- [ ] Retention policies work (30d manual, 90d release)

### Platform-Specific Tests
- [ ] **macOS**: App runs on Intel Macs (x64)
- [ ] **macOS**: Gatekeeper warning appears (unsigned, expected)
- [ ] **Windows**: Installer creates Start Menu shortcuts
- [ ] **Windows**: SmartScreen warning appears (unsigned, expected)
- [ ] **Linux**: AppImage works on multiple distros
- [ ] **Linux**: DEB package installs dependencies correctly

### Performance & Reliability
- [ ] Full build completes in <30 minutes (across all platforms)
- [ ] Builds are deterministic (same commit → same output)
- [ ] Cache hits improve build time by >50%
- [ ] Failed builds retry automatically (on transient errors)
- [ ] Build logs are clear and actionable

## Notes

### Sub-Specs

- [WORKFLOW.yml](./WORKFLOW.yml) - Complete GitHub Actions workflow implementation
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common build issues and solutions

### Platform-Specific Dependencies

**macOS:**
- Pre-installed: Xcode Command Line Tools, Rust
- Required: None (GitHub runner has everything)

**Windows:**
- Pre-installed: Visual Studio Build Tools, Rust
- Required: WiX Toolset (for MSI generation)
  ```yaml
  - name: Install WiX
    run: dotnet tool install --global wix
  ```

**Linux (Ubuntu):**
- Required system packages:
  ```yaml
  - name: Install dependencies
    run: |
      sudo apt-get update
      sudo apt-get install -y \
        libwebkit2gtk-4.0-dev \
        libgtk-3-dev \
        libayatana-appindicator3-dev \
        librsvg2-dev \
        patchelf
  ```

### Caching Strategy

**pnpm Dependencies:**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'
```

**Rust Toolchain & Cargo:**
```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.cargo/bin/
      ~/.cargo/registry/index/
      ~/.cargo/registry/cache/
      ~/.cargo/git/db/
      packages/desktop/src-tauri/target/
    key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
```

**Expected Cache Improvement:**
- First build: ~20-25 minutes
- Cached build: ~10-12 minutes (50% faster)

### Alternative Approaches Considered

**1. Tauri GitHub Action (`tauri-apps/tauri-action`)**
- ✅ Pros: Pre-configured, handles signing, draft releases
- ❌ Cons: Less control, opaque failures, overkill for MVP
- **Decision**: Build our own first, migrate later if needed

**2. Cross-Platform Build on Single Runner**
- ✅ Pros: Simpler workflow
- ❌ Cons: Much slower (serial builds), runner doesn't support cross-compilation
- **Decision**: Use matrix for parallel builds

**3. Docker-Based Builds**
- ✅ Pros: Consistent environments
- ❌ Cons: Doesn't work for macOS signing, complex setup
- **Decision**: Use native runners (GitHub-hosted)

### Future Enhancements

**Phase 2 (Post-MVP):**
- [ ] Add code signing for macOS (notarization)
- [ ] Add code signing for Windows (authenticode)
- [ ] Auto-generate release notes from git history
- [ ] Publish to GitHub Releases automatically
- [ ] Create update.json for Tauri auto-updater
- [ ] Add Homebrew formula generation (macOS)
- [ ] Add Scoop manifest generation (Windows)
- [ ] Add Flatpak/Snap support (Linux)

**Phase 3 (Advanced):**
- [ ] Build ARM64 binaries for Apple Silicon Macs
- [ ] Build ARM64 binaries for Raspberry Pi (Linux)
- [ ] Incremental builds (only changed packages)
- [ ] Nightly builds with version suffixes
- [ ] Beta/alpha release channels
- [ ] Automatic security scanning (Dependabot, Snyk)

### References

- [Tauri Build Documentation](https://tauri.app/v1/guides/building/)
- [GitHub Actions: Building and Testing Rust](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-rust)
- [Tauri GitHub Action (reference)](https://github.com/tauri-apps/tauri-action)
- [GitHub Actions: Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Artifact Upload Action](https://github.com/actions/upload-artifact)

### Success Metrics

**Immediate (MVP):**
- ✅ Builds succeed on all 3 platforms
- ✅ Artifacts downloadable from Actions tab
- ✅ Build time <30 minutes per platform

**Short-Term (1-2 weeks):**
- ✅ Team members test artifacts on their machines
- ✅ No manual builds required for QA
- ✅ Contributors can test PRs without local setup

**Long-Term (1-3 months):**
- ✅ Automated releases on version tags
- ✅ Auto-update system working
- ✅ Community can easily test pre-release builds
