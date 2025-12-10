# Desktop Build Troubleshooting Guide

Common issues encountered during CI/CD builds and how to fix them.

## Build Failures

### macOS: Xcode Command Line Tools Not Found

**Error:**
```
xcrun: error: unable to find utility "metal", not a developer tool or in PATH
```

**Solution:**
GitHub's macOS runner includes Xcode CLT by default. If missing, add:
```yaml
- name: Install Xcode CLT
  run: xcode-select --install
```

**Prevention:** Use `macos-latest` runner (recommended)

---

### Windows: WiX Toolset Not Installed

**Error:**
```
Error: Failed to find WiX candle.exe
```

**Solution:**
Install WiX before building:
```yaml
- name: Install WiX
  run: dotnet tool install --global wix
```

**Note:** Required for `.msi` generation on Windows

---

### Linux: Missing System Dependencies

**Error:**
```
Package webkit2gtk-4.0 was not found in the pkg-config search path
```

**Solution:**
Install required system packages:
```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.0-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

**Common Missing Packages:**
- `libwebkit2gtk-4.0-dev` - WebView rendering
- `libgtk-3-dev` - GTK3 UI framework
- `libayatana-appindicator3-dev` - System tray support
- `librsvg2-dev` - SVG rendering
- `patchelf` - Binary patching for AppImage

---

### Rust Compilation Errors

**Error:**
```
error: linker `cc` not found
```

**Solution (Linux):**
```yaml
- name: Install build essentials
  run: sudo apt-get install -y build-essential
```

**Solution (Windows):**
Ensure Visual Studio Build Tools are installed (pre-installed on `windows-latest`)

**Solution (macOS):**
Ensure Xcode Command Line Tools are installed (pre-installed on `macos-latest`)

---

## Performance Issues

### Slow Builds (>30 Minutes)

**Symptoms:**
- Builds timeout before completing
- High CPU usage for extended periods

**Solutions:**

**1. Enable Caching:**
```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.cargo/bin/
      ~/.cargo/registry/
      packages/desktop/src-tauri/target/
    key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
```

**2. Reduce Rust Debug Info:**
Add to `packages/desktop/src-tauri/Cargo.toml`:
```toml
[profile.release]
strip = true           # Strip debug symbols
lto = true             # Link-time optimization
codegen-units = 1      # Better optimization
```

**3. Use Incremental Builds:**
```yaml
env:
  CARGO_INCREMENTAL: 1
```

**4. Increase Timeout:**
```yaml
jobs:
  build:
    timeout-minutes: 45  # Increase if needed
```

---

### Cache Misses

**Symptoms:**
- Every build takes the same time
- "Cache not found" in logs

**Solutions:**

**1. Verify Cache Keys:**
Ensure `Cargo.lock` is committed:
```bash
git add packages/desktop/src-tauri/Cargo.lock
git commit -m "Add Cargo.lock for CI caching"
```

**2. Check Cache Restore:**
Add debugging:
```yaml
- name: Cache Rust dependencies
  id: cache-cargo
  uses: actions/cache@v4
  with:
    path: ~/.cargo
    key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

- name: Cache debug
  run: echo "Cache hit: ${{ steps.cache-cargo.outputs.cache-hit }}"
```

**3. Clear Stale Caches:**
Go to: `Actions` → `Caches` → Delete old caches

---

## Artifact Issues

### Artifacts Not Found

**Error:**
```
Error: No files were found with the provided path
```

**Solutions:**

**1. Verify Build Output Path:**
```yaml
- name: List build artifacts
  run: |
    find packages/desktop/src-tauri/target/release/bundle -type f
