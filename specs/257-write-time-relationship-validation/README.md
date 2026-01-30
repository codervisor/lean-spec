---
status: in-progress
created: 2026-01-30
priority: medium
tags:
- cli
- mcp
- validation
- hierarchy
- parent
- dependencies
- relationships
depends_on:
- 250-structured-spec-hierarchy-management
parent: 250-structured-spec-hierarchy-management
created_at: 2026-01-30T02:29:00.569713Z
updated_at: 2026-01-30T03:21:20.388030Z
transitions:
- status: in-progress
  at: 2026-01-30T03:21:20.388030Z
---

# Write-Time Relationship Validation

## Overview

### Problem

Currently, relationship validation is incomplete at write-time:

| Layer                | Parent Cycle | Dep Cycle | Self-Ref | Hierarchy/Dep Conflict |
| -------------------- | ------------ | --------- | -------- | ---------------------- |
| `lean-spec validate` | ✅ Full       | ✅ Full    | ✅        | ❌                      |
| MCP `set_parent`     | ⚠️ Self only  | N/A       | ✅        | ❌                      |
| MCP `link`           | N/A          | ❌         | ❌        | ❌                      |
| MCP `relationships`  | ❌            | ❌         | ❌        | ❌                      |
| CLI `rel add`        | ❌            | ❌         | ❌        | ❌                      |

This allows invalid states:
1. **Parent cycles**: `A→B→C→A` in parent chain
2. **Dependency cycles**: `A depends_on B depends_on C depends_on A`
3. **Hierarchy/dependency conflicts**: A spec that `depends_on` its own parent or children

### Solution

Add comprehensive write-time validation for all relationship operations:

1. **Parent cycle detection** - Prevent `A→B→C→A` in parent chain
2. **Dependency cycle detection** - Prevent `A→B→C→A` in depends_on chain
3. **Hierarchy/dependency conflict detection** - Prevent overlapping relationships

## Design

### Validation Rules

| Rule                               | Description                             | Example                                 |
| ---------------------------------- | --------------------------------------- | --------------------------------------- |
| **No parent cycles**               | Cannot create circular parent chain     | `A→B→A` blocked                         |
| **No dependency cycles**           | Cannot create circular dependency chain | `A depends_on B depends_on A` blocked   |
| **No self-dependency**             | Cannot depend on yourself               | `A depends_on A` blocked                |
| **No depends_on parent**           | Cannot depend on your own parent        | If parent=B, `depends_on: B` blocked    |
| **No depends_on children**         | Cannot depend on your own children      | If child=C, `depends_on: C` blocked     |
| **Parent cannot depends_on child** | Inverse of above                        | If parent of C, `depends_on: C` blocked |

### Error Messages

```
Error: Cannot set parent - would create cycle: A → B → C → A

Error: Cannot add dependency - would create cycle: A → B → C → A

Error: Cannot add dependency - spec already has hierarchy relationship:
  257 has parent 250, cannot also depend on 250
  Use hierarchy (parent/child) OR dependency, not both for same spec pair.

Error: Cannot add dependency - target is a child of this spec:
  250 is parent of 257, cannot depend on its own child
```

### Cycle Detection Algorithm

Reuse the existing algorithm from `validate.rs`:

```rust
fn would_create_parent_cycle(
    child_spec: &str,
    new_parent: &str,
    spec_map: &HashMap<String, SpecInfo>,
) -> bool {
    // Walk up from new_parent's ancestors
    // If we find child_spec, setting this parent would create a cycle
    let mut seen = HashSet::new();
    let mut current = new_parent.to_string();
    
    while let Some(spec) = spec_map.get(&current) {
        if current == child_spec {
            return true; // Found the child in parent's ancestry = cycle
        }
        let Some(parent) = spec.frontmatter.parent.as_deref() else {
            return false;
        };
        if !seen.insert(parent.to_string()) {
            return false; // Existing cycle in data, not our problem here
        }
        current = parent.to_string();
    }
    false
}
```

### Dependency Cycle Detection

Reuse the existing `DependencyGraph::has_circular_dependency` from `leanspec-core`:

```rust
fn would_create_dependency_cycle(
    spec: &str,
    new_dep: &str,
    specs: &[SpecInfo],
) -> bool {
    // Build a temporary graph with the new dependency added
    // Check if new_dep can reach spec through existing depends_on chains
    // If yes, adding spec → new_dep would create a cycle
    
    let mut visited = HashSet::new();
    let mut stack = vec![new_dep.to_string()];
    
    while let Some(current) = stack.pop() {
        if current == spec {
            return true; // new_dep leads back to spec = cycle
        }
        if !visited.insert(current.clone()) {
            continue;
        }
        if let Some(spec_info) = specs.iter().find(|s| s.path == current) {
            for dep in &spec_info.frontmatter.depends_on {
                stack.push(dep.clone());
            }
        }
    }
    false
}
```

### Hierarchy/Dependency Conflict Detection

