---
status: in-progress
created: 2026-02-26
priority: high
tags:
- skill
- documentation
- dx
created_at: 2026-02-26T02:43:21.640718246Z
updated_at: 2026-02-26T02:59:49.528016444Z
transitions:
- status: in-progress
  at: 2026-02-26T02:59:49.528016444Z
---

## Overview

The SDD skill (`.agents/skills/leanspec-sdd/`) documents CLI and MCP commands/tools that agents use to manage specs. An audit of the actual Rust MCP source (`rust/leanspec-mcp/src/tools/`) and CLI `--help` output reveals significant misalignments:

1. **Skill docs reference non-existent MCP tools** (`set_parent`, `link`, `unlink`, `list_children`, `list_umbrellas`, `deps`) — the MCP server only has 10 tools
2. **CLI and MCP are not aligned** in naming, args, or capability coverage
3. **Incorrect CLI flags** documented in commands.md
4. **Missing CLI commands** from documentation

## Current State: MCP Tools (Rust Source of Truth)

The MCP server (`rust/leanspec-mcp/src/tools/mod.rs`) registers exactly **10 tools**:

| # | MCP Tool | Params | Description |
|---|----------|--------|-------------|
| 1 | `list` | status, tags[], priority | List/filter specs |
| 2 | `view` | specPath | View spec content |
| 3 | `create` | name, title, status, priority, template, content, tags[], parent, dependsOn[] | Create spec |
| 4 | `update` | specPath, status, priority, assignee, addTags[], removeTags[], replacements[], sectionUpdates[], checklistToggles[], content, expectedContentHash, force | Update metadata + content |
| 5 | `search` | query, limit | Search specs |
| 6 | `board` | groupBy | Board view |
| 7 | `stats` | _(none)_ | Statistics |
| 8 | `relationships` | specPath, action(view/add/remove), type(parent/child/depends_on), target | Unified relationship management |
| 9 | `validate` | specPath, checkDeps | Validate specs |
| 10 | `tokens` | specPath, filePath | Count tokens |

## Current State: CLI Commands

The CLI has **30+ commands**:

**Core (matching MCP):** `list`, `view`, `create`, `update`, `search`, `board`, `stats`, `validate`, `tokens`

**Relationships (partially matching MCP `relationships`):** `rel` (unified), `link` (add dep shortcut), `unlink` (remove dep shortcut), `children` (list children), `deps` (dependency graph)

**No MCP equivalent:** `archive`, `analyze`, `split`, `compact`, `backfill`, `check`, `open`, `files`, `templates`, `timeline`, `gantt`, `agent`, `session`, `init`, `migrate`, `migrate-archived`, `examples`, `mcp`, `ui`

## Key Misalignments

### 1. Relationship Management (Critical)

**MCP**: Single `relationships` tool with `action` + `type` params
**CLI**: 5 separate commands: `rel`, `link`, `unlink`, `children`, `deps`

The skill docs incorrectly reference these as separate MCP tools:
- `set_parent` → doesn't exist; use `relationships(action=add, type=parent)`
- `link` → doesn't exist; use `relationships(action=add, type=depends_on)`
- `unlink` → doesn't exist; use `relationships(action=remove, type=depends_on)`
- `list_children` → doesn't exist; use `relationships(action=view)` and read children from response
- `list_umbrellas` → doesn't exist anywhere
- `deps` → doesn't exist; only `relationships(action=view)` shows direct relationships

### 2. Param Naming Inconsistencies

| Concept | MCP param | CLI flag |
|---------|-----------|----------|
| Spec identifier | `specPath` | positional `<SPEC>` |
| Tags filter | `tags` (array) | `--tag` (singular) |
| Group by | `groupBy` (camelCase) | `--group-by` (kebab-case) |
| Check deps | `checkDeps` (camelCase) | `--check-deps` (kebab-case) |
| Add tags | `addTags` (camelCase) | `--add-tags` (kebab-case) |
| Remove tags | `removeTags` (camelCase) | `--remove-tags` (kebab-case) |
| Depends on | `dependsOn` (in create) | not in CLI `create` |
| Parent | `parent` (in create) | not in CLI `create` |

