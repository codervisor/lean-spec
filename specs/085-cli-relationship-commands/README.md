---
status: complete
created: '2025-11-16'
tags:
  - cli
  - metadata
  - relationships
  - dx
priority: medium
created_at: '2025-11-16T13:33:40.858Z'
depends_on: []
updated_at: '2025-11-16T14:08:51.283Z'
related: []
completed_at: '2025-11-16T14:08:51.283Z'
completed: '2025-11-16'
transitions:
  - status: complete
    at: '2025-11-16T14:08:51.283Z'
---

# CLI Commands for Spec Relationship Management

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-16 · **Tags**: cli, metadata, relationships, dx

**Project**: lean-spec  
**Team**: Core Development

## Overview

**The Problem**: Relationship fields (`depends_on`, `related`) currently require manual frontmatter editing, which:

1. **Violates Core Rule #6**: "NEVER manually edit system-managed frontmatter"
2. **Error-prone**: Easy to create invalid spec references (typos, non-existent specs)
3. **No validation**: Can break `lean-spec deps` without knowing
4. **Inconsistent with other metadata**: Status, priority, tags use `lean-spec update`, but relationships don't
5. **Poor DX**: Have to remember YAML syntax, indentation, array format

**Current Workaround** (from AGENTS.md):
```yaml
# Manual editing required - no CLI command exists yet
depends_on: [042, 035]
related: [081, 068]
```

**What We Need**: CLI commands to manage relationships safely:
```bash
lean-spec link 085 --depends-on 042,035
lean-spec link 085 --related 081,068
lean-spec unlink 085 --depends-on 042
lean-spec deps 085  # Verify relationships
```

**Why It Matters**:
- Consistency with existing `lean-spec update` command
- Validation prevents broken relationships
- Enables automation (scripts, CI/CD)
- Better error messages
- Completes the metadata management story

## Design

### Command Design: `lean-spec link` and `lean-spec unlink`

**Rationale**: Use dedicated `link`/`unlink` commands instead of extending `lean-spec update` because:
1. Relationships are **bidirectional** or **directional** (different from simple metadata)
2. Need **add/remove** semantics (not just set/replace)
3. Clear intent: "linking specs" vs "updating metadata"
4. Future-proof for advanced relationship features (types, labels, etc.)

### Command Interface

```bash
# Add relationships
lean-spec link <spec> --depends-on <spec1,spec2,...>
lean-spec link <spec> --related <spec1,spec2,...>
lean-spec link <spec> --blocks <spec1,spec2,...>  # Inverse of depends-on

# Remove relationships
lean-spec unlink <spec> --depends-on <spec1,spec2,...>
lean-spec unlink <spec> --related <spec1,spec2,...>
lean-spec unlink <spec> --blocks <spec1,spec2,...>

# Remove all relationships of a type
lean-spec unlink <spec> --depends-on --all
lean-spec unlink <spec> --related --all

# View relationships (existing command)
lean-spec deps <spec>
```

### Examples

**Adding dependencies:**
```bash
# Spec 085 depends on specs 042 and 035
lean-spec link 085 --depends-on 042,035

# Result in 085-cli-relationship-commands/README.md:
# depends_on: [042, 035]
```

**Adding related specs:**
```bash
# Spec 082 is related to 035, 068, 081, 083
lean-spec link 082 --related 035,068,081,083

# Result: related: [035, 068, 081, 083]
```

**Removing dependencies:**
```bash
# Remove dependency on 042
lean-spec unlink 085 --depends-on 042

# Result: depends_on: [035]  (042 removed)
```

**Bidirectional relationships (related):**
```bash
# Link 085 to 082 (automatically updates both specs)
lean-spec link 085 --related 082

# Result:
# - 085/README.md: related: [082]
# - 082/README.md: related: [035, 068, 081, 083, 085]  (085 added)
```

