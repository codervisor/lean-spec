---
status: complete
created: 2026-01-15
priority: critical
tags:
- bug
- ci
- npm
- permissions
created_at: 2026-01-15T15:20:22.094660Z
updated_at: 2026-01-16T06:24:48.076181Z
---
# Fix HTTP Platform Package Binary Execute Permissions

## Overview

HTTP platform packages (@leanspec/http-darwin-arm64, etc.) published to npm are missing execute permissions on binaries, causing EACCES errors when users run `npx @leanspec/ui@dev`.

**Root cause:** Platform packages are published without `postinstall.js` scripts that set executable permissions. The CI `copy-platform-binaries.sh` only copies binaries, not the package metadata files.

**Impact:** Users cannot run published packages - must manually `chmod +x` after install.

## Design

### Current Flow (Broken)
```
1. CI builds binaries → uploads as artifacts
2. copy-platform-binaries.sh → copies ONLY binaries
3. publish-platform-packages.ts → publishes incomplete packages
   ❌ Missing: postinstall.js, proper package.json
```

### Fixed Flow
```
1. CI builds binaries → uploads as artifacts  
2. copy-platform-binaries.sh → copies binaries
3. NEW: generate-platform-manifests.ts → creates package.json + postinstall.js
4. publish-platform-packages.ts → publishes complete packages
   ✅ Includes: postinstall.js, complete package.json with files array
```

### Why postinstall.js is Needed

npm strips file permissions from tarballs. The postinstall script runs after `npm install` and sets `chmod 0o755` on the binary.

## Plan

- [x] Analyze root cause (copy-platform-binaries.sh only copies binaries)
- [x] Extract manifest generation logic from copy-rust-binaries.mjs
- [x] Create standalone generate-platform-manifests.ts script
- [x] Update publish workflow to call manifest generation
- [x] Test locally with npm pack
- [ ] Verify in CI with dev publish
- [x] Document in publishing guide

## Test

### Local Testing
```bash
# Build and copy binaries
cd rust && cargo build --release && cd ..
node scripts/copy-rust-binaries.mjs

# Pack and inspect
cd packages/http-server/binaries/darwin-arm64
npm pack
tar -tzf *.tgz  # Should include postinstall.js
tar -xzf *.tgz && cat package/package.json  # Should have postinstall script
```

### CI Testing
```bash
# Trigger dev publish
gh workflow run publish.yml --field dev=true

# Verify published package
npm pack @leanspec/http-darwin-arm64@dev
tar -tzf *.tgz | grep postinstall.js  # Must exist

# Test user experience
npx @leanspec/http-darwin-arm64@dev  # Should not error
```

- [x] Local pack includes postinstall.js
- [ ] CI published package includes postinstall.js
- [x] postinstall script runs on install
- [x] Binary has execute permissions after install
- [x] No manual chmod needed

## Notes

### Alternative Approaches Considered

1. **Set permissions in tarball** - Not possible, npm always strips them
2. **Use bin field** - Doesn't work for optionalDependencies pattern
3. **Shell wrapper** - Adds complexity, postinstall is standard

### Files Changed

- `scripts/generate-platform-manifests.ts` - NEW: Standalone script to generate package.json and postinstall.js for platform packages
- `.github/workflows/publish.yml` - Added manifest generation step before platform package validation
- `specs/217-fix-http-platform-binary-permissions/` - NEW: This spec

### Implementation Details

The `generate-platform-manifests.ts` script:
1. Reads the root package version
2. For each platform + binary combination:
   - Checks if binary exists
   - Generates `package.json` with proper `files` array and `scripts.postinstall`
   - Generates `postinstall.js` that runs `chmod 0o755` on the binary (Unix) or no-op (Windows)
3. Ensures consistent metadata across all platform packages

This runs in CI after binaries are copied but before publishing, ensuring all published packages have the necessary postinstall scripts.