---
status: planned
created: 2026-01-13
priority: low
tags:
- distribution
- packaging
- deployment
- automation
- infrastructure
created_at: 2026-01-13T04:23:23.407095620Z
updated_at: 2026-02-01T15:41:13.138212Z
---
# Cross-Platform Binary Distribution

## Overview

### Problem Statement

LeanSpec currently distributes Rust binaries via npm (specs 172, 173), which works well for JavaScript/TypeScript developers. However, this limits reach to:

**Target Audience Beyond npm:**
- DevOps engineers who prefer native package managers
- System administrators managing multiple tools
- Users without Node.js installed
- Organizations with restricted npm access
- Developers preferring platform-native installation methods

**Current State:**
- ✅ npm distribution working (spec 172)
- ✅ CI/CD pipeline building for 6 platforms (spec 173)
- ❌ No native package manager support (Homebrew, apt, winget, etc.)
- ❌ No auto-update mechanism
- ❌ No simple "download binary" option

**Goal:** Expand distribution channels to cover all major platforms and installation preferences while maintaining low maintenance overhead.

### Success Criteria

**Must Have:**
- One-command installation on macOS, Linux, Windows
- Works without Node.js/npm installed
- Auto-update support (at least notify users of new versions)
- Low maintenance (automated publishing via CI)

**Nice to Have:**
- Package manager auto-updates
- Verification/signing for binaries
- Multiple installation methods per platform
- Community package managers (AUR, nixpkgs, etc.)

## Design

### Distribution Matrix

| Platform    | Primary                          | Secondary                   | Future                 |
| ----------- | -------------------------------- | --------------------------- | ---------------------- |
| **macOS**   | Homebrew                         | npm, Direct Download        | MacPorts, Nix          |
| **Linux**   | Direct Download + Install Script | apt (PPA), snap, npm        | Flatpak, AppImage, AUR |
| **Windows** | winget                           | npm, Scoop, Direct Download | Chocolatey             |

### Priority Ranking

**Tier 1 (Implement First):**
1. **Homebrew** (macOS) - Industry standard for CLI tools
2. **Direct Download + Install Script** (All platforms) - Universal fallback
3. **winget** (Windows) - Official Microsoft package manager

**Tier 2 (Quick Wins):**
4. **Scoop** (Windows) - Popular among developers, easy manifest
5. **GitHub Releases** - Already doing this (spec 173 artifacts)

**Tier 3 (Community-Driven):**
6. **apt/PPA** (Ubuntu/Debian) - Complex but widely used
7. **AUR** (Arch Linux) - Community can maintain
8. **nixpkgs** (NixOS/Nix) - Growing popularity
9. **Chocolatey** (Windows) - Less popular than winget/Scoop

### 1. Homebrew (macOS + Linux)

**Why Homebrew First?**
- De facto standard for CLI tools on macOS
- Also works on Linux (Homebrew on Linux)
- Simple Ruby formula
- Official tap for LeanSpec packages

**Implementation:**

**Tap Structure:**
```
codervisor/homebrew-leanspec/
├── README.md
├── Formula/
│   ├── lean-spec.rb
│   └── leanspec-mcp.rb
└── Casks/ (future: desktop app)
    └── leanspec.rb
```

**Formula Template (`Formula/lean-spec.rb`):**
```ruby
class LeanSpec < Formula
  desc "Lightweight spec methodology for AI-powered development"
  homepage "https://leanspec.org"
  version "0.3.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.intel?
      url "https://github.com/codervisor/lean-spec/releases/download/v0.3.0/lean-spec-darwin-x64.tar.gz"
      sha256 "..." # From CI
    elsif Hardware::CPU.arm?
      url "https://github.com/codervisor/lean-spec/releases/download/v0.3.0/lean-spec-darwin-arm64.tar.gz"
      sha256 "..." # From CI
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url "https://github.com/codervisor/lean-spec/releases/download/v0.3.0/lean-spec-linux-x64.tar.gz"
      sha256 "..." # From CI
    elsif Hardware::CPU.arm?
      url "https://github.com/codervisor/lean-spec/releases/download/v0.3.0/lean-spec-linux-arm64.tar.gz"
      sha256 "..." # From CI
    end
  end

  def install
    bin.install "lean-spec"
  end

  test do
    system "#{bin}/lean-spec", "--version"
  end
end
```

