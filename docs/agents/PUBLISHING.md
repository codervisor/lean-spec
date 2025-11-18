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

1. **Version bump**: Update version in all package.json files (root, cli, core, ui, web) for consistency
2. **Update CHANGELOG.md**: Add release notes with date and version
3. **Type check**: Run `pnpm typecheck` to catch type errors (REQUIRED before release)
4. **Test**: Run `pnpm test:run` to ensure tests pass (web DB tests may fail - that's OK)
5. **Build**: Run `pnpm build` to build all packages
6. **Validate**: Run `node bin/lean-spec.js validate` and `cd docs-site && npm run build` to ensure everything works
7. **Prepare for publish**: Run `pnpm prepare-publish` to replace `workspace:*` with actual versions
   - ⚠️ **CRITICAL**: This step prevents `workspace:*` from leaking into npm packages
   - Creates backups of original package.json files
   - Replaces all `workspace:*` dependencies with actual versions
8. **Commit**: `git add -A && git commit -m "chore: bump version to X.Y.Z"`
9. **Tag**: `git tag vX.Y.Z && git push origin main --tags`
10. **GitHub Release**: `gh release create vX.Y.Z --title "vX.Y.Z - Title" --notes "Release notes here"`
   - This triggers the GitHub Action workflow that publishes both `lean-spec` and `@leanspec/ui` to npm
11. **Restore packages**: Run `pnpm restore-packages` to restore original package.json files with `workspace:*`
12. **Verify**: 
   - `npm view lean-spec version` to confirm CLI publication
   - `npm view @leanspec/ui version` to confirm UI publication
   - `npm view lean-spec dependencies` to ensure no `workspace:*` dependencies leaked
   - `npm view @leanspec/ui dependencies` to ensure no `workspace:*` dependencies leaked
   - Test installation: `npm install -g lean-spec@latest` in a clean environment
   - Check GitHub release page: https://github.com/codervisor/lean-spec/releases

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
