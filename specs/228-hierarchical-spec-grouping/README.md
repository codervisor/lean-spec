---
status: planned
created: 2026-01-20
priority: medium
tags:
- ux
- organization
- metadata
- spec-management
depends_on:
- 134-ui-metadata-editing
- 081-web-app-ux-redesign
- 150-tag-management
created_at: 2026-01-20T02:02:33.426173530Z
updated_at: 2026-01-20T02:02:38.809304162Z
---

# Hierarchical Spec Grouping

## Problem & Motivation

With 181 specs and growing, flat organization becomes limiting for:

1. **Multi-module projects** - Frontend/backend/docs/infra specs mixed together
2. **Release planning** - v0.3/v0.4/v0.5 specs scattered across list
3. **Epic/feature breakdown** - Large features split into 5+ specs with implicit relationships
4. **Team organization** - Multiple teams working on different areas

**Current tools** fall short:
- **Tags**: Flat categorization, not hierarchical (ui, backend, docs can't nest)
- **Dependencies**: Express relationships, not grouping (081 depends-on 082, but they're not part of a shared "UX Redesign" epic)
- **Board groupBy**: Dynamic filtering, not persistent structure

**Real pain**:
- AI agents struggle to find "all UI specs" without knowing exact tags
- Humans scan 181-item list to find related work
- No way to express "these 6 specs are part of v0.3 release" structurally
- `lean-spec list --tag ui` works but doesn't show hierarchy

## Design Options Evaluation

### Option A: Virtual Groups (Recommended)

Add `group` frontmatter field with slash-separated hierarchy:

```yaml
---
title: Web App UX Redesign
group: ui/redesign
tags: [ux, web]
---
```

**Hierarchy examples**:
- `releases/v0.3` → Release planning
- `ui/chat` → UI subsystem
- `backend/api/auth` → 3-level nesting
- `docs/tutorials` → Documentation

**Pros**:
✅ Non-invasive - no filesystem changes, backward compatible  
✅ Flexible depth - 1-5 levels as needed  
✅ Searchable - `list --group ui/*` matches all UI groups  
✅ Board groupBy - add "group" option to existing groupBy  
✅ Progressive - add groups incrementally, leave ungrouped specs alone  
✅ AI-friendly - structured metadata, easy to query  

**Cons**:
⚠️ Not as intuitive as folders (less familiar metaphor)  
⚠️ Requires UI design (how to show hierarchy in list/tree?)

### Option B: Folder Structure

Nest spec folders in hierarchy:

```
specs/
  ui/
    081-web-app-ux-redesign/
    093-spec-detail-ui/
  backend/
    api/
      186-rust-http-server/
```

**Pros**:
✅ Familiar filesystem metaphor  
✅ IDE file explorer shows hierarchy naturally  

**Cons**:
❌ **Breaks routing** - spec paths become `ui/081-...` (breaking change)  
❌ **Complicates CLI** - spec IDs no longer unique across folders  
❌ **Migration pain** - move 181 specs, update all references  
❌ **Deep nesting risk** - no enforced limit (can go 10 levels deep)  
❌ **Pattern conflicts** - current `{NNN}-{name}` pattern assumes flat structure

### Option C: Epic/Feature Hierarchy

Add `epic` and `feature` fields (fixed 2-level hierarchy):

```yaml
---
epic: UX Redesign
feature: Sidebar Navigation
---
```

**Pros**:
✅ Matches PM tools (Jira, Azure DevOps)  
✅ Prevents over-nesting (max 2 levels)  

**Cons**:
❌ Too rigid - doesn't fit multi-module projects (need module → epic → feature)  
❌ Overloaded terms - "epic" and "feature" mean different things to different teams  
❌ No flexibility - what if we need 3 levels? Or 1 level?

### Option D: Parent/Child Links

Add `parent_spec` field creating tree relationships:

```yaml
---
title: Sidebar Navigation
parent_spec: 081-web-app-ux-redesign
---
```

**Pros**:
✅ Simple one-field addition  
✅ Tree structure emerges naturally  

**Cons**:
❌ **Confuses dependencies** - is parent a blocker or just a container?  
❌ **Single parent only** - spec can't be in multiple groups (081 is both "ui" and "v0.3")  
❌ **No labels** - can't name the grouping (what's the group called?)  
❌ **Tree maintenance** - circular references, orphans, broken links

## Recommended Approach: Virtual Groups

**Why virtual groups win**:
1. **Backward compatible** - ungrouped specs work as before
2. **Multi-dimensional** - spec can have `group: ui/chat` AND `tags: [ai, v0.3]`
3. **Flexible depth** - 1-5 levels as needed, project decides
4. **Clear semantics** - group = organizational container, tags = cross-cutting labels, dependencies = technical relationships
5. **Progressive adoption** - add groups to 10 specs, see if it helps, expand or revert easily

**Key insight**: Tags are horizontal (ui, backend, ai, bug), groups are vertical (ui/chat, ui/sidebar, backend/api). Both needed.

## High-Level Approach

### 1. Frontmatter Schema

Add optional `group` field:

```yaml
---
title: Web App UX Redesign
group: ui/redesign  # Slash-separated hierarchy
tags: [ux, web, v0.3]  # Cross-cutting labels
status: complete
priority: high
---
```

**Validation rules** (spec 018 extension):
- Format: `^[a-z0-9-]+(/[a-z0-9-]+)*$` (lowercase, dash-separated, slash hierarchy)
- Max depth: 5 levels (prevents abuse)
- Example valid: `ui`, `ui/chat`, `releases/v0.3/ui`
- Example invalid: `UI/Chat` (uppercase), `ui//chat` (double slash), `ui/` (trailing slash)

### 2. CLI Commands

**List with groups**:
```bash
lean-spec list --group ui           # All specs in ui/* groups
lean-spec list --group ui/chat      # Exact match
lean-spec list --group "ui/*"       # Wildcard (all ui subgroups)
lean-spec list --group-tree         # Hierarchical tree view

# Output:
ui/
  chat/
    094-ai-chatbot-web-integration
    227-ai-chat-ui-ux-modernization
  redesign/
    081-web-app-ux-redesign
    093-spec-detail-ui-improvements
```

**Update groups**:
```bash
lean-spec update 081 --group ui/redesign
lean-spec group move ui/old ui/new        # Bulk rename
```

**Board grouping**:
```bash
lean-spec board --group-by group    # Group by top-level group
lean-spec board --group-by group:2  # Group by 2nd level
```

### 3. MCP Tools

```typescript
// Extend existing tools
list({ group?: string, groupTree?: boolean })
update(spec, { group?: string })

// New tools
group_list()                    // All groups with counts
group_rename(old, new)          // Bulk rename
group_specs(group)              // All specs in group hierarchy
```

### 4. UI Changes (Minimal Disruption)

**Specs nav sidebar** (spec 081 already has tree view):
- Add **group sections** above flat spec list
- Collapsible group headers: `▶ ui (12)`, `▶ backend (8)`
- Specs without groups: "Ungrouped" section at bottom

**List view**:
- Add **group badges** next to tags (different color/icon)
- Filter dropdown: "All groups" → group tree selector

**Board view**:
- groupBy dropdown: add "Group (level 1)" option
- Columns become groups instead of status

**Detail page**:
- Show group in breadcrumb: `Home → Specs → ui → redesign → #081`
- Metadata row: `Group: ui/redesign`

**Mockup (Specs nav sidebar)**:
```
┌─────────────────────┐
│ Specifications      │
├─────────────────────┤
│ ▼ ui (12)           │
│   ▼ chat (2)        │
│     • 094 AI Chat   │
│     • 227 Chat UX   │
│   ▼ redesign (3)    │
│     • 081 Web UX    │
│     • 093 Detail UI │
│ ▶ backend (8)       │
│ ▶ releases (15)     │
│ ▼ Ungrouped (146)   │
│   • 150 Tag Mgmt    │
│   • ...             │
└─────────────────────┘
```

## First Principles Alignment

| Principle | Impact |
|-----------|--------|
| **Context Economy** | ✅ Reduces cognitive load - scan groups, not 181 specs |
| **Lean Principle** | ✅ Simplest solution - one field, no filesystem changes |
| **File-first** | ✅ Preserves file structure, groups are metadata |
| **AI-first** | ✅ Structured metadata easy for agents to query |
| **Progressive Enhancement** | ✅ Works without groups, add when pain is felt |

## Phased Implementation

### Phase 1: Core (Week 1)
- [ ] Add `group` validation to spec 018 schema
- [ ] Extend `list` command with `--group` filter
- [ ] Add `--group` flag to `update` command
- [ ] MCP tool support: `list({ group })`, `update({ group })`

### Phase 2: Hierarchy (Week 2)
- [ ] Implement `--group-tree` list view
- [ ] Add `group_list()` MCP tool (all groups with counts)
- [ ] CLI `lean-spec group list` command
- [ ] Board `--group-by group` option

### Phase 3: UI Integration (Week 2-3)
- [ ] Add group filter to list view
- [ ] Show groups in specs nav sidebar (collapsible sections)
- [ ] Group badges in spec cards
- [ ] Breadcrumb shows group hierarchy

### Phase 4: Maintenance (Week 3)
- [ ] `lean-spec group move <old> <new>` bulk rename
- [ ] `group_rename()` MCP tool
- [ ] Migration helper: suggest groups based on tags

## Acceptance Criteria

- [ ] Spec with `group: ui/chat` appears in `lean-spec list --group ui`
- [ ] `lean-spec list --group-tree` shows hierarchical tree
- [ ] Board groupBy supports "Group (level 1)" option
- [ ] UI specs nav sidebar shows collapsible group sections
- [ ] Ungrouped specs still work (backward compatible)
- [ ] Max 5-level depth enforced by validation
- [ ] AI agents can query `list --group releases/v0.3`

## Out of Scope

- **Automatic grouping** - no AI-suggested groups (manual only)
- **Multi-parent** - spec belongs to one group (use tags for cross-cutting)
- **Group metadata** - no descriptions/owners for groups (just names)
- **Folder migration** - no filesystem restructure

## Potential Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Over-nesting (7+ levels) | Validation enforces max 5 levels |
| Group name conflicts | Use namespacing (releases/v0.3 vs versions/v0.3) |
| UI clutter (too many groups) | Default collapsed, show ungrouped count |
| Migration burden | Optional field, no forced migration |

## Open Questions

- Should group names allow uppercase? (Recommend no - consistency with tags)
- Auto-create groups from tags? (e.g., all `v0.3` tagged specs → `releases/v0.3` group)
- Show group in spec title? (e.g., `[ui/chat] AI Chatbot` in list view?)
- Group-level stats? (e.g., "ui group: 12 specs, 8 complete, 4 in-progress")

## Dependencies

Link after creation:
- **134-ui-metadata-editing** - UI editor needs group field
- **081-web-app-ux-redesign** - Specs nav sidebar structure
- **150-tag-management** - Similar governance patterns