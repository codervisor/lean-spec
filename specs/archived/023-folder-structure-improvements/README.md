---
status: complete
created: 2025-11-03
tags: [core, ux, multi-user]
priority: high
updated: 2025-11-03
---

# Folder Structure: Polish & Multi-User Support

> Polish the flexible folder structure implementation and add simple conflict warnings for multi-user workflows

## Status Update (2025-11-03)

✅ **Critical items completed:**
- Date prefix default implementation
- `lean-spec check` command with conflict detection
- Auto-check integration across all spec-reading commands

📋 **Minor polish issues tracked separately:**
- [005-pattern-aware-list-grouping](../005-pattern-aware-list-grouping/) - Fix list.ts date grouping
- [006-template-config-updates](../006-template-config-updates/) - Update template configs
- [012-init-pattern-selection](../012-init-pattern-selection/) - Add pattern selection to init wizard

This spec focused on solving the critical multi-user conflict issue. The minor polish items are now tracked individually for cleaner organization and focused work.

## Problem

The flexible folder structure (spec 001) is complete and working, but has issues affecting UX and multi-user workflows:

### 🚨 Critical: Sequence Conflicts in Multi-User Workflows

**Current behavior:**
```bash
# User A and User B work on same repo
User A: lean-spec create feature-a  # Gets 001-feature-a
User B: lean-spec create feature-b  # Also gets 001-feature-b (locally)

# Both push to git → merge conflict!
```

**Root cause:** `getGlobalNextSeq()` scans local filesystem only, so two users on different branches get same sequence number.

### ⚠️ Minor Polish Issues

1. **`list.ts` hardcoded date grouping** - Doesn't adapt to flat or custom patterns
2. **Template configs use legacy format** - Works but inconsistent
3. **No pattern selection in `lean-spec init`** - Must manually edit config

## Proposal

Keep it **lean and simple**: Focus on prevention with good defaults + basic conflict detection.

### 1. Use Date Prefix by Default (Prevention)

Make `prefix: "{YYYYMMDD}-"` the default for flat pattern:

```bash
# Result:
# User A on Nov 3: 20251103-001-feature-a
# User B on Nov 3: 20251103-002-feature-b  # Different sequence
# User A on Nov 4: 20251104-003-feature-c  # Different date
```

**Benefits:**
- ✅ Prevents conflicts naturally (date + sequence)
- ✅ Already implemented, just change default
- ✅ Chronological sorting automatic
- ✅ No extra complexity

**Trade-off:**
- Longer folder names (but clearer)

### 2. Add Simple Conflict Warning

Add `lean-spec check` command that warns about duplicate sequences:

```bash
$ lean-spec check
⚠️  Sequence conflicts detected:
   Sequence 001:
     - specs/001-feature-a/
     - specs/001-feature-b/

Fix manually or use date prefix to prevent conflicts.
```

**Auto-check on relevant commands:**

Commands that **should** auto-check (interact with specs):
- ✅ `lean-spec create` - Just created a spec (might conflict)
- ✅ `lean-spec list` - Browsing specs
- ✅ `lean-spec board` - Viewing kanban
- ✅ `lean-spec update` - Modifying a spec
- ✅ `lean-spec search` - Searching specs
- ✅ `lean-spec stats` - Viewing stats
- ✅ `lean-spec timeline` - Viewing timeline
- ✅ `lean-spec gantt` - Viewing gantt chart
- ✅ `lean-spec deps` - Checking dependencies
- ✅ `lean-spec files` - Viewing spec files
- ✅ `lean-spec archive` - Archiving a spec