**Installation:**
```bash
brew tap codervisor/leanspec
brew install lean-spec
```

**Maintenance:**
- Automated via CI (bump version, update URLs/checksums)
- Homebrew validates formula on PR
- Community can contribute fixes

**Auto-Updates:**
- ✅ Built-in: `brew update && brew upgrade lean-spec`
- ✅ Homebrew checks for updates automatically

### 2. Direct Download + Install Script

**Why Universal Install Script?**
- Works everywhere (no dependencies)
- Fallback when package managers unavailable
- Common pattern (rustup, deno, bun use this)

**Implementation:**

**Script:** `install.sh` (hosted on GitHub)
```bash
#!/bin/sh
# LeanSpec Universal Installer
# Usage: curl -fsSL https://leanspec.org/install.sh | sh

set -e

# Detect platform
OS=$(uname -s)
ARCH=$(uname -m)

case "$OS" in
  Darwin)
    case "$ARCH" in
      x86_64) PLATFORM="darwin-x64" ;;
      arm64)  PLATFORM="darwin-arm64" ;;
      *)      echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64)  PLATFORM="linux-x64" ;;
      aarch64) PLATFORM="linux-arm64" ;;
      *)       echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "Windows detected. Please use installer:"
    echo "  winget install leanspec"
    echo "  or download from: https://github.com/codervisor/lean-spec/releases"
    exit 1
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

# Fetch latest version from GitHub API
VERSION=$(curl -s https://api.github.com/repos/codervisor/lean-spec/releases/latest | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/')

echo "Installing LeanSpec v$VERSION for $PLATFORM..."

# Download binary
DOWNLOAD_URL="https://github.com/codervisor/lean-spec/releases/download/v$VERSION/lean-spec-$PLATFORM.tar.gz"
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

echo "Downloading from $DOWNLOAD_URL..."
curl -fsSL "$DOWNLOAD_URL" -o lean-spec.tar.gz

# Verify checksum
echo "Verifying checksum..."
curl -fsSL "$DOWNLOAD_URL.sha256" -o lean-spec.sha256
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 -c lean-spec.sha256
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum -c lean-spec.sha256
else
  echo "Warning: Cannot verify checksum (shasum/sha256sum not found)"
fi

# Extract and install
tar -xzf lean-spec.tar.gz

# Install to /usr/local/bin or ~/.local/bin
if [ -w /usr/local/bin ]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR="$HOME/.local/bin"
  mkdir -p "$INSTALL_DIR"
  echo "Note: Installing to $INSTALL_DIR (add to PATH if needed)"
fi

mv lean-spec "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/lean-spec"

# Cleanup
cd - >/dev/null
rm -rf "$TMP_DIR"

echo ""
echo "✅ LeanSpec installed successfully!"
echo ""
echo "Run: lean-spec --version"
echo "Docs: https://leanspec.org/docs"
```

**Windows PowerShell Version:** `install.ps1`
```powershell
# LeanSpec Windows Installer
# Usage: iwr -useb https://leanspec.org/install.ps1 | iex

$ErrorActionPreference = 'Stop'

# Detect architecture
$Arch = $env:PROCESSOR_ARCHITECTURE
if ($Arch -eq "AMD64") {
    $Platform = "windows-x64"
} else {
    Write-Error "Unsupported architecture: $Arch"
    exit 1
}

# Fetch latest version
$Release = Invoke-RestMethod -Uri "https://api.github.com/repos/codervisor/lean-spec/releases/latest"
$Version = $Release.tag_name -replace '^v', ''

Write-Host "Installing LeanSpec v$Version for $Platform..." -ForegroundColor Green

# Download binary
$DownloadUrl = "https://github.com/codervisor/lean-spec/releases/download/v$Version/lean-spec-$Platform.zip"
$TmpDir = [System.IO.Path]::GetTempPath() + [System.Guid]::NewGuid().ToString()
New-Item -ItemType Directory -Path $TmpDir | Out-Null

$ZipPath = "$TmpDir\lean-spec.zip"
Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath

# Extract
Expand-Archive -Path $ZipPath -DestinationPath $TmpDir

# Install to %LOCALAPPDATA%\Programs\leanspec
$InstallDir = "$env:LOCALAPPDATA\Programs\leanspec"
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item "$TmpDir\lean-spec.exe" -Destination $InstallDir -Force

# Add to PATH if not already there
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    Write-Host "Added $InstallDir to PATH" -ForegroundColor Yellow
    Write-Host "Note: Restart your terminal to use 'lean-spec' command" -ForegroundColor Yellow
}

# Cleanup
Remove-Item -Path $TmpDir -Recurse -Force

Write-Host ""
Write-Host "✅ LeanSpec installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Run: lean-spec --version"
Write-Host "Docs: https://leanspec.org/docs"
```

