# Publishing Releases

**Publish both CLI and UI packages to npm with synchronized versions:**

## Publishing Dev Versions

For testing and preview releases, you can publish dev versions that don't affect the stable `latest` tag:

### Manual Dev Release

1. **Update versions to prerelease format** (e.g., `0.2.5-dev.0`):
   ```bash
   # Update version in packages/cli/package.json, packages/ui/package.json, packages/mcp/package.json
   ```

2. **Build and publish with dev tag**:
   ```bash
   pnpm build
   cd packages/cli && npm publish --tag dev --access public
   cd ../ui && npm publish --tag dev --access public
   cd ../mcp && npm publish --tag dev --access public
   ```

3. **Users install dev versions**:
   ```bash
   npm install -g lean-spec@dev
   npm install @leanspec/ui@dev
   ```

### Automated Dev Release

Push to `main` or `develop` branch, or trigger the workflow manually to automatically publish dev versions:

```bash
# Make your changes and commit
git push origin main  # or develop
```

The `.github/workflows/publish-dev.yml` workflow will automatically:
- **Auto-bump version** to timestamp-based prerelease (e.g., `0.2.4-dev.20251118123045`)
- Run type checks and build
- Publish all packages with the `dev` tag
- Keep the `latest` tag unchanged for stable users

**Note**: Versions are auto-generated based on the current base version + timestamp, so you don't need to manually update package.json files for dev releases.

## Release Checklist

⚠️ **CRITICAL**: All steps must be completed in order. Do NOT skip steps.

1. **Version bump**: Update version in all package.json files (root, cli, core, ui, mcp) for consistency
2. **Update CHANGELOG.md**: Add release notes with date and version
3. **Type check**: Run `pnpm typecheck` to catch type errors (REQUIRED before release)
4. **Test**: Run `pnpm test:run` to ensure tests pass (web DB tests may fail - that's OK)
5. **Build**: Run `pnpm build` to build all packages
6. **Validate**: Run `node bin/lean-spec.js validate` and `cd docs-site && npm run build` to ensure everything works
7. **Commit & Tag**: 
   ```bash
   git add -A && git commit -m "feat: release version X.Y.Z with [brief description]"
   git tag -a vX.Y.Z -m "Release vX.Y.Z: [title]"
   git push origin vX.Y.Z
   ```
8. **Prepare for publish**: Run `pnpm prepare-publish` to replace `workspace:*` with actual versions
   - ⚠️ **CRITICAL**: This step prevents `workspace:*` from leaking into npm packages
   - Creates backups of original package.json files
   - Replaces all `workspace:*` dependencies with actual versions
9. **Publish to npm**: For each package (core, cli, mcp, ui):
   ```bash
   cd packages/core && npm publish --access public
   cd ../cli && npm publish --access public
   cd ../mcp && npm publish --access public
   cd ../ui && npm publish --access public
   ```
   - If a package version already exists (403 error), that's OK - skip it
   - Tag UI as latest if needed: `npm dist-tag add @leanspec/ui@X.Y.Z latest`
10. **Restore packages**: Run `pnpm restore-packages` to restore original package.json files with `workspace:*`
11. **Create GitHub Release** (REQUIRED - DO NOT SKIP):
   ```bash
   # Create release notes file with formatted content
   cat > /tmp/release-notes.md << 'EOF'
   ## Release vX.Y.Z - YYYY-MM-DD
   
   ### 🎉 Major Changes
   [List major features/changes]
   
   ### 🐛 Bug Fixes
   [List bug fixes]
   
   ### ✨ Enhancements
   [List enhancements]
   
   ### 📦 Published Packages
   - `@leanspec/core@X.Y.Z`
   - `lean-spec@X.Y.Z`
   - `@leanspec/mcp@X.Y.Z`
   - `@leanspec/ui@X.Y.Z`
   
   ### 🔗 Links
   - [npm: lean-spec](https://www.npmjs.com/package/lean-spec)
   - [Documentation](https://lean-spec.dev)
   - [Full Changelog](https://github.com/codervisor/lean-spec/blob/main/CHANGELOG.md)
   EOF
   
   # Create the release
   gh release create vX.Y.Z --title "Release vX.Y.Z: [Title]" --notes-file /tmp/release-notes.md
   ```
   - ⚠️ **This step is MANDATORY** - GitHub releases are the official release announcement
   - Users discover new versions through GitHub releases
   - Release notes provide context that CHANGELOG.md alone doesn't
12. **Verify**: 
   - `npm view lean-spec version` to confirm CLI publication
   - `npm view @leanspec/ui version` to confirm UI publication
   - `npm view @leanspec/mcp version` to confirm MCP publication
   - `npm view lean-spec dependencies` to ensure no `workspace:*` dependencies leaked
   - `npm view @leanspec/ui dependencies` to ensure no `workspace:*` dependencies leaked
   - Test installation: `npm install -g lean-spec@latest` in a clean environment
   - **Check GitHub release page**: https://github.com/codervisor/lean-spec/releases
   - Verify release appears with correct title and notes

## Critical - Workspace Dependencies

- The `@leanspec/core` package MUST NOT be in `packages/cli/package.json` dependencies
- tsup config has `noExternal: ['@leanspec/core']` which bundles the core package
- NEVER add `@leanspec/core` back to dependencies - it will cause `workspace:*` errors
- If you see `workspace:*` in published dependencies, the package is broken and must be republished

## Package Publication Notes

**Important**: 
- Do NOT publish `@leanspec/core` or `@leanspec/web` - they are internal packages
- The `@leanspec/ui` package IS published to npm as a public scoped package
- Both `lean-spec` (CLI) and `@leanspec/ui` are published automatically via GitHub Actions when a release is created
