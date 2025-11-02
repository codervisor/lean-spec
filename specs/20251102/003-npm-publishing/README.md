---
status: planned
created: 2025-11-02
tags: [release, publishing, distribution]
priority: high
---

# npm-publishing

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-02

## Overview

Publish LeanSpec to npm registry to make it available for global installation and use by external teams. Currently the package is only used locally for dogfooding.

**Why Now:**
- Core features are stable (13 specs completed)
- Test suite is comprehensive (62 tests passing)
- Template system redesign is complete
- No compilation errors
- Ready for external validation and feedback

**What Success Looks Like:**
- Package published to npm as `lean-spec`
- Users can install via `npm install -g lean-spec` or `pnpm add -D lean-spec`
- Semantic versioning established
- Changelog maintained
- Clear upgrade path for future versions

## Design

### 1. Pre-Publishing Checklist

**Package.json Audit:**
- ✅ Name: `lean-spec` (check npm availability)
- ✅ Version: Currently `0.1.0` (appropriate for initial release)
- ✅ Description: Clear and concise
- ✅ Keywords: Good SEO (spec, ai, agent, sdd)
- ✅ License: MIT
- ⚠️ Repository: Add GitHub repo URL
- ⚠️ Homepage: Add project homepage
- ⚠️ Bugs: Add issues URL
- ⚠️ Author: Verify author info
- ✅ Bin: `lspec` command defined

**Build Configuration:**
- ✅ TypeScript compilation working
- ✅ tsup building correctly
- ⚠️ Files field: Specify what to publish (bin/, dist/, templates/)
- ⚠️ .npmignore: Exclude dev files (src/, coverage/, .lspec/, specs/)

**Documentation:**
- ✅ README.md comprehensive
- ⚠️ CHANGELOG.md: Create initial changelog
- ✅ LICENSE: MIT license present
- ✅ CONTRIBUTING.md: Present

### 2. Package Structure

```
lean-spec/
├── bin/              # CLI entry point ✅
│   └── lspec.js
├── dist/             # Compiled JS (tsup output) ✅
│   ├── cli.js
│   ├── commands/
│   └── ...
├── templates/        # Built-in templates ✅
│   ├── minimal/
│   ├── standard/
│   └── enterprise/
├── package.json      # Package metadata ⚠️
├── README.md         # Documentation ✅
├── LICENSE           # MIT license ✅
└── CHANGELOG.md      # Version history ❌
```

**What NOT to publish:**
- `src/` (TypeScript source - only dist/)
- `coverage/` (test coverage reports)
- `.lspec/` (project's own specs)
- `specs/` (development specs)
- `*.test.ts` files
- Development configs (vitest.config.ts, tsconfig.json, etc.)

### 3. Versioning Strategy

Follow semantic versioning (semver):
- `0.1.0` - Initial public release (current)
- `0.x.y` - Pre-1.0 (breaking changes allowed in minor versions)
- `1.0.0` - First stable release (after community feedback)

**Version Milestones:**
- `0.1.0` - Initial release (core features)
- `0.2.0` - Custom frontmatter + variables complete
- `0.3.0` - VS Code extension ready
- `1.0.0` - Production-ready, API stable

### 4. Publishing Process

**Manual Publishing (v1):**
```bash
# 1. Update version
pnpm version patch|minor|major

# 2. Build
pnpm build

# 3. Test build
npm pack --dry-run

# 4. Review package contents
tar -tzf lean-spec-*.tgz

# 5. Publish
npm publish

# 6. Tag release
git tag v0.1.0
git push origin v0.1.0
```

**Automated Publishing (v2 - future):**
- GitHub Actions workflow on tag push
- Automated tests before publish
- Release notes generation

### 5. Post-Publishing Tasks

- [ ] Add npm badge to README
- [ ] Announce on relevant communities (if appropriate)
- [ ] Monitor npm stats
- [ ] Set up GitHub releases
- [ ] Create installation documentation

## Plan

### Phase 1: Package Preparation
- [ ] Check npm name availability: `npm view lean-spec`
- [ ] Update package.json with repository, homepage, bugs URLs
- [ ] Add `files` field to package.json (include dist, bin, templates)
- [ ] Create .npmignore (exclude src, coverage, specs, .lspec)
- [ ] Create CHANGELOG.md with 0.1.0 entry
- [ ] Verify author and license information
- [ ] Test local installation: `npm link`

### Phase 2: Build Verification
- [ ] Clean build: `rm -rf dist && pnpm build`
- [ ] Verify dist/ contains all necessary files
- [ ] Test CLI after build: `node bin/lspec.js --help`
- [ ] Run full test suite: `pnpm test:run`
- [ ] Check for TypeScript errors: `pnpm typecheck`
- [ ] Dry run pack: `npm pack --dry-run`
- [ ] Review package contents: `tar -tzf lean-spec-*.tgz`

### Phase 3: Publishing
- [ ] Create npm account (if needed)
- [ ] Login: `npm login`
- [ ] Publish: `npm publish` (or `npm publish --access public` if scoped)
- [ ] Verify on npm: https://www.npmjs.com/package/lean-spec
- [ ] Test installation: `npm install -g lean-spec`
- [ ] Test CLI works: `lspec --version`

### Phase 4: Git Tagging & Release
- [ ] Tag release: `git tag v0.1.0`
- [ ] Push tag: `git push origin v0.1.0`
- [ ] Create GitHub release with changelog
- [ ] Add release notes (copy from CHANGELOG.md)

### Phase 5: Documentation Updates
- [ ] Add npm installation badge to README
- [ ] Update README with installation instructions
- [ ] Add "Installing from npm" section
- [ ] Document upgrade process
- [ ] Add troubleshooting section

## Test

### Pre-Publishing Tests
- [ ] `npm pack --dry-run` succeeds without errors
- [ ] Package size is reasonable (< 5MB)
- [ ] All necessary files are included in tarball
- [ ] No sensitive files included (.env, .lspec/, specs/)
- [ ] bin/lspec.js has correct shebang: `#!/usr/bin/env node`

### Post-Publishing Tests
- [ ] `npm install -g lean-spec` works
- [ ] `lspec --version` shows correct version
- [ ] `lspec --help` displays help
- [ ] `lspec init` works in fresh directory
- [ ] `lspec create test` creates a spec
- [ ] All commands work after global install
- [ ] Works on macOS, Linux (test in CI)

### Documentation Tests
- [ ] README on npm page renders correctly
- [ ] Installation instructions work
- [ ] Quick start guide works for new users

## Notes

**NPM Scope Considerations:**
- Unscoped: `lean-spec` (requires name availability)
- Scoped: `@codervisor/lean-spec` (guaranteed availability under your org)
- Recommendation: Try unscoped first, fall back to scoped

**Package.json Files Field Example:**
```json
{
  "files": [
    "bin/",
    "dist/",
    "templates/",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ]
}
```

**.npmignore Example:**
```
src/
coverage/
specs/
.lspec/
*.test.ts
vitest.config.ts
tsconfig.json
tsup.config.ts
.git/
.github/
```

**Breaking Changes:**
- None for v0.1.0 (initial release)
- For future versions, document in CHANGELOG.md

**References:**
- npm docs: https://docs.npmjs.com/cli/v10/commands/npm-publish
- Semantic versioning: https://semver.org/