**Convention**: MCP uses camelCase (JSON standard), CLI uses kebab-case (POSIX standard). This is acceptable and expected. The issue is feature parity, not casing.

### 3. Feature Parity Gaps

**MCP has, CLI lacks:**
- `create --parent` / `--depends-on` (set relationships at creation time)
- `update` with replacements, sectionUpdates, checklistToggles (surgical content editing)

**CLI has, MCP lacks:**
- `deps` (dependency graph traversal with --upstream/--downstream/--depth)
- `children` (dedicated child listing)
- `list --hierarchy` (hierarchy tree view)
- `list --assignee` (filter by assignee)
- `list --compact` (compact output)
- `validate --strict`, `--warnings-only`
- `stats --detailed`
- `files` (list spec directory contents)
- `archive` (shorthand for update --status archived)
- `analyze`, `split`, `compact` (spec file management)

### 4. commands.md Flag Errors

| Command | Documented | Actual |
|---------|-----------|--------|
| `view --json` | `--json` flag | No `--json`. Use global `-o json` |
| `files --type docs` | `--type docs` | No `--type`. Has `--size` only |
| `stats --full` | `--full` | `--detailed` |
| `backfill --include-assignee` | `--include-assignee` | `--assignee` |
| `backfill --include-transitions` | `--include-transitions` | `--transitions` |
| `backfill --specs 042,043` | `--specs` named option | Positional args: `backfill 042 043` |
| `deps --impact` | `--impact` flag | Doesn't exist |

## Proposed Alignment

### Option A: Expand MCP to Match CLI (Recommended)

Add dedicated MCP tools that mirror CLI shortcuts for common operations:

| New MCP Tool | Maps To | Rationale |
|-------------|---------|-----------|
| `deps` | `lean-spec deps` | Graph traversal is distinct from `relationships` view |
| `children` | `lean-spec children` | Common enough to warrant a shortcut |
| `archive` | `lean-spec archive` | Common status transition |

Keep `relationships` as the unified tool, but add convenience tools for the most common operations that agents perform frequently.

### Option B: Slim CLI to Match MCP

Deprecate `link`, `unlink`, `children` CLI commands in favor of `rel`. This is partially done already (we removed legacy commands from skill docs).

### Recommendation: Hybrid

1. **MCP**: Keep `relationships` as unified tool. Add `deps` and `children` as read-only convenience tools.
2. **CLI**: Keep `rel` as primary. Keep `children` and `deps`. Mark `link`/`unlink` as legacy aliases in `--help`.
3. **Skill docs**: Document `relationships` as the MCP tool, with clear examples for each action/type combo. Map to CLI `rel` equivalents.
4. **Param naming**: Accept camelCase (MCP) vs kebab-case (CLI) as normal. Ensure feature parity where it matters.

## Plan

- [ ] Fix skill docs: replace phantom MCP tools with actual `relationships` tool usage
- [ ] Fix commands.md: correct all flag errors
- [ ] Add missing CLI commands to commands.md
- [ ] Update SKILL.md tool reference table to match reality
- [ ] Add `deps` and `children` MCP tools (Rust implementation)
- [ ] Add `--parent` and `--depends-on` to CLI `create` command
- [ ] Add `--hierarchy` documentation to list command
- [ ] Decide on `link`/`unlink` CLI fate (keep as aliases? deprecation warning?)
- [ ] Final cross-verification pass

## Notes

- MCP uses camelCase params (JSON convention), CLI uses kebab-case flags (POSIX convention) — this is correct
- The `create` MCP tool already supports `parent` and `dependsOn` but CLI `create` doesn't — this should be added
- The `update` MCP tool has rich content editing (replacements, sectionUpdates, checklistToggles) that CLI doesn't — this is by design (agents need it, humans use editors)
