---
status: complete
created: 2026-01-29
priority: medium
tags:
- cli
- mcp
- dx
- relationships
- ux
- simplification
depends_on:
- 250-structured-spec-hierarchy-management
- 085-cli-relationship-commands
parent: 250-structured-spec-hierarchy-management
created_at: 2026-01-29T14:06:00.766831Z
updated_at: 2026-01-30T02:18:17.318817Z
completed_at: 2026-01-30T02:18:17.318817Z
transitions:
- status: complete
  at: 2026-01-30T02:18:17.318817Z
---

# Streamlined Relationship Commands for CLI/MCP (Optimized Interface)

## Overview

### Problem

LeanSpec relationship management has evolved organically across multiple specs (076, 085, 099, 250), resulting in a fragmented command/tool landscape:

**Current CLI Commands:**
| Command                                        | Purpose                | Status  |
| ---------------------------------------------- | ---------------------- | ------- |
| `lean-spec deps <spec>`                        | View dependencies      | ✅ Works |
| `lean-spec deps <spec> --complete`             | View all relationships | ✅ Works |
| `lean-spec link <spec> --depends-on <other>`   | Add dependency         | ✅ Works |
| `lean-spec unlink <spec> --depends-on <other>` | Remove dependency      | ✅ Works |
| `lean-spec set-parent <spec> <parent>`         | Set parent             | ✅ Works |
| `lean-spec list --hierarchy`                   | Hierarchy tree view    | ✅ Works |
| `lean-spec children <spec>`                    | List children          | ✅ Works |

**Current MCP Tools:**
| Tool             | Purpose                  |
| ---------------- | ------------------------ |
| `deps`           | View dependencies        |
| `link`           | Add dependency           |
| `unlink`         | Remove dependency        |
| `set_parent`     | Set/clear parent         |
| `list_children`  | Get children of umbrella |
| `list_umbrellas` | Get all umbrella specs   |

**Pain Points:**

1. **Scattered mental model** - hierarchy vs dependencies feel like separate concepts
2. **Asymmetric operations** - can `link --depends-on` but no `link --parent`
3. **Multiple commands** - `deps`, `link`, `unlink`, `set-parent`, `children` all needed
4. **AI agent friction** - agents must learn 6+ tools for relationships
5. **No unified "view all relationships"** - must combine deps + children output

### Solution

Design a **streamlined relationship interface** that:
- Unifies hierarchy and dependencies under single mental model
- Provides intuitive command structure with consistent patterns
- Reduces cognitive load for both humans and AI agents
- **Full migration** to new commands with deprecation notices on old ones

**Key insight**: All relationships are just edges in a graph. The distinction is:
- `parent/children` = **organizational** edges (hierarchy)
- `depends_on/required_by` = **technical** edges (blocking)

## Decision

### CLI: Unified `rel` command (Option A) ✅

```bash
# View all relationships
lean-spec rel <spec>              # Shows parent, children, deps, required-by

# Add relationships
lean-spec rel add <spec> --parent <umbrella>
lean-spec rel add <spec> --depends-on <other>
lean-spec rel add <spec> --child <other>        # Sets parent on <other>

# Remove relationships  
lean-spec rel rm <spec> --parent
lean-spec rel rm <spec> --depends-on <other>
lean-spec rel rm <spec> --child <other>         # Clears parent on <other>
```

### MCP: Single unified tool (Option A) ✅

```typescript
// One tool for all relationship operations
{
  name: "relationships",
  description: "Manage spec relationships (hierarchy and dependencies)",
  inputSchema: {
    specPath: z.string(),
    action: z.enum(["view", "add", "remove"]),
    type: z.enum(["parent", "child", "depends_on"]),
    target: z.string().optional(),  // Required for add/remove
  }
}
```

### Migration: Full migration with deprecation notice ✅

Old commands/tools will show deprecation warnings but continue to work for 2 minor versions:
- `lean-spec link/unlink` → "Deprecated: use `lean-spec rel add/rm`"
- `lean-spec set-parent` → "Deprecated: use `lean-spec rel add --parent`"
- `lean-spec deps` → "Deprecated: use `lean-spec rel`"
- MCP `link`, `unlink`, `set_parent`, `deps`, `list_children`, `list_umbrellas` → show deprecation in response

## Design

### Unified Mental Model

**One concept**: Spec relationships are directional edges with types.

```
Edge Types:
├── parent      → organizational (one parent max)
├── child       ← inverse of parent
├── depends_on  → technical dependency
└── required_by ← inverse of depends_on
```

### CLI `rel` Command Structure