```rust
fn has_hierarchy_dependency_conflict(
    spec: &str,
    new_dep: &str,
    specs: &[SpecInfo],
) -> Option<ConflictType> {
    let spec_info = specs.iter().find(|s| s.path == spec)?;
    
    // Check if new_dep is the parent
    if spec_info.frontmatter.parent.as_deref() == Some(new_dep) {
        return Some(ConflictType::DependsOnParent);
    }
    
    // Check if new_dep is a child (has this spec as parent)
    let is_child = specs.iter().any(|s| {
        s.frontmatter.parent.as_deref() == Some(spec) && s.path == new_dep
    });
    if is_child {
        return Some(ConflictType::DependsOnChild);
    }
    
    None
}
```

### Locations to Update

1. **MCP `tool_set_parent`** - rust/leanspec-mcp/src/tools.rs
2. **MCP `tool_link`** - rust/leanspec-mcp/src/tools.rs (dependency cycles)
3. **MCP `tool_relationships`** (action=add, type=parent or depends_on)
4. **CLI `rel add`** - rust/leanspec-cli/src/commands/rel.rs

### Shared Utility

Extract validation to `leanspec-core` so both CLI and MCP can use it:

```rust
// leanspec-core/src/relationships.rs

pub enum RelationshipError {
    ParentCycle { path: Vec<String> },
    DependencyCycle { path: Vec<String> },
    SelfDependency { spec: String },
    DependsOnParent { spec: String, parent: String },
    DependsOnChild { spec: String, child: String },
}

/// Check if setting parent would create a cycle
pub fn validate_parent_assignment(
    child_spec: &str,
    new_parent: &str,
    specs: &[SpecInfo],
) -> Result<(), RelationshipError>

/// Check if adding dependency would create a cycle
pub fn validate_dependency_cycle(
    spec: &str,
    new_dep: &str,
    specs: &[SpecInfo],
) -> Result<(), RelationshipError>

/// Check if adding dependency conflicts with hierarchy
pub fn validate_dependency_addition(
    spec: &str,
    new_dep: &str,
    specs: &[SpecInfo],
) -> Result<(), RelationshipError>
```

## Plan

### Phase 1: Parent Cycle Detection
- [ ] Extract cycle detection to shared utility in leanspec-core
- [ ] Add cycle check to MCP `set_parent` tool
- [ ] Add cycle check to MCP `relationships` tool (parent operations)
- [ ] Add cycle check to CLI `rel add --parent` command
- [ ] Add descriptive error message showing the cycle path

### Phase 1.5: Dependency Cycle Detection
- [ ] Add dependency cycle check to MCP `link` tool
- [ ] Add dependency cycle check to MCP `relationships` tool (depends_on operations)
- [ ] Add dependency cycle check to CLI `rel add --depends-on` command
- [ ] Add descriptive error message showing the cycle path

### Phase 2: Hierarchy/Dependency Conflict Detection
- [ ] Implement conflict detection in leanspec-core
- [ ] Add conflict check to MCP `relationships` tool (depends_on operations)
- [ ] Add conflict check to CLI `rel add --depends-on` command
- [ ] Add clear error messages explaining the conflict

### Phase 3: Documentation
- [ ] Update SKILL.md with relationship decision tree
- [ ] Add examples to CLI help

## Test

**Parent Cycles:**
- [ ] Direct self-reference rejected: `A → A`
- [ ] Two-node cycle rejected: `A → B → A`
- [ ] Multi-node cycle rejected: `A → B → C → A`
- [ ] Valid parent assignment works

**Dependency Cycles:**
- [ ] Self-dependency rejected: `A depends_on A`
- [ ] Two-node cycle rejected: `A depends_on B depends_on A`
- [ ] Multi-node cycle rejected: `A → B → C → A`
- [ ] Valid dependency addition works

**Hierarchy/Dependency Conflicts:**
- [ ] Cannot `depends_on` your own parent
- [ ] Cannot `depends_on` your own children
- [ ] Parent cannot `depends_on` its child
- [ ] Unrelated specs can have dependencies freely
- [ ] Clearing relationships always works

**Error Messages:**
- [ ] Parent cycle error shows full path
- [ ] Dependency cycle error shows full path
- [ ] Conflict error explains the issue clearly

## Notes

### AI Agent Guidance

To be added to leanspec-sdd SKILL.md:

```markdown
## Choosing Relationship Type

**Parent/Child** = Decomposition (organizational)
- "This spec is a piece of that umbrella's scope"
- Spec doesn't make sense without the parent context
- Parent completes when all children complete

**Depends On** = Blocking (technical)  
- "This spec needs that spec done first"
- Specs are independent work items
- Could be completely unrelated areas

**Rule**: Never use both parent AND depends_on for the same spec pair.

**Test**: If the other spec didn't exist, would your spec still make sense?
- NO → Use parent (it's part of that scope)
- YES → Use depends_on (it's just a blocker)
```

### Related Work

- Parent spec: 250-structured-spec-hierarchy-management
- Unified commands: 254-streamlined-relationship-commands
- Existing validation: rust/leanspec-cli/src/commands/validate.rs

### Backwards Compatibility

No breaking changes - this adds validation that prevents invalid states.