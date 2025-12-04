---
status: complete
created: '2025-11-26'
tags:
  - ai-agents
  - dx
  - quality
  - frontmatter
  - process
priority: high
created_at: '2025-11-26T02:34:58.957Z'
updated_at: '2025-11-26T06:06:02.125Z'
transitions:
  - status: in-progress
    at: '2025-11-26T02:35:02.351Z'
  - status: complete
    at: '2025-11-26T02:36:46.160Z'
  - status: in-progress
    at: '2025-11-26T02:46:33.158Z'
  - status: complete
    at: '2025-11-26T06:06:02.125Z'
completed_at: '2025-11-26T02:36:46.160Z'
completed: '2025-11-26'
depends_on:
  - 045-unified-dashboard
  - 086-template-component-deduplication
  - 073-template-engine-agents-md
  - 121-mcp-first-agent-experience
---

# Fix AI Agents Not Following Dependency Management

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-26 · **Tags**: ai-agents, dx, quality, frontmatter, process

## Problem Statement

AI agents consistently fail to link spec dependencies in frontmatter when creating/editing specs. This is a **systemic workflow problem**, not just a documentation gap.

### Evidence

19+ specs found with content referencing other specs but missing frontmatter links. This pattern repeats despite AGENTS.md already having dependency instructions.

### Why Instructions Alone Won't Work

1. **Cognitive load**: Agents focus on content creation, forget post-creation steps
2. **Workflow gap**: No enforcement point between content writing and completion
3. **Silent failures**: No feedback when dependencies are missed
4. **Two-phase problem**: Content references written first, linking is a separate action that gets forgotten

## Root Cause Analysis

### The Fundamental Issue

The current workflow has a **structural gap**:

```
Current Flow:
  lean-spec create → Write content (mentions deps) → Done ❌
                                                    ↑
                                          Missing link step!
```

Agents don't forget to link - they never had a workflow that **requires** it.

### Why Adding More Instructions Fails

- AGENTS.md already says to link dependencies
- Adding "CRITICAL" or "⚠️" doesn't change behavior
- Instructions are read once, then forgotten during task execution
- No enforcement = no compliance

## Solution Options

### Option A: Automated Detection + Warning (Recommended)

Add `lean-spec validate` check that detects content→frontmatter misalignment:

```bash
lean-spec validate --check-deps
# Warning: spec 090 mentions "spec 071" in content but not in frontmatter
# Run: lean-spec link 090 --related 071
```

**Pros**: Catches issues, provides fix command, integrates with existing workflow  
**Cons**: Requires implementation effort

### Option B: Smart `lean-spec create` with `--description`

When using `lean-spec create --description "..."`, auto-detect spec references and prompt:

```bash
lean-spec create my-spec --description "Builds on spec 045..."
# Detected reference to spec 045. Link as dependency? [Y/n]
```

**Pros**: Catches at creation time  
**Cons**: Only works with --description flag, not manual content editing

### Option C: MCP Prompt Enhancement

Add dependency check to MCP prompts that guide spec creation workflow:

```
After creating a spec:
1. Scan content for spec references (e.g., "spec 045", "depends on", "related to")
2. For each reference found, run: lean-spec link <spec> --related <ref>
3. Verify with: lean-spec deps <spec>
```

**Pros**: Works with MCP workflow, reinforces at decision point  
**Cons**: Still relies on agent following instructions

### Option D: Post-Edit Hook (Future)

File watcher or git hook that validates specs on save/commit.

**Pros**: True enforcement  
**Cons**: Complex, may be annoying

## Chosen Approach

**Hybrid: A + C + Better Tooling**

1. **Implement `lean-spec validate --check-deps`** - Automated detection of content/frontmatter misalignment
2. **Enhance MCP prompts** - Add dependency check step to spec creation workflow
3. **Improve `lean-spec create`** - Auto-detect refs in `--description` and suggest links
4. **Better AGENTS.md** - Not more text, but clearer workflow with validation step

## Implementation Plan

### Phase 1: Validation Command (Core Fix) ✅ DONE
- [x] Add `--check-deps` flag to `lean-spec validate`
- [x] Scan spec content for patterns: `spec \d{3}`, `depends on`, `related to`, `see spec`, `builds on`
- [x] Compare detected refs against frontmatter `depends_on` and `related`
- [x] Output actionable commands to fix misalignment
- [x] Only warn about active (non-archived) specs
- [x] Add `checkDeps` option to MCP `validate` tool

