---
status: archived
created: '2025-11-04'
tags:
  - cli
  - ux
  - breaking-change
  - simplification
priority: high
completed: '2025-11-04'
created_at: '2025-11-11T04:26:08.824Z'
updated_at: '2025-11-11T04:26:08.824Z'
transitions:
  - status: archived
    at: '2025-11-11T04:26:08.824Z'
---

# Simplify Viewer Command Interface

> **Status**: 📦 Archived · **Priority**: High · **Created**: 2025-11-04 · **Tags**: cli, ux, breaking-change, simplification

**Project**: lean-spec  
**Team**: Core Development

## Overview

We currently have 4 commands for viewing specs: `show`, `view`, `read`, and `open`. This causes confusion:
- **`show` vs `view`**: Identical - `view` just calls `show`. Pure redundancy.
- **`show` vs `read`**: Confusing names - people expect to "read" a spec, not "show" it
- **`read`**: Named for scripting use case, but the name suggests human consumption

**User confusion:**
- "I want to read a spec - do I use `show`, `view`, or `read`?"
- "Why are there three commands that all display spec content?"
- "`read` sounds like what I want, but it gives me raw markdown?"

This violates LeanSpec's principle of clarity over convention.

## Design

### Proposed Interface

**Option A: Single command with flags (Recommended)**
```bash
lean-spec <spec>              # Default: formatted view (current "show")
lean-spec <spec> --raw        # Raw markdown (current "read")  
lean-spec <spec> --json       # JSON output (current "read --format=json")
lean-spec <spec> --edit       # Open in editor (current "open")
```

**Benefits:**
- One obvious way to view a spec
- Flags make the variants clear
- Matches user mental model: "view this spec, optionally with modifications"

**Option B: Keep minimal commands**
```bash
lean-spec view <spec>         # Formatted (remove "show", keep only "view")
lean-spec view <spec> --raw   # Raw markdown
lean-spec view <spec> --json  # JSON output
lean-spec open <spec>         # Edit (separate action, keep separate)
```

**Benefits:**
- More explicit than positional arg
- `view` vs `open` clearly distinguishes reading vs editing
- Familiar CLI pattern (verb + noun)

### Migration Strategy

**Phase 1: Add new interface (non-breaking)**
- Implement chosen option
- Keep old commands as deprecated aliases
- Show deprecation warnings

**Phase 2: Documentation update**
- Update all docs to show new commands
- Add migration guide
- Announce in changelog

**Phase 3: Remove old commands (breaking)**
- Remove in next major version
- Clear error messages pointing to new commands

### Implementation

**Option A Implementation:**
```typescript
// Make spec-path optional, make it the default command
program
  .argument('[spec-path]', 'Spec to view')
  .option('--raw', 'Output raw markdown (for piping/scripting)')
  .option('--json', 'Output as JSON')
  .option('--edit', 'Open in editor')
  .option('--no-color', 'Disable colors')
  .action(async (specPath?: string, options) => {
    if (!specPath) {
      // No spec provided - show help or list
      program.help();
      return;
    }
    
    if (options.edit) {
      await openCommand(specPath, options);
    } else if (options.raw) {
      await readCommand(specPath, { format: 'markdown' });
    } else if (options.json) {
      await readCommand(specPath, { format: 'json' });
    } else {
      await showCommand(specPath, options);
    }
  });

// Deprecated commands with warnings
program
  .command('show <spec-path>')
  .description('[DEPRECATED] Use: lean-spec <spec-path>')
  .action(async (specPath: string) => {
    console.warn(chalk.yellow('⚠️  "lean-spec show" is deprecated. Use: lean-spec <spec-path>'));
    await showCommand(specPath);
  });
```

**Option B Implementation:**
```typescript
program
  .command('view <spec-path>')
  .description('View spec content')
  .option('--raw', 'Output raw markdown')
  .option('--json', 'Output as JSON')
  .option('--no-color', 'Disable colors')
  .action(async (specPath: string, options) => {
    if (options.json) {
      await readCommand(specPath, { format: 'json' });
    } else if (options.raw) {
      await readCommand(specPath, { format: 'markdown' });
    } else {
      await showCommand(specPath, options);
    }
  });

program
  .command('open <spec-path>')
  .description('Open spec in editor')
  .option('--editor <editor>', 'Editor to use')
  .action(async (specPath: string, options) => {
    await openCommand(specPath, options);
  });
```

## Plan

- [x] Decide between Option A or B (chose B for clarity)
- [x] Implement new interface
- [x] Remove deprecated commands completely
- [x] Update README examples
- [x] Update AGENTS.md with new commands
- [x] Update MCP server to align with CLI (lean-spec_read → lean-spec_view with flags)
- [x] Update all tests
- [x] Update docs site CLI reference
- [ ] Add migration guide to CHANGELOG

## Test

- [x] `lean-spec view <spec>` displays formatted spec
- [x] `lean-spec view <spec> --raw` outputs raw markdown (pipeable)
- [x] `lean-spec view <spec> --json` outputs valid JSON
- [x] `lean-spec open <spec>` opens in editor
- [x] Old commands completely removed (breaking change)
- [x] Help text is clear and unambiguous
- [x] Error messages guide users to correct command
- [x] All viewer tests pass (16/16)
- [x] All command integration tests pass (30/30)
- [x] TypeScript compilation succeeds with no errors

## Notes

**Why this matters:**
- Every confusing command erodes trust in LeanSpec's "clarity over documentation" promise
- New users shouldn't have to guess which of 3 similar commands to use
- AI agents get confused by redundant commands too

**Alternatives considered:**
- Keep all commands: No, the confusion is the problem
- Remove `view` and keep `show`: Better, but `show` still isn't intuitive
- Just merge `show`/`view` and keep `read`: Doesn't solve the core naming confusion

**Decision rationale for Option A:**
- Matches `git show`, `docker ps`, etc - where default is formatted, flags modify
- Clearest mental model: "I want to see spec X, optionally in a different format"
- Fewest total commands = least cognitive load
- Natural evolution: `lean-spec list` → `lean-spec <spec>` (browse → view)

**Backward compatibility:**
- ~~Deprecated commands in 0.2.x (with warnings)~~
- **Breaking change**: Removed deprecated commands completely in 0.2.0
- Clear migration path in docs
- Users should update to: `lean-spec view <spec>` (with optional `--raw` or `--json` flags)