**Installation:**
```bash
# macOS/Linux
curl -fsSL https://leanspec.org/install.sh | sh

# Windows (PowerShell)
iwr -useb https://leanspec.org/install.ps1 | iex
```

**Hosting:**
- Host scripts on GitHub (raw.githubusercontent.com)
- Or use custom domain redirect (leanspec.org/install.sh → GitHub)

**Maintenance:**
- Scripts rarely change (just version/URL logic)
- Tested in CI before releases

### 3. winget (Windows Package Manager)

**Why winget?**
- Official Microsoft package manager (Windows 10+)
- Pre-installed on Windows 11
- Simple YAML manifest

**Implementation:**

**Manifest Structure:**
```
manifests/
├── c/
│   └── codervisor/
│       └── LeanSpec/
│           ├── 0.3.0/
│           │   ├── codervisor.LeanSpec.installer.yaml
│           │   ├── codervisor.LeanSpec.locale.en-US.yaml
│           │   └── codervisor.LeanSpec.yaml
│           └── (other versions)
```

**Manifest Example (`codervisor.LeanSpec.installer.yaml`):**
```yaml
PackageIdentifier: codervisor.LeanSpec
PackageVersion: 0.3.0
Installers:
  - Architecture: x64
    InstallerType: zip
    InstallerUrl: https://github.com/codervisor/lean-spec/releases/download/v0.3.0/lean-spec-windows-x64.zip
    InstallerSha256: <SHA256>
    NestedInstallerFiles:
      - RelativeFilePath: lean-spec.exe
        PortableCommandAlias: lean-spec
    InstallerSwitches:
      Silent: ""
      SilentWithProgress: ""
ManifestType: installer
ManifestVersion: 1.5.0
```

**Installation:**
```powershell
winget install leanspec
```

**Maintenance:**
- Submit PR to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs)
- Can automate with GitHub Actions
- Community reviews PRs (usually <24 hours)

**Auto-Updates:**
- ✅ Built-in: `winget upgrade leanspec`
- ✅ winget checks for updates

### 4. Scoop (Windows)

**Why Scoop?**
- Popular among developers (especially those from Unix backgrounds)
- Extremely simple JSON manifests
- Fast review process

**Implementation:**

**Bucket Structure:**
```
codervisor/scoop-leanspec/
├── README.md
└── bucket/
    └── lean-spec.json
```

**Manifest (`bucket/lean-spec.json`):**
```json
{
  "version": "0.3.0",
  "description": "Lightweight spec methodology for AI-powered development",
  "homepage": "https://leanspec.org",
  "license": "MIT",
  "architecture": {
    "64bit": {
      "url": "https://github.com/codervisor/lean-spec/releases/download/v0.3.0/lean-spec-windows-x64.zip",
      "hash": "sha256:...",
      "extract_dir": ""
    }
  },
  "bin": "lean-spec.exe",
  "checkver": {
    "github": "https://github.com/codervisor/lean-spec"
  },
  "autoupdate": {
    "architecture": {
      "64bit": {
        "url": "https://github.com/codervisor/lean-spec/releases/download/v$version/lean-spec-windows-x64.zip"
      }
    }
  }
}
```

