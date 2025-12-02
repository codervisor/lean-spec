---
status: complete
created: '2025-11-01'
tags: []
priority: medium
completed: '2025-11-01'
---

# Migrate CLI to Commander.js Framework

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-01

## Overview

Replace manual argument parsing with Commander.js to improve maintainability, type safety, and developer experience as CLI grows in complexity.

### Current Pain Points
- Manual argument parsing (~220 LOC in cli.ts)
- Repetitive flag handling (`--flag=value` vs `--flag value`)
- No automatic help generation
- Error-prone option validation
- Difficult to add new commands

### Goals
- Reduce cli.ts from ~220 to ~60 lines
- Type-safe command options
- Auto-generated help text
- Better error messages
- Foundation for future CLI growth

## Design

### Framework Choice: Commander.js

**Why Commander.js:**
- Industry standard (30k+ stars, used by npm, webpack-cli)
- Excellent TypeScript support with `@types/commander`
- Minimal learning curve
- Declarative API matches our needs
- Well-maintained, stable API

**Alternatives Considered:**
- `cliffy`: More modern but less ecosystem support
- `yargs`: More verbose, overkill for our use case
- `ts-command-line`: Too enterprise-focused
- `cac`: Too minimal, lacks features we'll need

### Architecture Changes

```
Before:
src/cli.ts (220 lines)
├── Manual parseArgs
├── Switch statement routing
└── Manual flag parsing loops

After:
src/cli.ts (~60 lines)
├── Commander program setup
├── Command definitions (declarative)
└── Import command handlers

src/commands/*.ts (unchanged)
└── Same action functions
```

### Migration Strategy
1. **Additive approach**: Install Commander alongside existing code
2. **Command-by-command**: Migrate one command, verify, repeat
3. **Backward compatible**: Maintain same CLI interface
4. **Test coverage**: Verify existing integration tests pass

## Plan

### Phase 1: Setup (30 min)
- [x] Create migration spec
- [ ] Install `commander` package
- [ ] Create `src/cli-new.ts` prototype
- [ ] Migrate `create` command (simplest)

### Phase 2: Core Commands (2 hours)
- [ ] Migrate `list` command with filters
- [ ] Migrate `update` command
- [ ] Migrate `archive` command
- [ ] Migrate `init` command (most complex)
- [ ] Migrate `templates` command

### Phase 3: New Commands (1 hour)
- [ ] Add `board` command to CLI
- [ ] Add `gantt` command to CLI
- [ ] Add `stats` command to CLI
- [ ] Add `search` command to CLI
- [ ] Add `timeline` command to CLI
- [ ] Add `deps` command to CLI

### Phase 4: Cutover (30 min)
- [ ] Replace `src/cli.ts` with new implementation
- [ ] Update `bin/lspec.js` if needed
- [ ] Run integration tests
- [ ] Update README with new examples

## Test

### Integration Tests
- [ ] `lean-spec create test-spec` works
- [ ] `lean-spec create test-spec --title "Custom"` works
- [ ] `lean-spec list` displays all specs
- [ ] `lean-spec list --status=in-progress` filters correctly
- [ ] `lean-spec list --tag=api --tag=feature` handles multiple tags
- [ ] `lean-spec update <path> --status=complete` updates frontmatter
- [ ] `lean-spec archive <path>` moves to archived/
- [ ] `lean-spec init` prompts and creates structure
- [ ] `lean-spec templates` lists available templates
- [ ] `lean-spec --help` shows all commands
- [ ] `lean-spec create --help` shows command-specific help
- [ ] Error messages are clear for invalid commands

### New Commands
- [ ] `lean-spec board` displays kanban view
- [ ] `lean-spec board --tag=api` filters correctly
- [ ] `lean-spec gantt` displays timeline
- [ ] `lean-spec stats` shows metrics

### Edge Cases
- [ ] Unknown command shows helpful error
- [ ] Missing required args show usage
- [ ] Invalid flag values show validation errors

## Notes

### Implementation Details

**Key Commander.js Patterns:**
```typescript
// Variadic options (multiple values)
.option('--tag <tag...>', 'Filter by tags')

// Optional options
.option('--title <title>', 'Custom title')

// Boolean flags
.option('--archived', 'Include archived')

// Type conversion
.option('--weeks <n>', 'Number of weeks', parseInt)
```

**Action Handler Pattern:**
```typescript
program
  .command('list')
  .option('--status <status>', 'Filter by status')
  .action(async (options) => {
    await listSpecs(options); // Direct pass-through
  });
```

### Code Size Comparison
- Current: ~220 lines of parsing logic
- Expected: ~60 lines of Commander setup
- **Reduction: ~73%**

### Dependencies
- Add: `commander` (~100KB, 0 deps)
- Keep: All existing deps (chalk, inquirer, etc.)

### Breaking Changes
**None expected** - CLI interface remains identical

### Future Opportunities
- Command aliases (`lean-spec ls` → `list`)
- Shell completion scripts
- Command grouping for help text
- Plugin system for custom commands
