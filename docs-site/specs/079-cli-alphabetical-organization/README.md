---
status: complete
created: '2025-11-13'
tags: []
priority: medium
created_at: '2025-11-13T13:58:57.973Z'
updated_at: '2025-11-13T14:14:29.048Z'
transitions:
  - status: in-progress
    at: '2025-11-13T13:59:02.939Z'
  - status: complete
    at: '2025-11-13T14:14:29.048Z'
completed_at: '2025-11-13T14:14:29.048Z'
completed: '2025-11-13'
---

# CLI Alphabetical Organization

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-13

**Project**: lean-spec  
**Team**: Core Development

## Overview

The `cli.ts` file has grown to **702 lines** with 20+ commands, making it difficult to maintain and locate commands. Commands are registered in implementation order (not alphabetical), and the help text groupings are incomplete.

**Goal**: Refactor CLI architecture to be maintainable at scale with clear organization patterns.

## Problems

1. **Size**: 702 lines in single file
2. **Order**: Commands not alphabetically sorted (hard to find)
3. **Inconsistency**: Help text missing `analyze`, `split`, `compact`, `tokens`
4. **Duplication**: Command logic mixed with registration
5. **Maintainability**: Adding commands requires editing massive file

## Design

### Pattern: Command Definition Files

Move each command's CLI definition to its own command file, following commander.js patterns used by tools like `pnpm`, `turbo`, `nx`:

```
commands/
  archive.ts        - export archiveSpec() AND archiveCommand()
  backfill.ts       - export backfillTimestamps() AND backfillCommand()
  create.ts         - export createSpec() AND createCommand()
  ...
```

Each command file exports TWO things:
1. **Business logic function** (already exists): e.g., `archiveSpec()`
2. **NEW: Command definition function**: e.g., `archiveCommand()` that returns Commander `Command` object

### Architecture

**Before (current)**:
```typescript
// cli.ts (702 lines)
program
  .command('archive <spec>')
  .description('...')
  .action(async (spec) => {
    await archiveSpec(spec);
  });
// ... 20+ more commands
```

**After (proposed)**:
```typescript
// cli.ts (~150 lines)
import { registerCommands } from './commands/registry.js';
const program = new Command();
registerCommands(program);
program.parse();

// commands/registry.ts
export function registerCommands(program: Command) {
  // Alphabetically sorted
  program.addCommand(analyzeCommand());
  program.addCommand(archiveCommand());
  program.addCommand(backfillCommand());
  // ... etc
}

// commands/archive.ts
export function archiveCommand(): Command {
  return new Command('archive')
    .description('Move spec to archived/')
    .argument('<spec>', 'Spec to archive')
    .action(async (spec) => {
      await archiveSpec(spec);
    });
}

export async function archiveSpec(specPath: string) {
  // existing logic
}
```

### Benefits

1. **Alphabetical by default**: Registry enforces order
2. **Single responsibility**: Each file = one command
3. **Easier to add commands**: Create file, export command, add to registry
4. **Testable**: Can test command definitions separately
5. **Smaller files**: ~50 lines per command vs 702-line monolith
6. **Clear structure**: Command definition co-located with logic

### Command Groups in Help

Update help text to use **functional grouping** with complete command list:

```
Command Groups:

  Core Workflow:
    init, create, update, archive, migrate
    
  Discovery & Search:
    list, view, open, search, files
    
  Project Analytics:
    board, stats, timeline, gantt, deps
    
  Quality & Optimization:
    analyze, tokens, validate, check
    
  Advanced Editing:
    split, compact
    
  Configuration:
    templates
    
  Integration:
    mcp (MCP server)
```

## Plan

### Phase 1: Extract Command Definitions
- [ ] Create `commands/registry.ts` with `registerCommands()` function
- [ ] Update each command file (e.g., `archive.ts`) to export command definition function
- [ ] Verify each command still exports business logic for backward compatibility

### Phase 2: Refactor cli.ts
- [ ] Import and call `registerCommands()` in `cli.ts`
- [ ] Remove individual command registrations (keep only program setup + help text)
- [ ] Update help text with complete alphabetical command list
- [ ] Reduce `cli.ts` from 702 to ~150 lines

### Phase 3: Validation
- [ ] Run `pnpm build` - ensure TypeScript compiles
- [ ] Run `node bin/lean-spec.js --help` - verify alphabetical order
- [ ] Test sample commands: `create`, `list`, `view`, `validate`, `tokens`
- [ ] Run existing test suite: `pnpm test:run`
- [ ] Check command count matches (currently 20+ commands)

## Test

**Validation criteria**:
- ✅ Commands appear alphabetically in `--help` output
- ✅ Help text includes ALL commands (analyze, split, compact, tokens)
- ✅ `cli.ts` reduced to <200 lines
- ✅ All existing tests pass
- ✅ No breaking changes to command behavior

**Manual testing**:
```bash
node bin/lean-spec.js --help              # alphabetical order
node bin/lean-spec.js create test-spec    # works
node bin/lean-spec.js tokens 059          # works
node bin/lean-spec.js validate            # works
```

## Notes

### Alternatives Considered

1. **Keep monolithic cli.ts, just alphabetize**: Doesn't solve scalability
2. **Subcommand grouping** (e.g., `lean-spec analytics board`): Breaking change
3. **Plugin architecture**: Over-engineering for current scale

### Migration Safety

- Commands already have separate files in `commands/`
- Business logic stays unchanged
- Only CLI registration moves
- Backward compatible (same command syntax)

### Future Enhancements

- Auto-generate help text from command metadata
- Command aliases (e.g., `ls` → `list`)
- Plugin system for custom commands
