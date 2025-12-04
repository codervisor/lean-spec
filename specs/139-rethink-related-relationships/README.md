---
status: in-progress
created: '2025-12-04'
tags:
  - philosophy
  - ux
  - relationships
  - architecture
  - discussion
priority: high
created_at: '2025-12-04T06:14:09.463Z'
updated_at: '2025-12-04T06:46:39.892Z'
transitions:
  - status: in-progress
    at: '2025-12-04T06:19:32.562Z'
depends_on:
  - 138-ui-dependencies-dual-view
---

# Rethink: Do We Need `related` as Soft Dependency?

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-04 · **Tags**: philosophy, ux, relationships, architecture, discussion

## Overview

**Trigger**: Even with dual-view (DAG + Network), the dependency graph is hard to visualize. This raises a fundamental question: **does `related` actually help users, or does it just add noise?**

**Current Model**:
- `depends_on` → Hard blocking dependency (A must complete before B starts)
- `related` → Soft bidirectional association (A and B are related topics)

**The Problem**: When visualizing specs:
1. DAG view filters out `related` → incomplete picture
2. Network view includes both → cluttered, hard to read
3. Users are confused about when to use which relationship type

**Core Question**: Is the value of `related` worth the complexity it adds?

## Analysis

### What Problems Does `related` Solve?

**Intended benefits:**
1. **Discovery** - Find specs on similar topics
2. **Context** - Understand broader context when reading a spec
3. **Coordination** - Signal that work is related but not blocking
4. **Navigation** - Jump between related work easily

### What Problems Does `related` Create?

**Observed issues:**
1. **Visualization clutter** - Network graphs become hairballs with many `related` edges
2. **Semantic ambiguity** - When to use `depends_on` vs `related`? Edge cases are confusing
3. **Maintenance burden** - Must manage bidirectional relationships
4. **False signal** - "Related" is so vague it's almost meaningless
5. **AI agent confusion** - Agents struggle to know when to create relationships

### How Are `related` Links Actually Used?

**Common patterns in this project:**

| Pattern | Example | Value Assessment |
|---------|---------|------------------|
| Same feature area | 082 ↔ 097 (both web perf) | **Low** - tags do this better |
| Complementary work | 042 ↔ 043 (error + launch) | **Medium** - helpful context |
| Follow-up work | 035 → 068 (MVP → enhancements) | **Low** - temporal, not blocking |
| Alternative approaches | Option A ↔ Option B | **Low** - rarely maintained |

### Alternative Ways to Achieve Same Goals

| Goal | `related` Solution | Alternative |
|------|-------------------|-------------|
| Discovery | `related: [spec]` | Tags + search |
| Context | View related in sidebar | Spec body mentions with `[[spec]]` |
| Coordination | Bidirectional links | Comments in spec body |
| Navigation | Click to related | Better search + tag filtering |

## Options

### Option 1: Keep Both (Status Quo)

**Keep `depends_on` + `related`**

✅ Pros:
- Backward compatible
- Users already learned the model
- Expressive for complex projects

❌ Cons:
- Visualization is fundamentally hard
- Maintenance burden continues
- Semantic confusion persists

### Option 2: Remove `related` Entirely

**Simplify to just `depends_on`**

✅ Pros:
- **Clean DAG-only visualization**
- **Clear semantics** - every edge means "blocking"
- **Easier AI agent guidance** - one rule: "if it blocks, add depends_on"
- **Tags + search** already handle discovery
- **Lean philosophy** - remove if not essential

❌ Cons:
- Breaking change for existing specs
- Some users may miss soft associations
- Migration effort needed

**Migration path:**
```bash
# Remove all `related` fields
lean-spec migrate --remove-related
```

### Option 3: Replace with "See Also" in Content

**Remove `related` from frontmatter, allow inline references**

```markdown
## See Also

- [[045-unified-dashboard]] - Similar visualization work
- [[082-web-realtime-sync]] - Shared architecture decisions
```

✅ Pros:
- Relationships in context, not metadata
- Prose can explain WHY specs are related
- No graph visualization needed
- More human-readable

❌ Cons:
- Not machine-parseable for tooling
- Manual maintenance
- Breaks existing `deps` command features

### Option 4: Replace with "Groups" or "Epics"

**Use hierarchical grouping instead of graph relationships**

```yaml
# In 045-unified-dashboard
group: visualization
# or
epic: v0.3.0-launch
```