```bash
# Subcommands
lean-spec rel <spec>              # Default: view relationships
lean-spec rel view <spec>         # Explicit view
lean-spec rel add <spec> <flags>  # Add relationship
lean-spec rel rm <spec> <flags>   # Remove relationship

# Flags for add/rm
--parent <spec>      # Set/clear parent relationship
--child <spec>       # Add/remove child (sets parent on target)
--depends-on <spec>  # Add/remove dependency

# Multiple at once
lean-spec rel add 254 --parent 250 --depends-on 085
```

### MCP `relationships` Tool

```typescript
{
  name: "relationships",
  description: "View, add, or remove spec relationships (parent, children, dependencies)",
  inputSchema: {
    specPath: z.string().describe("Spec ID or path"),
    action: z.enum(["view", "add", "remove"]).default("view"),
    type: z.enum(["parent", "child", "depends_on"]).optional(),
    target: z.string().optional(),
  }
}

// Usage examples:
// View: { specPath: "254" }  or  { specPath: "254", action: "view" }
// Add parent: { specPath: "254", action: "add", type: "parent", target: "250" }
// Remove dep: { specPath: "254", action: "remove", type: "depends_on", target: "085" }
```

### Output Format

**View output (CLI and MCP):**
```
# Relationships for #254 Streamlined Relationship Commands

## Hierarchy
├── Parent: #250 Structured Spec Hierarchy Management
└── Children: (none)

## Dependencies  
├── Depends On:
│   ├── #250 Structured Spec Hierarchy Management
│   └── #085 CLI Relationship Commands
└── Required By: (none)
```

## Plan

### Phase 1: Core Implementation
- [x] Create `rel` command with view/add/rm subcommands
- [x] Create unified `relationships` MCP tool
- [x] Add deprecation warnings to old commands
- [x] Update command registry

### Phase 2: Deprecation Setup
- [x] Add deprecation util function
- [x] Wire deprecation to `link`, `unlink`, `set-parent`, `deps`, `children`
- [x] Wire deprecation to MCP tools: `link`, `unlink`, `set_parent`, `deps`, `list_children`, `list_umbrellas`
- [x] Log deprecation warnings to stderr (CLI) / response prefix (MCP)

### Phase 3: Documentation
- [x] Create "Spec Relationships" reference doc
- [x] Update CLI help with `rel` examples
- [x] Update MCP tool descriptions
- [x] Update AGENTS.md with new commands

### Phase 4: SKILL Update
- [x] Update leanspec-sdd SKILL with `rel` command
- [x] Replace all references to old commands
- [x] Add relationship decision guide

## Test

- [x] `rel <spec>` shows all relationships
- [x] `rel add --parent` sets parent correctly
- [x] `rel add --depends-on` adds dependency
- [x] `rel add --child` sets parent on target spec
- [x] `rel rm --parent` clears parent
- [x] `rel rm --depends-on` removes dependency
- [x] `rel rm --child` clears parent on target spec
- [x] Multiple flags in single command work
- [x] MCP `relationships` tool with action=view
- [x] MCP `relationships` tool with action=add
- [x] MCP `relationships` tool with action=remove
- [x] Deprecation warnings appear on old commands
- [x] Old commands still function correctly

## Notes

### Relationship Semantics Clarified

| Relationship | Meaning                     | Action                  |
| ------------ | --------------------------- | ----------------------- |
| Parent       | "I belong to this umbrella" | Organizational grouping |
| Child        | "This spec belongs to me"   | Inverse of parent       |
| Depends On   | "I need this to work"       | Technical blocking      |
| Required By  | "This needs me"             | Inverse of depends_on   |

### When to Use What

**Use `parent`/`children` when:**
- Grouping related work under umbrella spec
- Creating feature sub-specs
- Organizing by initiative/epic

**Use `depends_on`/`required_by` when:**
- Spec A cannot complete until Spec B is done
- Technical dependency exists
- Blocking relationship

**Both can be used:**
- A spec can have parent AND dependencies
- Example: #244 (Session UI) has parent #168 AND depends on #239

### Deprecation Timeline

- **v0.x.0** (this release): Deprecation warnings added
- **v0.(x+2).0**: Old commands/tools removed

### Relationship to Sibling Specs

This is part of the **spec 250 hierarchy management** initiative:

| Spec           | Focus             | Scope                                             |
| -------------- | ----------------- | ------------------------------------------------- |
| **252**        | Foundational UI   | Read-only display, visualization, tree components |
| **253**        | Optimized UI      | Unified editing experience (builds on 252)        |
| **254 (this)** | Optimized CLI/MCP | Streamlined `rel` command interface               |

### Related Specs

- **253-unified-relationships-editing** - UI for relationship editing
- **250-structured-spec-hierarchy-management** - Parent/children data model
- **085-cli-relationship-commands** - Original link/unlink (deprecated)
- **076-programmatic-spec-relationships** - MCP deps tools (deprecated)