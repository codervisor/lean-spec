# @leanspec/ui Package - Implementation Notes

## Current Status

The `@leanspec/ui` package structure has been created with:
- ✅ `bin/ui.js` - CLI wrapper script with argument parsing
- ✅ `package.json` - Package configuration
- ✅ `README.md` - User documentation

## Architecture Decision

The original spec proposed creating `@leanspec/ui` as a thin wrapper that delegates to `@leanspec/web`. However, there's a dependency issue:

**Problem**: `@leanspec/web` is marked as `private: true` and cannot be published to npm.

## Options for Publishing

### Option A: Make @leanspec/web Public (Simplest)

1. Remove `private: true` from `packages/web/package.json`
2. Publish both `@leanspec/web` and `@leanspec/ui` to npm
3. `@leanspec/ui` depends on `@leanspec/web` and wraps it with CLI

**Pros:**
- Simple, clean separation
- @leanspec/web could be used by other tools
- Small @leanspec/ui package (~100KB)

**Cons:**
- @leanspec/web is large (~25MB with Next.js)
- Users would install two packages via npm

### Option B: Bundle Everything in @leanspec/ui (Current Approach)

1. Don't publish @leanspec/web separately
2. Copy/bundle all web files into @leanspec/ui package
3. @leanspec/ui contains everything needed

**Pros:**
- Single package to install
- Clear entry point for users

**Cons:**
- Large package size (~25MB)
- Duplicates @leanspec/web code
- More complex build process

### Option C: Create Standalone Next.js Build

Use Next.js standalone output to create a self-contained build:

1. Configure `next.config.ts` with `output: 'standalone'`
2. Build creates minimal server bundle
3. Bundle in @leanspec/ui package

**Pros:**
- Smaller package (~10-15MB vs 25MB)
- Self-contained, no external dependencies
- Faster startup

**Cons:**
- More complex build process
- Requires Next.js standalone config
- Need to maintain separate build pipeline

## Recommendation

For v0.3 (current release), I recommend **Option A** (make @leanspec/web public):

1. Simple to implement (just remove `private: true`)
2. Clean architecture matches spec intent
3. Both packages can version independently
4. Easy to test and maintain

For future optimization (v0.4+), consider **Option C** (standalone build) to reduce package size.

## What Remains for Publishing

To complete the @leanspec/ui package:

### Before Publishing:

1. **Make @leanspec/web public**:
   - Remove `private: true` from `packages/web/package.json`
   - Test that it can be published
   
2. **Test the full flow**:
   - Install @leanspec/ui in a test project
   - Verify it can find and run @leanspec/web
   - Test all CLI arguments work correctly
   - Verify browser opens automatically
   
3. **Update pnpm workspace config**:
   - Add `packages/ui` to pnpm-workspace.yaml
   - Run `pnpm install` to link packages
   
4. **CI/CD updates**:
   - Add @leanspec/ui to the publishing workflow
   - Ensure both packages publish together

### Testing Checklist:

- [ ] `npx @leanspec/ui` works in external project
- [ ] Auto-detects specs directory correctly
- [ ] Works with custom `--specs` directory
- [ ] Opens browser to correct URL
- [ ] Environment variables set correctly (SPECS_MODE, SPECS_DIR)
- [ ] Filesystem mode reads specs correctly
- [ ] Cache updates work (realtime within 60s)
- [ ] Graceful shutdown on Ctrl+C
- [ ] Clear error messages for common issues

## Current Implementation

The CLI command (`lean-spec ui`) now successfully:
- ✅ Detects if running in monorepo (uses local dev mode)
- ✅ Delegates to `npx @leanspec/ui` for external projects
- ✅ Provides helpful error messages when package not found
- ✅ Supports all command-line options (--specs, --port, --no-open)
- ✅ Includes comprehensive tests

The `@leanspec/ui` package structure is ready but:
- ⚠️ Cannot be published yet (needs @leanspec/web to be public)
- ⚠️ Needs workspace integration
- ⚠️ Needs end-to-end testing