All specs in same group are implicitly related.

✅ Pros:
- Cleaner than explicit links
- Natural clustering
- Works well with project management

❌ Cons:
- New concept to learn
- Doesn't capture arbitrary relationships
- May create too-large groups

### Option 5: Soft Deprecation (Recommended?)

**Keep `related` but discourage use**

1. Update AGENTS.md: "Prefer tags and search over `related` links"
2. Hide `related` from default visualization
3. Allow opt-in viewing of `related` in network view
4. Over time, remove as users stop adding them

✅ Pros:
- No breaking change
- Natural migration
- Users can still use if they find it valuable

❌ Cons:
- Continued complexity in codebase
- Mixed signals to users

## Decision Framework

**Questions to answer:**

1. **Do users actually use `related` links for navigation?**
   - Check: How often do people click related links vs search/tags?

2. **Would removing `related` hurt any real workflow?**
   - Check: Are there power users relying on this feature?

3. **Can tags + search fully replace `related` for discovery?**
   - Check: Search for "web" vs `related: [082, 083, 097]`

4. **What do AI agents actually do with `related`?**
   - Check: Agent behavior when `related` vs no relationship

## Decision

✅ **Option 2: Remove `related` Entirely**

**Rationale:**

1. **Lean philosophy**: If a feature doesn't clearly earn its place, remove it
2. **Visualization**: DAG-only is dramatically simpler and more useful
3. **Tags are better for discovery**: `tags: [web, performance]` is cleaner than explicit links
4. **Context Economy**: Fewer concepts to explain = better onboarding
5. **AI-first design**: Simpler model = easier for agents to follow

**Key insight**: The dependency graph should show **work order**, not **conceptual relationships**. Those belong in tags, search, and prose.

**Migration strategy**: Strip `related` fields from all specs. No data loss concern — the information is redundant with tags.

## Plan

**If we proceed with removal:**

- [ ] Audit current `related` usage across all specs
- [ ] Assess impact on users/workflows
- [ ] Update visualization to DAG-only (simplify code)
- [ ] Update AGENTS.md to remove `related` guidance
- [ ] Create migration command to strip `related` fields
- [ ] Update docs to reflect new model
- [ ] Announce deprecation with reasoning

**If we keep (soft deprecation):**

- [ ] Update AGENTS.md: "Prefer tags over `related`"
- [ ] Make network view opt-in (hidden by default)
- [ ] Stop encouraging `related` in templates
- [ ] Monitor usage over time

## Test

- [ ] Survey: Do users find `related` valuable?
- [ ] Compare: Spec discovery via tags vs `related` links
- [ ] Visualize: DAG-only vs DAG+Network clarity comparison
- [ ] AI agents: Test agent behavior with simpler model

## Notes

### Historical Context

The `related` field was added in [044-spec-relationships-clarity](../archived/044-spec-relationships-clarity) to:
- Distinguish from blocking `depends_on`
- Enable bidirectional soft references
- Match user expectations that "related" means mutual

The archived spec already noted: "related sounds symmetric" was driving the design.

### What Other Tools Do

| Tool | Blocking Deps | Soft Relations | Discovery |
|------|--------------|----------------|-----------|
| GitHub Issues | ❌ | "Related to #123" in body | Search, labels |
| Jira | Links (blocks/blocked by) | Links (relates to) | Labels, JQL |
| Linear | Dependencies | ❌ (just deps) | Tags, search |
| Notion | ❌ | Relations property | Search, tags |

**Linear** notably has NO soft relations - just dependencies. Their graph is clean.

### The "Related" vs "Tags" Trade-off

**Using `related`:**
```yaml
related: [082-web-realtime-sync, 097-dag-visualization]
```
- Explicit links to specific specs
- Bidirectional maintenance required
- Shows in deps command/graph

**Using tags:**
```yaml
tags: [web, visualization, dependencies]
```
- Implicit grouping by topic
- No maintenance overhead
- Search/filter instead of graph

For discovery: **Tags win** (less maintenance, more flexible)
For context: **Spec body mentions win** (prose explains relationship)
For blocking work order: **`depends_on` wins** (that's its job)

**What role is left for `related`?** 🤔

### Impact on `/dependencies` Page

If we remove `related`:
- No need for dual view (DAG/Network) - just DAG
- Delete ~200 lines of force-layout code
- Simpler mental model for users
- Clearer visualization

This isn't about technical capability - it's about **whether the capability helps users**.
