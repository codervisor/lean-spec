---
status: planned
created: '2025-11-13'
tags:
  - cli
  - mcp
  - dx
  - ai-agents
  - relationships
priority: high
created_at: '2025-11-13T09:03:06.741Z'
---

# Programmatic Spec Relationship Management

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-13

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: AI agents cannot efficiently manage spec relationships (`depends_on`, `related` fields) because there's no programmatic interface.

**Current State**:
- `lean-spec deps <spec>` - Views relationships ✅
- Manual frontmatter editing - Only way to add/remove relationships ❌
- **No CLI command** to add/modify relationships
- **No MCP tool** to manage dependencies

**Pain Points**:
1. **AI agents must manually edit YAML frontmatter** - error-prone, fragile
2. **No validation** - can add invalid spec references, typos
3. **Asymmetric workflow** - can update `status`, `priority`, `tags` via CLI, but not `depends_on`/`related`
4. **Documented as manual-only** - AGENTS.md explicitly says "must currently be edited manually"

**Example AI workflow today** (broken):
```bash
# AI agent creating spec with dependencies
lean-spec create new-feature --priority high
# Now AI must:
# 1. Read the file
# 2. Parse YAML frontmatter
# 3. Edit YAML manually
# 4. Write back
# Risk: YAML corruption, validation bypass, inefficient
```

**Goal**: Provide programmatic interface for managing spec relationships via CLI and MCP.

**Related Specs**:
- `073-template-engine-agents-md` - AI-first design principles
- `072-ai-agent-first-use-workflow` - AI agent UX optimization

## Design

### Proposed CLI Commands

#### Add Relationships
```bash
# Add dependency (blocks creation)
lean-spec deps add 076 --depends-on 073,074

# Add related specs (informational)
lean-spec deps add 076 --related 072,025

# Combined
lean-spec deps add 076 --depends-on 073 --related 072,074
```

#### Remove Relationships
```bash
# Remove specific dependency
lean-spec deps remove 076 --depends-on 073

# Remove specific related
lean-spec deps remove 076 --related 072

# Remove all dependencies
lean-spec deps remove 076 --depends-on --all

# Remove all relationships
lean-spec deps remove 076 --all
```

#### View Relationships (already exists)
```bash
lean-spec deps 076  # Already implemented ✅
```

### Proposed MCP Tools

#### Add to MCP Server
```typescript
{
  name: "mcp_lean-spec_deps-add",
  description: "Add dependencies or related specs to a specification",
  inputSchema: {
    specPath: string,     // Spec to modify
    dependsOn?: string[], // Dependencies to add
    related?: string[]    // Related specs to add
  }
}

{
  name: "mcp_lean-spec_deps-remove", 
  description: "Remove dependencies or related specs from a specification",
  inputSchema: {
    specPath: string,
    dependsOn?: string[],
    related?: string[],
    all?: boolean         // Remove all relationships
  }
}
```

### Implementation Details

**Validation Requirements**:
- Verify target specs exist before adding
- Prevent circular dependencies in `depends_on`
- Allow bidirectional `related` (auto-inferred)
- Validate spec path format (number, name, or full path)

**Behavior**:
- `depends_on`: Directional, must be explicit on both sides
- `related`: Bidirectional, shown from both sides automatically (already implemented in `deps` view)

**Edge Cases**:
- Adding duplicate relationships: Deduplicate silently
- Adding non-existent spec: Error with suggestion
- Self-reference: Error
- Circular `depends_on`: Detect and error

### Alternative Approaches Considered

**1. Generic `lean-spec update` extension**:
```bash
lean-spec update 076 --depends-on 073,074
```
- ❌ Doesn't distinguish add vs set vs remove
- ❌ Unclear if it appends or replaces
- ✅ Consistent with existing `update` command

**2. Separate add/remove/set commands**:
```bash
lean-spec deps-add 076 --depends-on 073
lean-spec deps-remove 076 --related 072
```
- ❌ Clutters command namespace
- ✅ Very explicit

**3. Chosen approach: Subcommands under `deps`**:
```bash
lean-spec deps add 076 --depends-on 073
lean-spec deps remove 076 --related 072
```
- ✅ Namespaced under existing `deps` command
- ✅ Explicit add/remove semantics
- ✅ Matches `deps` for viewing