**Directional dependencies (depends_on → blocks):**
```bash
# Spec 085 depends on 042
lean-spec link 085 --depends-on 042

# View from 085's perspective:
lean-spec deps 085
# Depends On:
#   → 042-mcp-error-handling [complete]

# View from 042's perspective:
lean-spec deps 042
# Required By:
#   ← 085-cli-relationship-commands [planned]
```

### Validation Rules

**Spec Existence:**
- ✅ Validate all referenced specs exist before linking
- ❌ Error if spec not found: "Spec 999 not found in specs/"

**Duplicate Prevention:**
- ✅ Skip if relationship already exists (idempotent)
- ✅ Show warning: "Relationship already exists"

**Cycle Detection:**
- ⚠️ Warn on dependency cycles (A → B → C → A)
- ✅ Allow cycles (don't block, just warn)

**Self-Reference:**
- ❌ Error if spec references itself
- ❌ "Cannot link spec to itself"

**Conflict Detection:**
- ⚠️ Warn if spec is both `depends_on` and `related` to same spec
- ❌ Error if A depends on B and B depends on A (mutual dependency)

### Implementation Details

**File Structure:**
```typescript
// packages/cli/src/commands/link.ts
export function linkCommand(): Command {
  return new Command('link')
    .description('Link specs with relationships')
    .argument('<spec>', 'Spec to update')
    .option('--depends-on <specs>', 'Add dependencies (comma-separated)')
    .option('--related <specs>', 'Add related specs (comma-separated)')
    .option('--blocks <specs>', 'Specs this blocks (inverse of depends-on)')
    .action(async (spec, options) => { ... });
}

// packages/cli/src/commands/unlink.ts
export function unlinkCommand(): Command {
  return new Command('unlink')
    .description('Remove spec relationships')
    .argument('<spec>', 'Spec to update')
    .option('--depends-on <specs>', 'Remove dependencies')
    .option('--related <specs>', 'Remove related specs')
    .option('--all', 'Remove all relationships of specified type')
    .action(async (spec, options) => { ... });
}
```

**Core Logic:**
```typescript
// packages/cli/src/relationships.ts
import { getSpecFile, updateFrontmatter, parseFrontmatter } from './frontmatter.js';
import { resolveSpecPath } from './utils/path-helpers.js';

interface RelationshipUpdate {
  dependsOn?: string[];
  related?: string[];
  operation: 'add' | 'remove';
}

export async function updateRelationships(
  specPath: string,
  update: RelationshipUpdate
): Promise<void> {
  // 1. Resolve spec path
  const resolved = await resolveSpecPath(specPath, ...);
  
  // 2. Read current frontmatter
  const specFile = await getSpecFile(resolved, ...);
  const { data: frontmatter } = parseFrontmatter(specFile);
  
  // 3. Validate referenced specs exist
  for (const ref of [...(update.dependsOn || []), ...(update.related || [])]) {
    const exists = await resolveSpecPath(ref, ...);
    if (!exists) throw new Error(`Spec ${ref} not found`);
  }
  
  // 4. Update arrays (add or remove)
  const newDependsOn = updateArray(
    frontmatter.depends_on || [],
    update.dependsOn || [],
    update.operation
  );
  
  const newRelated = updateArray(
    frontmatter.related || [],
    update.related || [],
    update.operation
  );
  
  // 5. Handle bidirectional relationships (related)
  if (update.related && update.operation === 'add') {
    await updateBidirectionalRelated(specPath, update.related);
  }
  
  // 6. Write updated frontmatter
  await updateFrontmatter(specFile, {
    depends_on: newDependsOn.length > 0 ? newDependsOn : undefined,
    related: newRelated.length > 0 ? newRelated : undefined,
  });
  
  // 7. Detect cycles and warn
  if (newDependsOn.length > 0) {
    await detectCycles(specPath, newDependsOn);
  }
}

function updateArray(
  current: string[],
  items: string[],
  operation: 'add' | 'remove'
): string[] {
  if (operation === 'add') {
    // Add items, avoiding duplicates
    const set = new Set([...current, ...items]);
    return Array.from(set).sort();
  } else {
    // Remove items
    return current.filter(x => !items.includes(x));
  }
}

async function updateBidirectionalRelated(
  sourceSpec: string,
  targetSpecs: string[]
): Promise<void> {
  // For each target spec, add sourceSpec to its related array
  for (const target of targetSpecs) {
    const targetFile = await getSpecFile(...);
    const { data } = parseFrontmatter(targetFile);
    
    const related = data.related || [];
    if (!related.includes(sourceSpec)) {
      related.push(sourceSpec);
      await updateFrontmatter(targetFile, {
        related: related.sort()
      });
    }
  }
}

async function detectCycles(
  spec: string,
  dependencies: string[],
  visited: Set<string> = new Set()
): Promise<void> {
  if (visited.has(spec)) {
    console.warn(`⚠️  Dependency cycle detected: ${Array.from(visited).join(' → ')} → ${spec}`);
    return;
  }
  
  visited.add(spec);
  
  for (const dep of dependencies) {
    const depFile = await getSpecFile(...);
    const { data } = parseFrontmatter(depFile);
    if (data.depends_on) {
      await detectCycles(dep, data.depends_on, new Set(visited));
    }
  }
}
```

### User Experience

**Success Messages:**
```bash
$ lean-spec link 085 --depends-on 042,035
✓ Added dependencies: 042, 035
  Updated: specs/085-cli-relationship-commands/README.md

$ lean-spec link 085 --related 082
✓ Added related: 082
  Updated: specs/085-cli-relationship-commands/README.md
  Updated: specs/082-web-realtime-sync-architecture/README.md (bidirectional)

$ lean-spec unlink 085 --depends-on 042
✓ Removed dependency: 042
  Updated: specs/085-cli-relationship-commands/README.md
```

**Error Messages:**
```bash
$ lean-spec link 085 --depends-on 999
✗ Error: Spec 999 not found
  Searched: 999, 999-*, specs/999

$ lean-spec link 085 --depends-on 085
✗ Error: Cannot link spec to itself

$ lean-spec link 085 --depends-on 042
⚠️  Dependency cycle detected: 085 → 042 → 035 → 085
✓ Added dependency: 042 (cycle warning above)
```

### Integration with `lean-spec deps`

**Current behavior** (already exists):
```bash
$ lean-spec deps 085
Depends On:
  → 042-mcp-error-handling [complete]
  → 035-live-specs-showcase [in-progress]

Related Specs:
  ⟷ 082-web-realtime-sync-architecture [in-progress]

Required By:
  ← 086-future-spec [planned]
```

**No changes needed** - `deps` command already reads frontmatter correctly.

## Plan

### Phase 1: Core Commands (Days 1-2)

**Day 1: `link` Command**
- [ ] Create `packages/cli/src/commands/link.ts`
- [ ] Create `packages/cli/src/relationships.ts` (shared logic)
- [ ] Implement spec existence validation
- [ ] Implement `--depends-on` option (add dependencies)
- [ ] Implement `--related` option (add related specs)
- [ ] Implement bidirectional update for `related`
- [ ] Add tests for link command
- [ ] Update CLI index to register command

**Day 2: `unlink` Command**
- [ ] Create `packages/cli/src/commands/unlink.ts`
- [ ] Implement `--depends-on` option (remove dependencies)
- [ ] Implement `--related` option (remove related specs)
- [ ] Implement `--all` flag (remove all of type)
- [ ] Handle bidirectional removal for `related`
- [ ] Add tests for unlink command

### Phase 2: Validation & Safety (Day 3)

**Validation:**
- [ ] Duplicate prevention (idempotent operations)
- [ ] Self-reference detection
- [ ] Cycle detection (warn, don't block)
- [ ] Conflict detection (mutual dependencies)
- [ ] Format validation (spec number/name)

**Error Handling:**
- [ ] Graceful failure messages
- [ ] Rollback on partial failure
- [ ] Dry-run mode (`--dry-run`)
- [ ] Verbose mode (`--verbose`)

### Phase 3: Advanced Features (Day 4 - Optional)

**Nice-to-have:**
- [ ] `--blocks` option (inverse of depends-on)
- [ ] Bulk operations (link multiple specs at once)
- [ ] Interactive mode (prompt for relationships)
- [ ] Graph visualization (`lean-spec graph`)

### Phase 4: Documentation & Migration (Day 5)

**Documentation:**
- [ ] Update AGENTS.md (remove manual editing exception)
- [ ] Update CLI help text
- [ ] Add examples to README
- [ ] Update contributing guide

**Migration:**
- [ ] Validate all existing relationships in specs/
- [ ] Fix any broken references
- [ ] Test commands on real specs

## Test

### Unit Tests

**Validation Tests:**
```typescript
describe('updateRelationships', () => {
  it('validates spec existence', async () => {
    await expect(
      updateRelationships('085', { dependsOn: ['999'], operation: 'add' })
    ).rejects.toThrow('Spec 999 not found');
  });
  
  it('prevents self-reference', async () => {
    await expect(
      updateRelationships('085', { dependsOn: ['085'], operation: 'add' })
    ).rejects.toThrow('Cannot link spec to itself');
  });
  
  it('detects cycles', async () => {
    // Setup: 042 depends on 035, 035 depends on 085
    await updateRelationships('085', { dependsOn: ['042'], operation: 'add' });
    // Should warn about cycle: 085 → 042 → 035 → 085
  });
  
  it('is idempotent (adding existing relationship)', async () => {
    await updateRelationships('085', { dependsOn: ['042'], operation: 'add' });
    await updateRelationships('085', { dependsOn: ['042'], operation: 'add' });
    // Should only appear once
  });
});
```

**Bidirectional Tests:**
```typescript
describe('bidirectional related', () => {
  it('updates both specs when adding related', async () => {
    await updateRelationships('085', { related: ['082'], operation: 'add' });
    
    // Check 085 has 082
    const spec085 = await getSpecFile('085');
    expect(spec085.related).toContain('082');
    
    // Check 082 has 085
    const spec082 = await getSpecFile('082');
    expect(spec082.related).toContain('085');
  });
  
  it('removes from both specs when unlinking', async () => {
    await updateRelationships('085', { related: ['082'], operation: 'remove' });
    
    // Check both specs
    const spec085 = await getSpecFile('085');
    expect(spec085.related).not.toContain('082');
    
    const spec082 = await getSpecFile('082');
    expect(spec082.related).not.toContain('085');
  });
});
```

### Integration Tests

**CLI Tests:**
```bash
# Test link command
$ lean-spec link test-spec --depends-on 042
# Verify: test-spec/README.md has depends_on: [042]

$ lean-spec link test-spec --related 082
# Verify: both specs updated

# Test unlink command
$ lean-spec unlink test-spec --depends-on 042
# Verify: depends_on removed or array updated

# Test validation
$ lean-spec link test-spec --depends-on 999
# Verify: error message shown

# Test bidirectional
$ lean-spec deps test-spec
# Verify: relationships displayed correctly
```

### Manual Testing Checklist

**Basic Operations:**
- [ ] Add single dependency works
- [ ] Add multiple dependencies works (comma-separated)
- [ ] Add related spec updates both specs
- [ ] Remove dependency works
- [ ] Remove all dependencies works (`--all`)

**Validation:**
- [ ] Non-existent spec shows error
- [ ] Self-reference shows error
- [ ] Cycle detection shows warning
- [ ] Duplicate add is idempotent (no error)

**Edge Cases:**
- [ ] Empty relationships (no depends_on/related) handled
- [ ] Spec with no frontmatter handled
- [ ] Removing non-existent relationship is safe (no error)
- [ ] Unicode in spec names handled

**Integration:**
- [ ] `lean-spec deps` shows correct relationships
- [ ] Updated relationships persist across commands
- [ ] Works with spec numbers (042) and names (mcp-error-handling)

## Notes

### Design Decisions

**Why `link`/`unlink` instead of extending `lean-spec update`?**
- Relationships are conceptually different from simple metadata
- Need add/remove semantics (not set/replace)
- Bidirectional updates require special handling
- Future-proof for relationship types, labels, etc.
- Clearer command intent ("link specs" vs "update metadata")

**Why allow dependency cycles with warning?**
- Real-world projects have circular dependencies
- Blocking would be too restrictive
- Warning gives visibility without preventing work
- Can add `--strict` flag later if needed

**Why bidirectional for `related` but not `depends_on`?**
- `related` is symmetric: if A relates to B, B relates to A
- `depends_on` is directional: A depends on B ≠ B depends on A
- `lean-spec deps` shows both perspectives (`→` and `←`)

**Why not `--blocks` initially?**
- Syntactic sugar for inverse of `depends_on`
- Can compute from existing data
- Add later if users request it
- Keeps MVP simpler

### Alternative Approaches Considered

**1. Extend `lean-spec update`**
```bash
lean-spec update 085 --add-dependency 042
lean-spec update 085 --remove-dependency 042
```
- **Pros**: Fewer commands, consistent with update
- **Cons**: Awkward syntax, hard to extend, no bidirectional handling
- **Verdict**: ❌ Too limiting

**2. Separate commands per relationship type**
```bash
lean-spec add-dependency 085 042
lean-spec remove-dependency 085 042
lean-spec add-related 085 082
```
- **Pros**: Very explicit
- **Cons**: Too many commands, verbose
- **Verdict**: ❌ Command explosion

**3. Unified `link`/`unlink` with options (Chosen)**
```bash
lean-spec link 085 --depends-on 042 --related 082
lean-spec unlink 085 --depends-on 042
```
- **Pros**: Flexible, extensible, clear intent
- **Cons**: Slightly longer syntax
- **Verdict**: ✅ Best balance

**4. Interactive mode only**
```bash
lean-spec link 085
> Add dependency: 042
> Add related: 082
```
- **Pros**: User-friendly
- **Cons**: Not scriptable, slow for automation
- **Verdict**: ❌ Too limited (can add as optional mode)

### Open Questions

- [ ] Should `--blocks` be included in MVP? (Defer to Phase 3)
- [ ] How to handle renamed/moved specs? (Out of scope - separate spec)
- [ ] Should we support relationship types (e.g., "implements", "extends")? (Future)
- [ ] Graph visualization format? (Mermaid, DOT, ASCII) (Future)
- [ ] Should unlink remove bidirectional automatically? (Yes for `related`)

### Success Criteria

**Functionality:**
- ✅ Can add/remove dependencies without manual editing
- ✅ Bidirectional `related` updates both specs
- ✅ Validation prevents broken relationships
- ✅ `lean-spec deps` shows correct relationships

**Developer Experience:**
- ✅ Commands feel natural and intuitive
- ✅ Error messages are helpful
- ✅ Works with spec numbers or names
- ✅ Faster than manual editing

**Code Quality:**
- ✅ Test coverage >90%
- ✅ No regressions in existing commands
- ✅ Passes `lean-spec validate`
- ✅ TypeScript compilation clean

### Related Work

**This spec depends on:**
- Existing frontmatter parsing (`packages/cli/src/frontmatter.ts`)
- Existing `lean-spec deps` command
- Spec path resolution utilities

**This spec enables:**
- Automated relationship management in CI/CD
- Better spec graph analysis
- Foundation for future relationship features
- Removal of manual editing exception in AGENTS.md

**Related specs:**
- Spec 076 (programmatic-spec-relationships) - MCP server side
- Spec 059 (programmatic-spec-management) - API design
- Spec 080 (mcp-server-modular-architecture) - MCP relationships