```

**2. Check Platform-Specific Paths:**
- macOS: `bundle/dmg/*.dmg`
- Windows: `bundle/msi/*.msi`
- Linux AppImage: `bundle/appimage/*.AppImage`
- Linux DEB: `bundle/deb/*.deb`

**3. Ensure Build Succeeds:**
Add error handling:
```yaml
- name: Build desktop app
  run: pnpm build:desktop || exit 1
```

---

### Wrong Artifact Names

**Symptoms:**
- Artifacts named `LeanSpec Desktop_0.1.0_x64.dmg` instead of `leanspec-desktop-macos-x64-0.1.0.dmg`

**Solution:**
Rename artifacts during upload:
```yaml
- name: Rename artifact
  run: |
    OLD_NAME="LeanSpec Desktop_0.1.0_x64.dmg"
    NEW_NAME="leanspec-desktop-macos-x64-0.1.0.dmg"
    mv "$OLD_NAME" "$NEW_NAME"
```

Or configure in `tauri.conf.json`:
```json
{
  "package": {
    "productName": "leanspec-desktop"
  }
}
```

---

## Security & Signing

### macOS: App Not Signed

**Symptoms:**
- "LeanSpec Desktop" is damaged and can't be opened
- Gatekeeper blocks app launch

**Workaround (Testing):**
```bash
# Right-click → Open (first time only)
# Or disable Gatekeeper temporarily:
sudo spctl --master-disable
```

**Permanent Solution (Future):**
Add code signing in CI:
```yaml
- name: Sign macOS app
  env:
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
    APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
  run: |
    # Import certificate
    echo "$APPLE_CERTIFICATE" | base64 --decode > certificate.p12
    security import certificate.p12 -P "$APPLE_CERTIFICATE_PASSWORD"
    
    # Sign app
    codesign --force --sign "Developer ID Application: YourName" \
      "LeanSpec Desktop.app"
    
    # Notarize (requires Apple Developer account)
    xcrun notarytool submit "LeanSpec Desktop.app" --wait
```

**Requirements:**
- Apple Developer Program membership ($99/year)
- Developer ID certificate
- App-specific password for notarization

---

### Windows: SmartScreen Warning

**Symptoms:**
- "Windows protected your PC" warning
- Users can't easily install

**Workaround (Testing):**
Click "More info" → "Run anyway"

**Permanent Solution (Future):**
Add code signing with EV certificate:
```yaml
- name: Sign Windows installer
  run: |
    signtool sign /f certificate.pfx /p ${{ secrets.CERT_PASSWORD }} \
      /tr http://timestamp.digicert.com /td SHA256 \
      leanspec-desktop.msi
```

**Requirements:**
- Code signing certificate (~$300-500/year)
- EV certificate for instant SmartScreen reputation

---

## Debugging Strategies

### Enable Verbose Logging

**Rust Build:**
```yaml
env:
  RUST_LOG: debug
  RUST_BACKTRACE: 1
```

**Tauri Build:**
```yaml
- name: Build with verbose output
  run: pnpm build:desktop --verbose
```

### Run Builds Locally

**Reproduce CI environment:**
```bash
# Install dependencies matching CI
rustc --version  # Should match CI Rust version
node --version   # Should match CI Node version

# Build locally
pnpm install --frozen-lockfile
pnpm build:desktop
```

### Check Workflow Logs

**Access logs:**
1. Go to Actions tab
2. Click on failed workflow run
3. Expand build job
4. Review step logs

**Download logs:**
Click "Download log archive" for offline inspection

---

## Common Errors & Quick Fixes

| Error | Quick Fix |
|-------|-----------|
| `pnpm: command not found` | Add `uses: pnpm/action-setup@v4` |
| `cargo: command not found` | Add `uses: dtolnay/rust-toolchain@stable` |
| `Permission denied` (Linux) | Add `chmod +x` before running |
| `Disk space full` | Clean up before build: `df -h` |
| `Timeout after 30m` | Increase `timeout-minutes: 45` |
| `Artifact upload failed` | Check file path with `ls -la` |
| `Matrix builds fail` | Set `fail-fast: false` |

---

## Getting Help

**Before asking for help:**
1. ✅ Check this troubleshooting guide
2. ✅ Review workflow logs (Actions tab)
3. ✅ Try reproducing locally
4. ✅ Search GitHub Issues

**Where to get help:**
- GitHub Issues: [codervisor/lean-spec/issues](https://github.com/codervisor/lean-spec/issues)
- Tauri Discord: [discord.gg/tauri](https://discord.gg/tauri)
- GitHub Actions Community: [community.github.com](https://github.com/orgs/community/discussions)

**Provide this info:**
- Operating system and version
- Workflow run URL
- Relevant error messages
- Steps to reproduce