## Plan

- [ ] **CLI Implementation**
  - [ ] Add `deps add` subcommand to CLI
  - [ ] Add `deps remove` subcommand to CLI
  - [ ] Implement relationship validation logic
  - [ ] Detect circular dependencies in `depends_on`
  - [ ] Add unit tests for validation
  - [ ] Add integration tests for CLI commands

- [ ] **MCP Implementation**
  - [ ] Add `mcp_lean-spec_deps-add` tool
  - [ ] Add `mcp_lean-spec_deps-remove` tool
  - [ ] Wire up to CLI functionality
  - [ ] Add MCP tool tests

- [ ] **Documentation**
  - [ ] Update AGENTS.md: Remove "manual edit only" note
  - [ ] Add relationship management to CLI docs
  - [ ] Add examples to guide docs
  - [ ] Update spec 073 to reference this capability

- [ ] **Validation**
  - [ ] Test with AI agents (verify workflow improvement)
  - [ ] Verify `deps` view shows changes correctly
  - [ ] Test circular dependency detection
  - [ ] Test non-existent spec error messages

## Test

**CLI Tests**:

```bash
# 1. Add dependencies
lean-spec deps add 076 --depends-on 073,074
lean-spec deps 076
# Expected: Shows "Depends On: 073, 074"

# 2. Add related specs
lean-spec deps add 076 --related 072,025
lean-spec deps 076
# Expected: Shows "Related Specs: 072, 025"

# 3. Remove specific dependency
lean-spec deps remove 076 --depends-on 073
lean-spec deps 076
# Expected: Shows "Depends On: 074" (073 removed)

# 4. Validation: Non-existent spec
lean-spec deps add 076 --depends-on 999
# Expected: Error "Spec 999 not found. Did you mean: ..."

# 5. Validation: Circular dependency
lean-spec deps add 073 --depends-on 076
# Expected: Error "Circular dependency detected: 076 → 073 → 076"

# 6. Validation: Self-reference
lean-spec deps add 076 --depends-on 076
# Expected: Error "Cannot depend on self"
```

**MCP Tests**:

```typescript
// 1. Add via MCP
await mcp_lean_spec_deps_add({
  specPath: "076",
  dependsOn: ["073", "074"],
  related: ["072"]
});

// 2. Verify via deps view
await mcp_lean_spec_deps({ specPath: "076" });
// Expected: Shows all relationships

// 3. Remove via MCP
await mcp_lean_spec_deps_remove({
  specPath: "076",
  dependsOn: ["073"]
});
```

**AI Agent Workflow Test**:

```
Scenario: AI agent creating spec with dependencies

Before (manual edit):
1. Create spec: lean-spec create new-feature
2. Read README.md
3. Parse YAML
4. Edit frontmatter
5. Write back
Risk: YAML corruption

After (programmatic):
1. Create spec: lean-spec create new-feature  
2. Add deps: lean-spec deps add new-feature --depends-on 073,074
Done. Safe, validated, efficient.
```

## Notes

### Why This Matters

**Root Cause**: Spec relationships are documented in AGENTS.md as "manual edit only" because no programmatic interface exists. This is:
- **Inconsistent**: Other frontmatter fields have CLI commands (`update` for status, priority, tags)
- **Error-prone**: Manual YAML editing bypasses validation
- **AI-unfriendly**: Agents must parse/edit YAML instead of using structured commands

**Impact**: AI agents struggle with relationship management, leading to:
- Missed dependencies
- Incorrect relationships
- Manual intervention required

### Future Enhancements

1. **Bulk operations**: `lean-spec deps add 076 --depends-on $(lean-spec list --status planned --format ids)`
2. **Dependency graph validation**: Detect longer circular chains
3. **Relationship suggestions**: "Spec 076 imports from 073, add dependency?"
4. **Dependency impact analysis**: "Completing 073 unblocks 076, 077"

### Success Criteria

- AI agents can manage relationships without manual YAML editing
- AGENTS.md updated to reflect programmatic interface
- Validation prevents invalid relationships
- Workflow parity with other frontmatter fields (`status`, `priority`, `tags`)

## Notes

<!-- Optional: Research findings, alternatives considered, open questions -->