**Installation:**
```powershell
scoop bucket add leanspec https://github.com/codervisor/scoop-leanspec
scoop install lean-spec
```

**Maintenance:**
- Automate with `scoop checkver` + `scoop update`
- Can run in CI to auto-update manifests

**Auto-Updates:**
- ✅ Built-in: `scoop update lean-spec`

### 5. GitHub Releases (Universal)

**Current State:**
- Already generating artifacts in spec 173
- Need to format for easy consumption

**Improvements:**

**Release Assets:**
```
v0.3.0/
├── lean-spec-darwin-x64.tar.gz
├── lean-spec-darwin-x64.tar.gz.sha256
├── lean-spec-darwin-arm64.tar.gz
├── lean-spec-darwin-arm64.tar.gz.sha256
├── lean-spec-linux-x64.tar.gz
├── lean-spec-linux-x64.tar.gz.sha256
├── lean-spec-linux-arm64.tar.gz
├── lean-spec-linux-arm64.tar.gz.sha256
├── lean-spec-windows-x64.zip
├── lean-spec-windows-x64.zip.sha256
├── checksums.txt (all platforms)
└── CHANGELOG.md (extracted for this version)
```

**Release Notes Template:**
```markdown
## LeanSpec v0.3.0

### Installation

**macOS/Linux:**
\`\`\`bash
curl -fsSL https://leanspec.org/install.sh | sh
\`\`\`

**Windows (winget):**
\`\`\`powershell
winget install leanspec
\`\`\`

**Windows (PowerShell):**
\`\`\`powershell
iwr -useb https://leanspec.org/install.ps1 | iex
\`\`\`

**Homebrew:**
\`\`\`bash
brew install codervisor/leanspec/lean-spec
\`\`\`

**npm:**
\`\`\`bash
npm install -g lean-spec
\`\`\`

### What's New

(Changelog content)

### Direct Downloads

| Platform              | Binary                               | Checksum      |
| --------------------- | ------------------------------------ | ------------- |
| macOS (Intel)         | [lean-spec-darwin-x64.tar.gz](url)   | [sha256](url) |
| macOS (Apple Silicon) | [lean-spec-darwin-arm64.tar.gz](url) | [sha256](url) |
| Linux (x64)           | [lean-spec-linux-x64.tar.gz](url)    | [sha256](url) |
| Linux (ARM64)         | [lean-spec-linux-arm64.tar.gz](url)  | [sha256](url) |
| Windows (x64)         | [lean-spec-windows-x64.zip](url)     | [sha256](url) |
```

### 6. apt/PPA (Ubuntu/Debian)

**Why Later?**
- Complex setup (requires Launchpad account, GPG signing)
- Not common for CLI tools (most use direct downloads)
- High maintenance burden

**Implementation (Future):**

**PPA:** `ppa:codervisor/leanspec`

**Package Structure:**
```
leanspec_0.3.0-1_amd64.deb
leanspec_0.3.0-1_arm64.deb
```

**Control File:**
```
Package: leanspec
Version: 0.3.0-1
Architecture: amd64
Maintainer: LeanSpec Team <team@leanspec.org>
Description: Lightweight spec methodology for AI-powered development
```

**Installation:**
```bash
sudo add-apt-repository ppa:codervisor/leanspec
sudo apt-get update
sudo apt-get install leanspec
```

**Maintenance:**
- Requires GPG signing
- Upload to Launchpad for each release
- Can automate with `dput` in CI

### 7. Community Package Managers

**AUR (Arch Linux):**
- Community-maintained PKGBUILD
- We provide sample, community maintains
- No official support needed

**nixpkgs (NixOS):**
- Community-maintained derivation
- Growing popularity in dev tools
- No official support needed

**Chocolatey (Windows):**
- Less popular than winget/Scoop
- High maintenance (moderation process)
- Lower priority

### Distribution Comparison