### Phase 2: Fix Existing Specs ✅ DONE
- [x] Run `lean-spec validate --check-deps` and fix all dependency warnings
- [x] Verify with `lean-spec validate --check-deps` showing 0 dependency-alignment warnings

### Phase 3: Workflow Integration ✅ DONE
- [x] Update AGENTS.md with dependency linking rule (done earlier)
- [x] Update MCP prompts with validation step
- [x] Add `--check-deps` to Quality Standards checklist in AGENTS.md

## Success Criteria

- [x] `lean-spec validate --check-deps` detects content/frontmatter misalignment
- [x] Running `lean-spec validate --check-deps` on current specs shows 0 dependency-alignment warnings
- [x] MCP spec creation workflow includes dependency check step (new `create-spec` prompt)
- [x] MCP `sdd-checkpoint` prompt includes validation step with `--check-deps`
- [ ] New specs created by agents have aligned dependencies (measure over 2 weeks)

## What Was Implemented

### 1. New Validator: `DependencyAlignmentValidator`
- Location: `packages/cli/src/validators/dependency-alignment.ts`
- Scans spec content for references to other specs using multiple patterns
- Compares against frontmatter `depends_on` and `related` fields
- Only warns about active (non-archived) specs
- Outputs actionable fix commands

### 2. CLI: `--check-deps` Flag
- Added to `lean-spec validate` command
- Example: `lean-spec validate --check-deps`
- Can be combined with other options: `--rule dependency-alignment`

### 3. MCP: `checkDeps` Option
- Added to the `validate` MCP tool
- Enables agents to programmatically check dependency alignment

### 4. New MCP Prompt: `create-spec`
- Guides agents through proper spec creation with dependency linking
- Emphasizes the CRITICAL step of linking after creation
- Includes verification steps using `deps` and `validate`

### 5. AGENTS.md Updates
- Added Core Rule #8: "ALWAYS link spec dependencies"
- Added dependency linking section with examples
- Added `--check-deps` to Quality Standards checklist

## Technical Design

### Content Pattern Detection

```typescript
const SPEC_REF_PATTERNS = [
  /spec[- ]?(\d{3})/gi,                    // "spec 045", "spec-045"
  /(\d{3})-[a-z-]+/gi,                     // "045-unified-dashboard"
  /depends on[:\s]+.*?(\d{3})/gi,          // "depends on spec 045"
  /related to[:\s]+.*?(\d{3})/gi,          // "related to 072"
  /see (also )?spec[:\s]+(\d{3})/gi,       // "see spec 110"
  /builds on[:\s]+.*?(\d{3})/gi,           // "builds on spec 045"
  /blocked by[:\s]+.*?(\d{3})/gi,          // "blocked by 086"
  /requires[:\s]+.*?spec[:\s]+(\d{3})/gi,  // "requires spec 073"
];
```

### Validation Output

```
$ lean-spec validate --check-deps

Checking dependency alignment...

⚠ 090-leanspec-sdd-case-studies
  Content references: 071, 082, 067, 043
  Frontmatter related: (none)
  Missing: 071, 082, 067, 043
  Fix: lean-spec link 090 --related 071 082 067 043

⚠ 121-mcp-first-agent-experience  
  Content references: 073 (depends), 072, 110 (related)
  Frontmatter: (none)
  Missing depends_on: 073
  Missing related: 072, 110
  Fix: lean-spec link 121 --depends-on 073 --related 072 110

✓ 3 specs with missing dependencies
  Run suggested commands to fix, or use --fix to auto-link
```

## Notes

### Why This Matters

Dependency graphs are core to LeanSpec's value proposition for AI agents. Broken graphs mean:
- Agents can't understand work order
- Impact analysis fails
- Project health metrics are wrong
- Context loading misses related work

### Alternative Considered: Remove Manual Linking

Could make `related` purely informational (extracted from content) rather than explicit metadata. Rejected because:
- `depends_on` needs to be explicit (blocking vs informational)
- Some relationships aren't mentioned in content
- Explicit links are more reliable than NLP extraction
