---
name: organize
description: Organize specs by managing relationships, status, priority, and structure
---

# Organize Specs

Organize and structure specs by managing relationships, updating metadata, and ensuring a clean project hierarchy.

## When to Use

Use `organize` when:
- Specs are growing and need structure (parent/child grouping)
- Dependencies between specs are unclear or missing
- Status or priority needs bulk review and correction
- Related specs should be linked together
- Project board feels cluttered or hard to navigate

## Workflow

### 1. Survey Current State

**Get a full picture before making changes:**
- Use `board` to see all specs grouped by status
- Use `board --group-by priority` to spot priority imbalances
- Use `board --group-by parent` to see the hierarchy
- Use `stats` to get an overview of spec health
- Use `list` with filters to find specific subsets

```bash
lean-spec board
lean-spec board --group-by priority
lean-spec stats
lean-spec list --status planned
```

### 2. Identify Organization Opportunities

**Look for these patterns:**

| Pattern | Action |
|---------|--------|
| 3+ related specs with no parent | Create an umbrella spec and group them |
| Spec that can't start without another | Add `depends_on` link |
| Completed spec still marked `in-progress` | Update status to `complete` |
| Low-value spec with no activity | Consider archiving |
| Spec with wrong priority | Update priority to reflect reality |
| Duplicate or overlapping specs | Merge or archive the redundant one |
| Large spec (>2000 tokens) | Split into parent + children |

### 3. Manage Relationships

#### Parent/Child (Organizational Decomposition)

Use when a spec is **part of** a larger initiative:

```bash
# MCP tools (preferred)
set_parent <child-spec> --parent <umbrella-spec>
relationships <spec> --action add --type child --target <child-spec>

# CLI
lean-spec link <child-spec> --parent <umbrella-spec>
```

**When to create an umbrella spec:**
- Multiple specs share a common theme or feature area
- You need to track overall progress of a multi-part effort
- The umbrella captures the "big picture" while children are actionable

**Umbrella spec tips:**
- Keep umbrella content minimal — it's a container, not a detailed spec
- Umbrella completes when all children complete
- Use `list_children` or `view` to check child status

#### Depends On / Required By (Technical Blocking)

Use when a spec **cannot start** until another is done:

```bash
# MCP tools (preferred)
link <spec> --depends-on <blocking-spec>
relationships <spec> --action add --type depends_on --target <blocking-spec>

# CLI
lean-spec link <spec> --depends-on <blocking-spec>

# Remove a dependency
unlink <spec> --depends-on <blocking-spec>
lean-spec unlink <spec> --depends-on <blocking-spec>
```

**Decision guide:**
- If the other spec didn't exist, would yours still make sense?
  - **NO** → Use `parent` (it's part of that scope)
  - **YES** → Use `depends_on` (it's just a blocker)
- **Never** use both `parent` AND `depends_on` for the same spec pair

#### Viewing Relationships

```bash
# View all relationships for a spec
lean-spec rel <spec>

# View dependency graph
lean-spec deps <spec>

# List children of a parent
lean-spec list-children <parent-spec>

# List all umbrella specs
lean-spec list-umbrellas
```

Or use MCP tools: `relationships`, `deps`, `list_children`, `list_umbrellas`

### 4. Update Status

**Status definitions:**
| Status | Meaning |
|--------|---------|
| `planned` | Spec defined, work not started |
| `in-progress` | Active development underway |
| `complete` | All requirements verified and implemented |
| `archived` | No longer relevant or superseded |

**Common status corrections:**
```bash
# Spec was started but never updated
lean-spec update <spec> --status in-progress

# Work finished but status stale
lean-spec update <spec> --status complete

# Spec is obsolete or superseded
lean-spec update <spec> --status archived

# Work was paused or deprioritized
lean-spec update <spec> --status planned
```

Or use MCP tool: `update`

### 5. Update Priority

**Priority levels:**
| Priority | When to Use |
|----------|-------------|
| `critical` | Blocking release or breaking production |
| `high` | Important for current milestone |
| `medium` | Standard priority (default) |
| `low` | Nice-to-have, backlog |

```bash
lean-spec update <spec> --priority high
lean-spec update <spec> --priority low
```

Or use MCP tool: `update`

### 6. Manage Tags

Tags help categorize specs across different dimensions:

```bash
# Add tags
lean-spec update <spec> --add-tags "backend,api"

# Remove tags
lean-spec update <spec> --remove-tags "draft"

# Filter by tags
lean-spec list --tags "backend"
```

Or use MCP tool: `update` with `addTags` / `removeTags`

### 7. Bulk Organization Checklist

When doing a full organization pass:

- [ ] Review `board` output for misplaced or stale specs
- [ ] Group related specs under umbrella parents
- [ ] Add missing `depends_on` links for blocked specs
- [ ] Correct stale statuses (especially `in-progress` specs with no recent activity)
- [ ] Adjust priorities to match current goals
- [ ] Archive completed or obsolete specs
- [ ] Split oversized specs (>2000 tokens) into parent + children
- [ ] Run `validate` to catch structural issues
- [ ] Run `stats` to confirm improved health

### 8. Validate

After organizing, validate the project:

```bash
lean-spec validate --check-deps
```

Or use MCP tool: `validate` with `checkDeps: true`

## Quick Reference

| Action | MCP Tool | CLI Command |
|--------|----------|-------------|
| Project board | `board` | `lean-spec board` |
| Board by priority | `board` | `lean-spec board --group-by priority` |
| Project stats | `stats` | `lean-spec stats` |
| List specs | `list` | `lean-spec list` |
| View spec | `view` | `lean-spec view <spec>` |
| View relationships | `relationships` | `lean-spec rel <spec>` |
| View dep graph | `deps` | `lean-spec deps <spec>` |
| Update status | `update` | `lean-spec update <spec> --status <status>` |
| Update priority | `update` | `lean-spec update <spec> --priority <priority>` |
| Add tags | `update` | `lean-spec update <spec> --add-tags "tag1,tag2"` |
| Validate | `validate` | `lean-spec validate --check-deps` |
| Token count | `tokens` | `lean-spec tokens <spec>` |

## Important Reminders

- **Survey first** — Always use `board` and `stats` before making changes
- **Parent vs depends_on** — Decomposition vs blocking; never both for the same pair
- **No manual frontmatter** — Use tools to update status, priority, tags, relationships
- **Validate after organizing** — Run `validate --check-deps` to catch broken links
- **Archive, don't delete** — Preserve history by archiving obsolete specs
- **Keep umbrellas light** — Umbrella specs are containers, not implementation details
- **One pass at a time** — Focus on one aspect (status, hierarchy, priorities) per pass