Commands that **should NOT** auto-check (don't interact with specs):
- ❌ `lean-spec init` - Initializing new project (no specs yet)
- ❌ `lean-spec templates` - Managing templates only
- ❌ `lean-spec check` - Already checking conflicts

**Behavior:**
- Non-blocking: Shows warning but doesn't fail
- Contextual: Only shows if conflicts exist
- Silent mode: Can disable with env var or config
- Fast: < 10ms overhead

**That's it.** No auto-fix, no complex strategies. Users can:
- Rename folders manually
- Use date prefix to prevent future conflicts
- Live with conflicts if they don't care

### 3. Pattern-Aware List Grouping

Make `lean-spec list` adapt to the configured pattern (flat vs custom).

### 4. Update Template Configs

Use new config format consistently across all templates.

### 5. Pattern Selection in Init

Let users choose pattern during `lean-spec init`.

## Design

See [DESIGN.md](./DESIGN.md) for implementation details.

**Summary:**
1. Update `DEFAULT_CONFIG` to include `prefix: '{YYYYMMDD}-'`
2. Add `--no-prefix` flag for solo devs who want clean numbers
3. Implement simple `lean-spec check` command
4. Auto-check on all spec-reading commands (11 total)
5. Make `list` command pattern-aware
6. Update templates
7. Add pattern selection to init wizard

## Plan

- [ ] Update default config to use date prefix
- [ ] Add `--no-prefix` flag to create command
- [ ] Implement `lean-spec check` (detect only, no auto-fix)
- [ ] Add auto-check to: create, list, board, update, search, stats, timeline, gantt, deps, files, archive
- [ ] Add config option to disable auto-check
- [ ] Fix list grouping to be pattern-aware
- [ ] Update all template configs
- [ ] Add pattern selection to init wizard
- [ ] Update documentation
- [ ] Add tests for all auto-check integrations

## Test

- [ ] Date prefix applied by default
- [ ] `--no-prefix` works for solo devs
- [ ] `lean-spec check` detects duplicate sequences
- [ ] Auto-check runs on all 11 spec-reading commands
- [ ] Auto-check is non-blocking (shows warning only)
- [ ] Auto-check can be disabled via config
- [ ] Auto-check doesn't run on init/templates/check commands
- [ ] List groups correctly for flat/custom patterns
- [ ] Templates use new format
- [ ] Init wizard offers pattern choices
- [ ] All existing tests pass

## Success Criteria

- [ ] New projects use date prefix by default (prevents conflicts)
- [ ] Solo devs can opt out with `--no-prefix`
- [ ] Conflicts detected via `lean-spec check`
- [ ] Auto-check warns users in relevant commands
- [ ] Auto-check is non-blocking and can be disabled
- [ ] List command adapts to pattern
- [ ] Templates consistent
- [ ] Init offers pattern selection
- [ ] Documentation clear and simple

## Notes

### Why Date Prefix is the Right Default

**Pros:**
- Natural conflict prevention
- No complexity added
- Works offline, always
- Chronological sorting
- Already implemented

**Cons:**
- Longer folder names
- But: can opt out with `--no-prefix`

### Why Not Auto-Fix?

Keep it **lean**:
- Manual fix is simple (rename folder)
- Auto-fix adds complexity (strategies, reference updates, etc.)
- If conflicts are rare (they are with date prefix), manual is fine
- Users know their context best

### Auto-Check Design

**When to check:**
- ✅ After `lean-spec create` - User just created a spec
- ✅ Before `lean-spec list` - User browsing specs
- ✅ Before `lean-spec board` - User viewing kanban
- ✅ Before `lean-spec update` - User modifying spec
- ✅ Before `lean-spec search` - User searching specs
- ✅ Before `lean-spec stats` - User viewing statistics
- ✅ Before `lean-spec timeline` - User viewing timeline
- ✅ Before `lean-spec gantt` - User viewing gantt chart
- ✅ Before `lean-spec deps` - User checking dependencies
- ✅ Before `lean-spec files` - User listing spec files
- ✅ Before `lean-spec archive` - User archiving spec

**When NOT to check:**
- ❌ `lean-spec init` - No specs exist yet
- ❌ `lean-spec templates` - Template management only
- ❌ `lean-spec check` - Already checking

**Rationale:**
Any command that reads/displays/modifies specs should check for conflicts. This gives users visibility into problems at natural interaction points without being intrusive.

**How it works:**
- Fast check (< 10ms for 100s of specs)
- Non-blocking (shows warning, doesn't fail)
- Appears at end of output
- Can disable globally in config

**Config option:**
```json
{
  "autoCheck": false  // Disable auto-check
}
```

**Example output:**
```bash
$ lean-spec create feature-c
✓ Created: specs/001-feature-c/

⚠️  Conflict warning: Sequence 001 used by multiple specs
Run: lean-spec check
```

### Backward Compatibility

- Existing projects continue working
- No forced migration
- Can opt in to date prefix by editing config
