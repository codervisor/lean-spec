---
status: planned
created: '2025-11-04'
tags:
  - cli
  - ux
  - breaking-change
  - simplification
priority: high
---

# Simplify Viewer Command Interface

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-04

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
lspec <spec>              # Default: formatted view (current "show")
lspec <spec> --raw        # Raw markdown (current "read")  
lspec <spec> --json       # JSON output (current "read --format=json")
lspec <spec> --edit       # Open in editor (current "open")
```

**Benefits:**
- One obvious way to view a spec
- Flags make the variants clear
- Matches user mental model: "view this spec, optionally with modifications"

**Option B: Keep minimal commands**
```bash
lspec view <spec>         # Formatted (remove "show", keep only "view")
lspec view <spec> --raw   # Raw markdown
lspec view <spec> --json  # JSON output
lspec open <spec>         # Edit (separate action, keep separate)
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
  .description('[DEPRECATED] Use: lspec <spec-path>')
  .action(async (specPath: string) => {
    console.warn(chalk.yellow('⚠️  "lspec show" is deprecated. Use: lspec <spec-path>'));
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

- [ ] Decide between Option A or B (lean toward A for simplicity)
- [ ] Implement new interface
- [ ] Add deprecation warnings to old commands
- [ ] Update all test files to use new commands
- [ ] Update README examples
- [ ] Update docs site
- [ ] Add migration guide to CHANGELOG
- [ ] Update AGENTS.md with new commands
- [ ] Test with real workflows

## Test

- [ ] `lspec <spec>` displays formatted spec
- [ ] `lspec <spec> --raw` outputs raw markdown (pipeable)
- [ ] `lspec <spec> --json` outputs valid JSON
- [ ] `lspec <spec> --edit` opens in editor
- [ ] Old commands show deprecation warnings
- [ ] Old commands still work (backward compat during migration)
- [ ] Help text is clear and unambiguous
- [ ] Error messages guide users to correct command

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
- Natural evolution: `lspec list` → `lspec <spec>` (browse → view)

**Backward compatibility:**
- Deprecated commands in 0.2.x (with warnings)
- Removed in 1.0.0
- Clear migration path in docs
