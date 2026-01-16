---
status: complete
created: 2025-12-05
priority: medium
tags:
- cli
- mcp
- dx
- governance
- metadata
depends_on:
- 134-ui-metadata-editing
- 124-advanced-search-capabilities
created_at: 2025-12-05T05:24:38.286Z
updated_at: 2026-01-16T07:30:20.820492Z
---
# Tag Management and Governance

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-12-05 · **Tags**: cli, mcp, dx, governance, metadata

## Overview

### Problem

Mature LeanSpec projects suffer from **tag explosion**. This project alone has 90+ unique tags with significant inconsistency:

| Issue | Examples |
|-------|----------|
| Synonyms | `bug` vs `bug-fix` vs `fix` |
| Variants | `ai`, `ai-agents`, `ai-assisted`, `ai-workflow`, `ai-first` |
| Version drift | `v0.2`, `v0.2.0`, `v0.2.0-optional`, `v0.3`, `v0.3.0` |
| Abbreviations | `dx` (no defined meaning), `ux`, `pm` |

**Impact**: Unreliable filtering, cognitive overhead, poor AI agent search results.

### Solution

Add tag governance and lifecycle management:
1. **Optional tag registry** in `.leanspec/tags.yaml`
2. **Granular tag operations**: add/remove individual tags
3. **Tag maintenance**: rename, merge, bulk cleanup
4. **Autocomplete/validation**: suggest existing tags, warn on unknown

### Principles

- **Opt-in governance**: Works without registry (current behavior)
- **Progressive enhancement**: Add governance when pain is felt
- **AI-agent friendly**: Smaller vocabulary = better search results

## Design

### Tag Registry (Optional)

```yaml
# .leanspec/tags.yaml
mode: suggest  # 'suggest' (warn) | 'strict' (error) | 'off'

tags:
  # Core categories
  cli:
    description: Command-line interface features
  mcp:
    description: Model Context Protocol server
  ui:
    description: Web app and UI package
    
  # Aliases (synonyms)
  bug:
    aliases: [bug-fix, fix, bugfix]
    description: Bug fixes and defects
    
  # AI-related (consolidated)
  ai-agents:
    aliases: [ai, ai-first, ai-assisted, ai-workflow]
    description: AI agent integration and workflows
    
  # Version tags
  v0.3:
    aliases: [v0.3.0, v0.3.0-launch]
    description: Version 0.3 release work
```

### CLI Commands

**Granular updates** (new):
```bash
lean-spec tag add <spec> <tag...>       # Add tag(s) without replacing
lean-spec tag remove <spec> <tag...>    # Remove specific tag(s)
```

**Tag maintenance** (new):
```bash
lean-spec tag list                       # List all tags with counts
lean-spec tag rename <old> <new>         # Rename across all specs
lean-spec tag merge <target> <sources>   # Merge synonyms into target
lean-spec tag delete <tag>               # Remove tag from all specs
lean-spec tag init                       # Generate tags.yaml from existing
```

**Existing (unchanged)**:
```bash
lean-spec update <spec> --tags a,b,c    # Replace all tags (current)
lean-spec list --tag api                 # Filter by tag (current)
```

### MCP Tools

```typescript
// New tools
tag_add(spec, tags[])      // Add without replacing
tag_remove(spec, tags[])   // Remove specific tags
tag_list()                 // Get all tags with usage counts
tag_rename(oldTag, newTag) // Bulk rename
tag_merge(target, sources) // Consolidate synonyms
```

### Implementation Approach

**Phase 1: Granular Operations** (High value, low risk)
- `tag add` / `tag remove` for spec-level ops
- No registry needed, works immediately

**Phase 2: Tag Discovery**
- `tag list` with counts and sorting
- `tag init` to bootstrap registry from existing

**Phase 3: Governance** (Optional)
- Parse `.leanspec/tags.yaml` 
- `suggest` mode: warn on unknown tags
- `strict` mode: error on unknown tags

**Phase 4: Maintenance**
- `tag rename` / `tag merge` / `tag delete`
- Bulk operations across all specs

### Core API Changes

```typescript
// packages/core/src/spec-operations.ts (new)
export async function addTags(specPath: string, tags: string[]): Promise<void>;
export async function removeTags(specPath: string, tags: string[]): Promise<void>;
export async function getAllTags(specsDir: string): Promise<TagUsage[]>;
export async function renameTag(specsDir: string, oldTag: string, newTag: string): Promise<number>;
export async function mergeTags(specsDir: string, target: string, sources: string[]): Promise<number>;

interface TagUsage {
  tag: string;
  count: number;
  specs: string[];  // Spec names using this tag
}
```

## Plan

### Phase 1: Granular Tag Operations
- [ ] Add `addTags()` and `removeTags()` to core
- [ ] Create `tag add` and `tag remove` CLI commands
- [ ] Add MCP tools: `tag_add`, `tag_remove`
- [ ] Update UI metadata editor with add/remove UX

### Phase 2: Tag Discovery
- [ ] Implement `getAllTags()` with usage counts
- [ ] Create `tag list` CLI command with formatting
- [ ] Add `tag init` to generate registry template
- [ ] Add MCP `tag_list` tool

### Phase 3: Optional Governance
- [ ] Define `tags.yaml` schema and loader
- [ ] Add validation in `suggest` mode (warnings)
- [ ] Add validation in `strict` mode (errors)
- [ ] Autocomplete support in CLI/MCP

### Phase 4: Bulk Maintenance
- [ ] Implement `renameTag()` and `mergeTags()` in core
- [ ] Create `tag rename`, `tag merge`, `tag delete` commands
- [ ] Add corresponding MCP tools

## Test

### Granular Operations
- [ ] `tag add` appends without removing existing tags
- [ ] `tag remove` only removes specified tags
- [ ] Adding duplicate tag is idempotent
- [ ] Removing non-existent tag succeeds silently

### Tag Discovery
- [ ] `tag list` shows accurate counts
- [ ] `tag init` creates valid YAML from existing tags

### Governance
- [ ] Unknown tag with `mode: suggest` shows warning
- [ ] Unknown tag with `mode: strict` fails with error
- [ ] Aliases resolve correctly during search

### Bulk Operations
- [ ] `tag rename` updates all specs atomically
- [ ] `tag merge` consolidates into target, removes sources

## Notes

### Why This Matters for Project Management

1. **Consistent taxonomy** → reliable filtering and grouping
2. **AI search quality** → smaller vocabulary = better matches
3. **Release tracking** → clean version tags (`v0.3`, `v0.4`)
4. **Cross-cutting concerns** → meaningful categories emerge

### Alternative: Hierarchical Tags

Considered `ui/ux`, `ai/agents` hierarchy. Deferred because:
- Adds complexity without proportional benefit
- Flat tags + good governance covers most needs
- Can add later if pain emerges

### Related Specs

- **005-structured-frontmatter**: Original tag design
- **134-ui-metadata-editing**: UI tag editor (consumer of this)
- **124-advanced-search**: `tag:` search syntax