| Method              | Audience         | Maintenance      | Auto-Update | Priority |
| ------------------- | ---------------- | ---------------- | ----------- | -------- |
| **npm**             | JS/TS devs       | Low (automated)  | ✅           | ✅ Done   |
| **Homebrew**        | macOS/Linux devs | Low (automated)  | ✅           | 🔥 Tier 1 |
| **Install Script**  | Everyone         | Very Low         | ❌           | 🔥 Tier 1 |
| **winget**          | Windows users    | Medium           | ✅           | 🔥 Tier 1 |
| **Scoop**           | Windows devs     | Low (automated)  | ✅           | ⭐ Tier 2 |
| **GitHub Releases** | Manual downloads | Very Low         | ❌           | ⭐ Tier 2 |
| **apt/PPA**         | Ubuntu/Debian    | High (signing)   | ✅           | 💤 Tier 3 |
| **AUR**             | Arch users       | None (community) | ✅           | 💤 Tier 3 |
| **nixpkgs**         | Nix users        | None (community) | ✅           | 💤 Tier 3 |
| **Chocolatey**      | Windows users    | High             | ✅           | 💤 Tier 3 |

### Automated Publishing Workflow

**Note (current repo state):** The release workflow now builds Rust binaries inline in `.github/workflows/publish.yml`; the standalone `.github/workflows/rust-binaries.yml` workflow is no longer required.

**CI Enhancement (`.github/workflows/publish-release.yml`):**

```yaml
name: Publish Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  # 1. Build binaries (reuse spec 173 workflow)
  build:
    # Build Rust binaries as part of the release workflow.
    # See `.github/workflows/publish.yml` for the current implementation.

  # 2. Create GitHub Release
  create-release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Download artifacts
        uses: actions/download-artifact@v4
      
      - name: Prepare release assets
        run: |
          # Create tarballs for Unix, zips for Windows
          # Generate checksums.txt
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            lean-spec-darwin-x64.tar.gz
            lean-spec-darwin-arm64.tar.gz
            lean-spec-linux-x64.tar.gz
            lean-spec-linux-arm64.tar.gz
            lean-spec-windows-x64.zip
            checksums.txt
          body_path: CHANGELOG.md

  # 3. Publish to npm (existing)
  publish-npm:
    needs: create-release
    uses: ./.github/workflows/publish-npm.yml

  # 4. Update Homebrew Formula
  publish-homebrew:
    needs: create-release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: codervisor/homebrew-leanspec
          token: ${{ secrets.HOMEBREW_TAP_TOKEN }}
      
      - name: Update formula
        run: |
          # Update version, URLs, checksums in Formula/lean-spec.rb
          # Commit and push
      
      - name: Create PR
        run: gh pr create --title "Update lean-spec to $VERSION"

  # 5. Update winget Manifest
  publish-winget:
    needs: create-release
    runs-on: windows-latest
    steps:
      - name: Update winget manifest
        run: |
          # Clone microsoft/winget-pkgs
          # Update manifest with new version
          # Create PR
      
      - name: Submit PR to winget-pkgs
        run: gh pr create --repo microsoft/winget-pkgs

  # 6. Update Scoop Bucket
  publish-scoop:
    needs: create-release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: codervisor/scoop-leanspec
          token: ${{ secrets.SCOOP_BUCKET_TOKEN }}
      
      - name: Update manifest
        run: |
          scoop checkver lean-spec
          scoop update lean-spec
      
      - name: Commit and push
        run: git commit -am "Update lean-spec to $VERSION" && git push
```

**Secrets Required:**
- `GITHUB_TOKEN` (built-in)
- `NPM_TOKEN` (npm publishing)
- `HOMEBREW_TAP_TOKEN` (GitHub PAT for tap repo)
- `SCOOP_BUCKET_TOKEN` (GitHub PAT for bucket repo)

### Documentation Updates

