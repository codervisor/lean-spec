---
status: planned
created: 2025-11-01
tags: [refactoring, architecture, maintenance]
priority: medium
related: [20251101/006-cli-ux-enhancement]
---

# Commands Module Refactoring

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-01 · **Tags**: refactoring, architecture, maintenance

## Overview

The `src/commands.ts` file has grown to **648 lines** and contains multiple distinct responsibilities. As the CLI grows with more commands (board, stats, search, deps, timeline, gantt), maintaining a single large file becomes increasingly difficult. This refactor will split commands into focused modules for better maintainability and testability.

### Current State
- Single `commands.ts` file with 648 lines
- 6 exported command functions: `createSpec`, `archiveSpec`, `listSpecs`, `updateSpec`, `initProject`, `listTemplates`
- Additional commands already in `src/commands/` directory: `board`, `stats`, `search`, `deps`, `timeline`, `gantt`
- Mixed helper functions and utilities
- Complex init logic (~200 LOC) with template handling

### Problems
1. **Poor organization**: Core commands mixed with helpers and utilities
2. **Hard to test**: Large file makes unit testing difficult
3. **Inconsistent structure**: Some commands in `commands/`, others in `commands.ts`
4. **Difficult navigation**: Finding specific functionality requires scrolling
5. **Merge conflicts**: Multiple developers editing the same large file

## Design

### Target Architecture

```
src/commands/
├── create.ts         # createSpec (spec creation)
├── archive.ts        # archiveSpec (spec archiving)
├── list.ts           # listSpecs (spec listing)
├── update.ts         # updateSpec (metadata updates)
├── init.ts           # initProject (project initialization)
├── templates.ts      # listTemplates (template management)
├── board.ts          # ✅ Already exists
├── stats.ts          # ✅ Already exists
├── search.ts         # ✅ Already exists
├── deps.ts           # ✅ Already exists
├── timeline.ts       # ✅ Already exists
└── gantt.ts          # ✅ Already exists
```

### Shared Utilities

Helper functions should be moved to appropriate utility modules:

```
src/utils/
├── ui.ts             # ✅ Already exists (spinners, colors)
├── spec-helpers.ts   # Spec-related helpers (getSpecFile, etc.)
└── path-helpers.ts   # Path resolution utilities
```

### Principles

1. **One command per file**: Each command gets its own module
2. **Single responsibility**: Each file has one clear purpose
3. **Consistent exports**: Export one main async function per command file
4. **Shared utilities**: Common helpers in `utils/` directory
5. **Type safety**: Maintain strong TypeScript types throughout
6. **Backwards compatibility**: CLI interface remains unchanged

## Plan

### Phase 1: Identify and Extract Helpers
- [ ] Audit all helper functions in `commands.ts`
- [ ] Create `src/utils/spec-helpers.ts` for spec-related utilities
  - `getSpecFile()`
  - `getStatusEmoji()`
  - `getPriorityLabel()`
- [ ] Create `src/utils/path-helpers.ts` for path resolution
  - Path resolution logic from `updateSpec`
  - Spec path normalization
- [ ] Create `src/utils/template-helpers.ts` for template utilities
  - `detectExistingSystemPrompts()`
  - `handleExistingFiles()`
  - Template variable replacement

### Phase 2: Extract Simple Commands
- [ ] Move `createSpec` → `src/commands/create.ts`
- [ ] Move `archiveSpec` → `src/commands/archive.ts`
- [ ] Move `listSpecs` → `src/commands/list.ts`
- [ ] Move `updateSpec` → `src/commands/update.ts`

### Phase 3: Extract Complex Commands
- [ ] Move `listTemplates` → `src/commands/templates.ts`
- [ ] Move `initProject` → `src/commands/init.ts` (largest, ~200 LOC)

### Phase 4: Update Imports and CLI
- [ ] Update `src/cli.ts` to import from new command modules
- [ ] Create barrel export `src/commands/index.ts` for convenience
- [ ] Remove old `commands.ts` file
- [ ] Update any other files importing from `commands.ts`

### Phase 5: Testing and Verification
- [ ] Run full build: `pnpm build`
- [ ] Test all commands: `create`, `archive`, `list`, `update`, `init`, `templates`
- [ ] Test visualization commands: `board`, `stats`, `search`, `deps`
- [ ] Verify no functionality regressions
- [ ] Check bundle size hasn't increased significantly

## Test

### Verification Checklist

**Core Commands:**
- [ ] `lspec create test-spec` - Creates new spec
- [ ] `lspec list` - Lists all specs correctly
- [ ] `lspec update test-spec --status complete` - Updates spec metadata
- [ ] `lspec archive test-spec` - Archives spec

**Init & Templates:**
- [ ] `lspec init` - Interactive project initialization
- [ ] `lspec templates` - Lists available templates
- [ ] `lspec init --template minimal` - Non-interactive init

**Visualization Commands:**
- [ ] `lspec board` - Displays kanban board
- [ ] `lspec stats` - Shows statistics
- [ ] `lspec search "keyword"` - Searches specs
- [ ] `lspec deps spec-path` - Shows dependencies

**Build & Performance:**
- [ ] Build completes in <1 second
- [ ] No TypeScript errors
- [ ] Bundle size similar to before (~56KB)
- [ ] All command executions < 500ms

## Implementation Notes

### File Size Targets
- Each command file: 50-150 lines
- Helper utilities: 50-100 lines each
- Total LOC remains similar, but better organized

### Import Structure
```typescript
// Before
import { createSpec, listSpecs, updateSpec } from './commands.js';

// After (with barrel export)
import { createSpec, listSpecs, updateSpec } from './commands/index.js';

// Or individual imports
import { createSpec } from './commands/create.js';
```

### Migration Strategy
- Extract one command at a time
- Test after each extraction
- Keep `commands.ts` until all extractions complete
- Final step: remove `commands.ts` and update imports

## Benefits

1. **Maintainability**: Easier to locate and modify specific commands
2. **Testability**: Smaller, focused modules are easier to unit test
3. **Collaboration**: Reduced merge conflicts when multiple devs work on commands
4. **Discoverability**: Clear file structure makes codebase navigation easier
5. **Consistency**: All commands follow the same structural pattern
6. **Scalability**: Easy to add new commands without bloating a single file

## Risks & Mitigation

- **Risk**: Breaking existing imports
  - *Mitigation*: Barrel export provides backwards compatibility transition
  
- **Risk**: Increased bundle size from more modules
  - *Mitigation*: Tree-shaking and bundler optimization handle this

- **Risk**: Circular dependencies
  - *Mitigation*: Careful separation of concerns, utilities in separate directory

## Success Metrics

- ✅ No file in `src/commands/` exceeds 200 lines
- ✅ All commands have consistent structure
- ✅ Build time remains < 1 second
- ✅ All tests pass
- ✅ No functionality regressions
- ✅ Team feedback: "Easier to navigate and maintain"
