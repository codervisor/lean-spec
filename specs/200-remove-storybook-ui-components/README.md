---
status: complete
created: 2026-01-05
priority: medium
tags:
- ui
- refactoring
- simplification
- maintenance
depends_on:
- 185-ui-components-extraction
created_at: 2026-01-05T07:35:59.442762720Z
updated_at: 2026-01-06T15:20:29.629150Z
transitions:
- status: in-progress
  at: 2026-01-05T07:38:58.003950897Z
---
# Remove Storybook from UI Components Package

> **Status**: 🚧 In Progress · **Created**: 2026-01-05

## Overview

The `@leanspec/ui-components` package currently includes Storybook for component documentation and development. This adds significant complexity with minimal value:

- **6+ Storybook devDependencies** (~100MB+ in node_modules)
- **23 story files** that duplicate README documentation
- **Additional configuration** (.storybook/, npm scripts)
- **No CI/CD integration** - Storybook not deployed or used in workflows
- **Redundant documentation** - README.md already has comprehensive usage examples

**Impact**: Removing Storybook will reduce maintenance burden, simplify the package, and speed up installs without losing functionality.

## Evaluation

### ✅ Safe to Remove

1. **No external dependencies**: Only ui-components has Storybook; ui-vite and desktop don't use it
2. **No published artifacts**: Storybook isn't built or deployed anywhere
3. **Comprehensive README**: All components already documented with usage examples
4. **No CI/CD usage**: No workflows reference Storybook commands
5. **Development alternative**: Components can be tested directly in ui-vite during development

### 📊 What We're Removing

**Dependencies** (from package.json devDependencies):
```
@storybook/addon-essentials
@storybook/addon-interactions
@storybook/addon-links
@storybook/react
@storybook/react-vite
@storybook/test
storybook
```

**Files/Directories**:
- `.storybook/` (2 config files)
- `stories/` (23 story files)
- `storybook-static/` (build artifacts)

**Scripts** (from package.json):
- `storybook`
- `build-storybook`

**Documentation references**:
- Makefile storybook target
- scripts.md Storybook commands
- Spec 185 mentions (historical)

### 🎯 Why Now?

With the Rust migration and unified architecture (spec 184), LeanSpec is moving toward simplicity and reduced tooling complexity. Storybook adds overhead that doesn't align with:

1. **Context economy** - Extra tooling = cognitive load
2. **Lean development** - Simpler is better for AI-assisted workflows
3. **Maintenance burden** - One less tool to update and debug

## Plan

### Phase 1: Remove Code
- [x] Remove Storybook devDependencies from package.json
- [x] Remove npm scripts (storybook, build-storybook)
- [x] Delete .storybook/ directory
- [x] Delete stories/ directory
- [x] Delete storybook-static/ directory (if exists)

### Phase 2: Update Documentation
- [x] Remove Storybook references from README.md
- [x] Update Makefile (remove storybook target)
- [x] Update scripts.md (remove Storybook commands)
- [x] Verify README has sufficient component documentation

### Phase 3: Cleanup
- [x] Run `pnpm install` to update lockfile
- [ ] Verify builds still work: `pnpm build` *(fails in @leanspec/ui-vite tailwind.config.js:52 - requires CJS require in ESM)*
- [ ] Verify typecheck passes: `pnpm typecheck` *(fails in tests/api headers typing and response.data unknown)*
- [ ] Verify tests pass: `pnpm test`
- [x] Update turbo.json if needed

## Component Documentation Strategy

**Before**: Storybook stories + README
**After**: README only (already comprehensive)

The README.md includes:
- Installation instructions
- Usage examples for all components
- Component API documentation
- Integration examples with ui-vite

**For development**: Test components in ui-vite's actual UI during feature work. This provides:
- Real-world usage context
- Integration testing with actual data
- Faster feedback loop (no separate Storybook server)

## Success Criteria

- [x] All Storybook code/config removed
- [x] package.json has no Storybook dependencies
- [ ] Build, typecheck, and tests pass
- [x] README.md remains comprehensive
- [x] No broken references in docs/scripts
- [ ] Reduced package install time (verify with `time pnpm install`)

## Notes

**Historical Context**: Storybook was added in spec 185 (UI Components Extraction) as standard practice for component libraries. However, for LeanSpec's internal components:

- **Not a public component library** - Only used within LeanSpec ecosystem
- **Active development** - Components tested in ui-vite constantly
- **AI-first development** - README examples more useful for AI agents than interactive Storybook

**Alternative Considered**: Keep Storybook for visual regression testing
**Decision**: Not needed - UI components are simple, well-typed, and tested in ui-vite's E2E tests

**Current Risks/Follow-ups**:
- `pnpm build` fails in `packages/ui-vite/tailwind.config.js` because `require` is used under ESM (Node 22)
- `pnpm typecheck` fails in `tests/api` due to `Headers` being non-iterable for `Object.fromEntries` and `response.data` typed as `unknown`

**Related Specs**:
- Spec 184: UI Packages Consolidation (consolidation strategy)
- Spec 185: UI Components Extraction (where Storybook was added)
- Spec 187: Vite SPA Migration (primary consumer of ui-components)