**README.md Installation Section:**
```markdown
## Installation

### Package Managers (Recommended)

**macOS:**
\`\`\`bash
brew install codervisor/leanspec/lean-spec
\`\`\`

**Windows:**
\`\`\`powershell
winget install leanspec
# or
scoop bucket add leanspec https://github.com/codervisor/scoop-leanspec
scoop install lean-spec
\`\`\`

**npm/pnpm/yarn:**
\`\`\`bash
npm install -g lean-spec
# or
pnpm add -g lean-spec
# or
yarn global add lean-spec
\`\`\`

### Quick Install Script

**macOS/Linux:**
\`\`\`bash
curl -fsSL https://leanspec.org/install.sh | sh
\`\`\`

**Windows (PowerShell):**
\`\`\`powershell
iwr -useb https://leanspec.org/install.ps1 | iex
\`\`\`

### Direct Downloads

Download pre-built binaries from [GitHub Releases](https://github.com/codervisor/lean-spec/releases).

### Verify Installation

\`\`\`bash
lean-spec --version
\`\`\`
```

## Plan

### Phase 1: Infrastructure Setup
- [ ] Create `codervisor/homebrew-leanspec` repository
  - [ ] Add Formula/lean-spec.rb
  - [ ] Add Formula/leanspec-mcp.rb
  - [ ] Document tap usage in README
- [ ] Create `codervisor/scoop-leanspec` repository
  - [ ] Add bucket/lean-spec.json
  - [ ] Add autoupdate configuration
  - [ ] Document bucket usage in README
- [ ] Create install scripts
  - [ ] Write install.sh for Unix
  - [ ] Write install.ps1 for Windows
  - [ ] Test on all platforms
  - [ ] Host on GitHub (scripts/ directory)

### Phase 2: GitHub Releases Enhancement
- [ ] Update CI to generate proper release assets
  - [ ] Create .tar.gz for Unix platforms
  - [ ] Create .zip for Windows
  - [ ] Generate checksums.txt (all platforms)
  - [ ] Extract version-specific CHANGELOG
- [ ] Create release notes template
  - [ ] Include all installation methods
  - [ ] Direct download table
  - [ ] What's new section
- [ ] Test manual download workflow

### Phase 3: Homebrew Integration
- [ ] Write initial Formula/lean-spec.rb
  - [ ] Platform detection logic
  - [ ] Download URLs
  - [ ] SHA256 checksums
  - [ ] Installation steps
  - [ ] Test block
- [ ] Write Formula/leanspec-mcp.rb
- [ ] Test local formula installation
  - [ ] `brew install --build-from-source Formula/lean-spec.rb`
  - [ ] Verify binary execution
- [ ] Automate formula updates in CI
  - [ ] Update version
  - [ ] Update URLs
  - [ ] Fetch and update checksums
  - [ ] Commit and push to tap

### Phase 4: winget Integration
- [ ] Write winget manifest (v0.3.0)
  - [ ] installer.yaml
  - [ ] locale.en-US.yaml
  - [ ] manifest.yaml
- [ ] Test manifest locally
  - [ ] `winget install --manifest .`
- [ ] Submit to microsoft/winget-pkgs
  - [ ] Fork repository
  - [ ] Create PR with manifest
  - [ ] Address review comments
- [ ] Automate manifest updates in CI
  - [ ] Generate new manifest for each release
  - [ ] Auto-submit PR to winget-pkgs

### Phase 5: Install Scripts Deployment
- [ ] Test install.sh on:
  - [ ] macOS Intel
  - [ ] macOS Apple Silicon
  - [ ] Ubuntu 22.04 x64
  - [ ] Ubuntu 22.04 ARM64 (Raspberry Pi)
  - [ ] Debian 12
- [ ] Test install.ps1 on:
  - [ ] Windows 11 x64
  - [ ] Windows 10 x64
  - [ ] Windows Server 2022
- [ ] Set up leanspec.org redirects
  - [ ] /install.sh → raw.githubusercontent.com/.../install.sh
  - [ ] /install.ps1 → raw.githubusercontent.com/.../install.ps1

### Phase 6: Scoop Integration
- [ ] Write bucket/lean-spec.json
  - [ ] Basic manifest
  - [ ] Autoupdate configuration
  - [ ] Checkver configuration
- [ ] Test bucket locally
  - [ ] `scoop bucket add leanspec-local /path/to/bucket`
  - [ ] `scoop install lean-spec`
- [ ] Automate bucket updates
  - [ ] Run `scoop checkver` in CI
  - [ ] Auto-commit updates

