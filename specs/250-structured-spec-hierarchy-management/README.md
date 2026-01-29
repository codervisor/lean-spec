---
status: planned
created: 2026-01-29
priority: high
tags:
- core
- cli
- mcp
- hierarchy
- umbrella
- organization
- spec-management
depends_on:
- 076-programmatic-spec-relationships
- 085-cli-relationship-commands
- 099-enhanced-dependency-commands-cli-mcp
- 221-ai-orchestration-integration
created_at: 2026-01-29T02:45:28.147134636Z
updated_at: 2026-01-29T02:45:38.234579570Z
---

# Structured Spec Hierarchy Management

## Overview

### Problem

When working with complex features, we use **umbrella specs** to coordinate multiple sub-specs. However, there's no structured way to:

1. **Track which specs belong to a parent** - Currently relying on manual `depends_on` links
2. **Visualize the hierarchy** - No bird's-eye view of umbrella relationships
3. **Enforce parent-child semantics** - A child spec should know its parent umbrella
4. **Group related specs** - Sessions, UI components, and orchestration logic are scattered

This creates friction:
- ❌ Hard to see all specs under an umbrella at once
- ❌ Missing specs can slip through (like 249 not being tracked by 168 before today)
- ❌ No validation that umbrella specs actually coordinate their children
- ❌ CLI/board views don't show hierarchy relationships

### The AI Session Example

We just discovered **spec 249** (sessions sidebar UX) existed but wasn't tracked by **spec 168** (orchestration platform) despite being directly related. This pattern repeats across the codebase:

```
221 (umbrella)
├── 168 (umbrella) - SHOULD track 244, 249, 243, 160
├── 94 (umbrella) - SHOULD track 223, 227
└── Missing: explicit parent-child links
```

## Design

### Core Concept: Explicit Parent-Child Relationships

Introduce a **`parent`** field in spec frontmatter to complement `depends_on`:

```yaml
---
status: planned
parent: 168-leanspec-orchestration-platform  # ← New field
depends_on:
  - 239-ai-coding-session-management
  - 244-session-ui-enhancement
---
```

**Difference from `depends_on`:**
- `depends_on` = technical dependencies ("I need this to work")
- `parent` = organizational grouping ("I belong to this umbrella")

### Enhanced CLI Commands

**1. Hierarchy-aware list view:**
```bash
$ lean-spec list --hierarchy

#221 AI Orchestration Integration (umbrella)
└── #168 Orchestration Platform (umbrella)
    ├── #239 Session Management (in-progress)
    ├── #244 Session UI Enhancement (in-progress)
    ├── #249 Sessions Sidebar UX (planned)
    ├── #243 Realtime File Watch (in-progress)
    └── #160 Tokens/Validation Display (in-progress)
```

**2. Show all children of an umbrella:**
```bash
$ lean-spec children 168

Children of #168 - Orchestration Platform:
├── #239 Session Management (in-progress)
├── #244 Session UI Enhancement (in-progress)
├── #249 Sessions Sidebar UX (planned)
├── #243 Realtime File Watch (in-progress)
└── #160 Tokens/Validation Display (in-progress)
```

**3. Validate umbrella completeness:**
```bash
$ lean-spec validate --umbrella 168

ERROR: Umbrella #168 has untracked child specs:
  - #249 Sessions Sidebar UX (no parent field)
  
SUGGEST: Add 'parent: 168-leanspec-orchestration-platform' to spec 249
```

### Board View Enhancement

**Group by parent umbrella:**
```
┌─#221 AI Orchestration Integration ───────┐
│  ┌─#168 Orchestration Platform ─────────┐│
│  │  #239 ● in-progress                   ││
│  │  #244 ● in-progress                   ││
│  │  #249 ○ planned                       ││
│  └───────────────────────────────────────┘│
│  ┌─#94 AI Chatbot ──────────────────────┐│
│  │  #223 ● in-progress                   ││
│  │  #227 ● in-progress                   ││
│  └───────────────────────────────────────┘│
└───────────────────────────────────────────┘
```

### Validation Rules

1. **Circular parent check** - A spec cannot be its own ancestor
2. **Orphan detection** - Specs with `parent` that doesn't exist
3. **Umbrella completeness** - Warn if umbrella has no children
4. **Status consistency** - Parent shouldn't be "complete" if children are "in-progress"

### MCP Tool Updates

**New tools:**
- `set_parent` - Assign a parent to a spec
- `list_children` - Get all specs with a given parent
- `list_umbrellas` - Get all specs marked as umbrellas

**Enhanced tools:**
- `view` - Show parent and children in output
- `board` - Option to group by parent

## Plan

### Phase 1: Core Data Model (1-2 days)
- [ ] Add `parent` field support to spec frontmatter parser
- [ ] Add `is_umbrella` boolean field (or auto-detect from children)
- [ ] Update types in both TypeScript and Rust
- [ ] Migration: Add parent field to existing umbrella-child pairs

### Phase 2: CLI Commands (2-3 days)
- [ ] Add `--hierarchy` flag to `list` command
- [ ] Create new `children` subcommand
- [ ] Enhance `validate` to check parent-child consistency
- [ ] Update `view` to show parent/children

### Phase 3: Board View (1-2 days)
- [ ] Add "group by parent" option to board
- [ ] Show tree indentation in list views
- [ ] Visual indicator for umbrella specs (umbrella icon 🌂)

### Phase 4: MCP Tools (1 day)
- [ ] Add `set_parent` tool
- [ ] Add `list_children` tool
- [ ] Update `view` tool output

### Phase 5: Validation & Polish (1 day)
- [ ] Add circular dependency detection for parents
- [ ] Add orphan detection
- [ ] Add umbrella completeness warnings
- [ ] Update documentation

## Test

- [ ] Parent field survives round-trip (read → write → read)
- [ ] Circular parent detection works (A→B→A)
- [ ] Orphan detection flags missing parents
- [ ] `children` command lists all direct children
- [ ] `list --hierarchy` shows tree structure
- [ ] Board groups correctly by parent
- [ ] Validation catches status inconsistencies

## Notes

### Backwards Compatibility

- `parent` field is optional - existing specs work unchanged
- Umbrella detection can be manual (`is_umbrella: true`) or automatic (has children)
- No breaking changes to existing CLI commands

### Related Work

- **076-programmatic-spec-relationships** - Existing relationship management (link/unlink)
- **085-cli-relationship-commands** - CLI commands for relationships
- **099-enhanced-dependency-commands-cli-mcp** - Enhanced dependency tools

This spec complements the existing relationship system by adding explicit **organizational** hierarchy on top of **technical** dependencies.

### Implementation Priority

**High** - This would have prevented the 249 discovery issue and makes umbrella specs actually useful for coordination.

### Future Enhancements

- **Nested umbrellas** - Umbrellas can have parent umbrellas (already works with parent field)
- **Spec templates** - Auto-set parent when creating sub-specs
- **Progress aggregation** - Calculate umbrella % complete from children
- **Time estimates** - Sum child estimates for umbrella planning