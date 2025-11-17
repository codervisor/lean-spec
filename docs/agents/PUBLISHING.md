# Publishing Releases

**Publish both CLI and UI packages to npm with synchronized versions:**

## Release Checklist

1. **Version bump**: Update version in all package.json files (root, cli, core, ui, web) for consistency
2. **Update CHANGELOG.md**: Add release notes with date and version
3. **Type check**: Run `pnpm typecheck` to catch type errors (REQUIRED before release)
4. **Test**: Run `pnpm test:run` to ensure tests pass (web DB tests may fail - that's OK)
5. **Build**: Run `pnpm build` to build all packages
6. **Validate**: Run `node bin/lean-spec.js validate` and `cd docs-site && npm run build` to ensure everything works
7. **Commit**: `git add -A && git commit -m "chore: bump version to X.Y.Z"`
8. **Tag**: `git tag vX.Y.Z && git push origin main --tags`
9. **GitHub Release**: `gh release create vX.Y.Z --title "vX.Y.Z - Title" --notes "Release notes here"`
   - This triggers the GitHub Action workflow that publishes both `lean-spec` and `@leanspec/ui` to npm
10. **Verify**: 
   - `npm view lean-spec version` to confirm CLI publication
   - `npm view @leanspec/ui version` to confirm UI publication
   - `npm view lean-spec dependencies` to ensure no `workspace:*` dependencies leaked
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