### Phase 7: Documentation
- [ ] Update main README.md
  - [ ] Installation section with all methods
  - [ ] Platform-specific instructions
  - [ ] Verification steps
- [ ] Create docs/installation.md (comprehensive guide)
  - [ ] All installation methods
  - [ ] Troubleshooting
  - [ ] Uninstallation instructions
  - [ ] Comparison table
- [ ] Update website (leanspec.org)
  - [ ] Installation page
  - [ ] Platform detection (show relevant method)
  - [ ] Quick copy-paste commands

### Phase 8: CI Automation
- [ ] Create publish-release.yml workflow
  - [ ] Reuse build jobs from spec 173
  - [ ] Create GitHub Release
  - [ ] Publish to npm
  - [ ] Update Homebrew tap
  - [ ] Update Scoop bucket
  - [ ] Submit to winget (automated PR)
- [ ] Test workflow end-to-end
  - [ ] Create test tag (v0.3.0-test)
  - [ ] Verify all distribution channels updated
  - [ ] Verify installations work

## Test

### Installation Testing

**Homebrew (macOS):**
- [ ] Fresh install: `brew install codervisor/leanspec/lean-spec`
- [ ] Update: `brew upgrade lean-spec`
- [ ] Uninstall: `brew uninstall lean-spec`
- [ ] Reinstall after uninstall
- [ ] Verify PATH and binary execution

**Install Script (Unix):**
- [ ] Fresh install on macOS Intel
- [ ] Fresh install on macOS Apple Silicon
- [ ] Fresh install on Ubuntu 22.04 x64
- [ ] Fresh install on Ubuntu 22.04 ARM64
- [ ] Fresh install on Debian 12
- [ ] Install to /usr/local/bin (with sudo)
- [ ] Install to ~/.local/bin (without sudo)
- [ ] Verify checksum validation works
- [ ] Verify error handling (bad URL, bad checksum)

**Install Script (Windows):**
- [ ] Fresh install on Windows 11
- [ ] Fresh install on Windows 10
- [ ] Verify PATH modification
- [ ] Verify binary execution after PATH update
- [ ] Uninstall (manual deletion + PATH cleanup)

**winget (Windows):**
- [ ] Fresh install: `winget install leanspec`
- [ ] Update: `winget upgrade leanspec`
- [ ] Uninstall: `winget uninstall leanspec`
- [ ] Search: `winget search leanspec`
- [ ] Show info: `winget show leanspec`

**Scoop (Windows):**
- [ ] Add bucket: `scoop bucket add leanspec <url>`
- [ ] Fresh install: `scoop install lean-spec`
- [ ] Update: `scoop update lean-spec`
- [ ] Uninstall: `scoop uninstall lean-spec`
- [ ] Verify autoupdate works

**GitHub Releases:**
- [ ] Download .tar.gz for macOS
- [ ] Download .tar.gz for Linux
- [ ] Download .zip for Windows
- [ ] Verify checksums match
- [ ] Extract and run binaries
- [ ] Manual installation to PATH

### Functional Testing

**All Methods:**
- [ ] Binary executes: `lean-spec --version`
- [ ] Binary is correct architecture (not Rosetta on M1)
- [ ] All CLI commands work
- [ ] MCP server starts correctly

### CI/CD Testing

**Automated Publishing:**
- [ ] Tag triggers workflow
- [ ] GitHub Release created with all assets
- [ ] npm packages published
- [ ] Homebrew formula updated
- [ ] Scoop bucket updated
- [ ] winget PR created

**Manifest Validation:**
- [ ] Homebrew formula passes `brew audit`
- [ ] Scoop manifest passes `scoop checkver`
- [ ] winget manifest passes validation

### Documentation Testing

- [ ] README installation instructions are accurate
- [ ] All copy-paste commands work
- [ ] Troubleshooting steps are helpful
- [ ] Platform detection on website works

## Notes

### Why This Approach?

**Principles:**
1. **Low Maintenance** - Automate everything possible
2. **User Choice** - Support multiple installation methods
3. **Platform Native** - Use standard tools for each platform
4. **No Dependencies** - Work without Node.js/npm (except npm method)
5. **Auto-Updates** - Users can easily update

**Trade-offs:**
- More distribution channels = more maintenance
- Automation reduces burden but adds complexity
- Focus on Tier 1 first, Tier 3 can be community-driven

### Alternative Approaches Considered

**1. Only npm Distribution**
- ✅ Pros: Simple, already done
- ❌ Cons: Excludes non-JS developers, requires Node.js
- **Decision:** Keep npm but add native methods

**2. Docker-Only Distribution**
- ✅ Pros: Universal, no platform-specific builds
- ❌ Cons: Heavy for CLI tool, not common pattern
- **Decision:** Consider for server deployments, not CLI

**3. Self-Hosted Update Server**
- ✅ Pros: Full control, custom update logic
- ❌ Cons: Infrastructure cost, maintenance burden
- **Decision:** Use GitHub Releases (free, reliable)

**4. All Package Managers (Including apt, snap, flatpak, AUR, etc.)**
- ✅ Pros: Maximum reach
- ❌ Cons: Unsustainable maintenance burden
- **Decision:** Focus on high-impact methods, let community contribute others

### Maintenance Strategy

**Tier 1 (Automated):**
- Homebrew: Auto-update formula in CI
- Scoop: Auto-update manifest with `scoop checkver`
- winget: Auto-submit PR (manual approval needed)

**Tier 2 (Semi-Automated):**
- Install scripts: Rarely change, just version bumps
- GitHub Releases: Fully automated

**Tier 3 (Community):**
- AUR: Provide PKGBUILD example, community maintains
- nixpkgs: Encourage community PR
- Chocolatey: If requested, provide guidance

### Security Considerations

**Binary Integrity:**
- ✅ SHA256 checksums for all binaries
- ✅ Install scripts verify checksums
- ⏳ Future: GPG/Authenticode signing

**Supply Chain:**
- ✅ Binaries built in GitHub Actions (trusted)
- ✅ Reproducible builds (Rust determinism)
- ✅ Dependencies locked (Cargo.lock)

**Distribution Security:**
- ✅ Homebrew validates formulas
- ✅ winget validates manifests
- ✅ GitHub Releases are versioned/immutable

### Success Metrics

**Adoption:**
- Track downloads per distribution channel
- Monitor installation method preferences
- Measure time-to-install for each method

**Maintenance:**
- Automation success rate (% releases fully automated)
- Time spent on manual updates
- Community contributions to package managers

**User Experience:**
- Installation success rate
- Time-to-first-success (install → `lean-spec --version`)
- Support requests related to installation

### Future Enhancements

**Code Signing:**
- macOS: Apple Developer ID + notarization
- Windows: Authenticode certificate
- Cost: ~$300-500/year

**Auto-Update in Binary:**
- Built-in update checker
- `lean-spec update` command
- Detect installation method and update accordingly

**Desktop App Distribution:**
- Homebrew Cask
- winget (desktop app manifest)
- macOS App Store
- Microsoft Store

**Additional Platforms:**
- apt/snap/flatpak (if demand exists)
- Community package managers (AUR, nixpkgs, etc.)
- Docker images for server deployments

### References

**Package Manager Docs:**
- [Homebrew Formula Cookbook](https://docs.brew.sh/Formula-Cookbook)
- [winget Manifest Schema](https://github.com/microsoft/winget-pkgs)
- [Scoop Manifests](https://github.com/ScoopInstaller/Scoop/wiki/App-Manifests)

**Similar Projects:**
- [Deno Install](https://deno.land/manual/getting_started/installation)
- [Bun Install](https://bun.sh/docs/installation)
- [rustup](https://rustup.rs/)
- [Zig Install](https://ziglang.org/download/)

**Automation Examples:**
- [esbuild Homebrew](https://github.com/evanw/esbuild/blob/master/npm/esbuild/install.js)
- [Tauri winget](https://github.com/tauri-apps/tauri/tree/dev/tooling/cli/node)
- [Deno Install Script](https://github.com/denoland/deno_install)