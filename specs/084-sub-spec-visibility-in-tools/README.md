---
status: in-progress
created: '2025-11-16'
tags:
  - mcp
  - tools
  - sub-specs
  - ai-agents
  - ux
priority: high
created_at: '2025-11-16T13:30:17.281Z'
updated_at: '2025-11-16T13:58:37.156Z'
transitions:
  - status: in-progress
    at: '2025-11-16T13:58:37.156Z'
---

# Sub-Spec File Visibility in MCP Tools and Commands

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-11-16 · **Tags**: mcp, tools, sub-specs, ai-agents, ux

**Project**: lean-spec  
**Team**: Core Development

## Overview

AI agents frequently miss critical information in sub-spec files (DESIGN.md, TESTING.md, IMPLEMENTATION.md) because standard tools (`list`, `search`, `view`) don't surface their existence. This creates incomplete context and poor decision-making.

**Solution**: Include lightweight sub-spec file references in tool outputs so agents know what additional content exists and can fetch it when needed.

## Problem

### Current Behavior

When AI agents interact with LeanSpec through MCP tools or CLI commands:

1. **`lean-spec list`** / **`list` MCP tool**: Returns spec metadata (name, status, tags) but **no indication that sub-specs exist**
2. **`lean-spec search`** / **`search` MCP tool**: Searches content but doesn't highlight which **file** matches came from
3. **`lean-spec view <spec>`** / **`view` MCP tool**: Shows only README.md, agents don't know about DESIGN.md, TESTING.md, etc.

### Real-World Impact

**Example**: Spec 082 (web-navigation-performance) has:
- `README.md` - Overview and problem statement (200 lines)
- `DESIGN.md` - Detailed architecture and implementation approach (300 lines)
- `TESTING.md` - Performance benchmarks and test strategy (150 lines)

**Agent behavior**:
```
Agent: "Show me specs related to web performance"
Tool: Returns 082-web-navigation-performance with README.md content
Agent: "Implement the optimization"
Result: Agent misses the detailed architecture in DESIGN.md and benchmarks in TESTING.md
```

### Why This Happens

The Context Economy principle (spec 066, 069, 071) **correctly** encourages splitting specs to stay under token limits. However, tooling hasn't kept pace:

- **Spec splitting is working** - Complex specs now have 3-5 focused files
- **Tool visibility is not working** - Agents only see README.md
- **Gap**: Agents don't know what they're missing

### User Quote

> "I often found that AI agents will ignore the sub-specs of the main spec."

## Design

### Design Principle

**Progressive Disclosure with Signaling**: Don't load all sub-specs by default (Context Economy), but **signal their existence** so agents can fetch them when needed.

### Implementation Strategy

Add a `subSpecs` field to all tool outputs containing lightweight references:

```typescript
{
  name: "082-web-navigation-performance",
  status: "in-progress",
  tags: ["web", "performance"],
  // NEW: Sub-spec references (not full content)
  subSpecs: [
    { name: "DESIGN.md", tokens: 1243, summary: "Hybrid rendering architecture and caching strategy" },
    { name: "TESTING.md", tokens: 892, summary: "Performance benchmarks and test plan" }
  ]
}
```

**Key properties**:
- ✅ **Signals presence** - Agent knows sub-specs exist
- ✅ **Context-aware** - Token count helps agent decide if worth loading
- ✅ **Self-descriptive** - Summary helps agent understand relevance
- ✅ **Progressive** - Agent can fetch full content if needed via `view <spec>/DESIGN.md`

### Affected Tools

#### 1. `list` Tool (MCP + CLI)

**Current output**:
```json
{
  "specs": [
    {
      "name": "082-web-navigation-performance",
      "status": "in-progress",
      "tags": ["web", "performance"]
    }
  ]
}
```

**Enhanced output**:
```json
{
  "specs": [
    {
      "name": "082-web-navigation-performance",
      "status": "in-progress",
      "tags": ["web", "performance"],
      "subSpecs": [
        { "name": "DESIGN.md", "tokens": 1243 },
        { "name": "TESTING.md", "tokens": 892 }
      ]
    }
  ]
}
```

**Implementation**: Modify `listSpecsData()` in `packages/cli/src/mcp/tools/list.ts` to:
1. Call `loadSubFiles(specDir)` for each spec
2. Count tokens for each sub-spec using `countTokens()` from `@leanspec/core`
3. Add `subSpecs: [{ name, tokens }]` to response

#### 2. `view` Tool (MCP + CLI)

**Current output** (when viewing main spec):
```json
{
  "spec": {
    "name": "082-web-navigation-performance",
    "status": "in-progress"
  },
  "content": "# web-navigation-performance\n\n..."
}
```

**Enhanced output**:
```json
{
  "spec": {
    "name": "082-web-navigation-performance",
    "status": "in-progress",
    "subSpecs": [
      { "name": "DESIGN.md", "tokens": 1243, "summary": "Hybrid rendering..." },
      { "name": "TESTING.md", "tokens": 892, "summary": "Performance benchmarks..." }
    ]
  },
  "content": "# web-navigation-performance\n\n..."
}
```

**Implementation**: Modify `readSpecData()` in `packages/cli/src/mcp/tools/view.ts` to:
1. Detect if viewing main spec (not a sub-spec file)
2. Load sub-spec metadata (name, tokens, first 100 chars as summary)
3. Include in `spec` object

**Note**: Don't include `subSpecs` when viewing a **sub-spec file** itself (e.g., `082/DESIGN.md`) - only when viewing the main README.md

#### 3. `search` Tool (MCP + CLI)

**Current output**:
```json
{
  "results": [
    {
      "spec": { "name": "082-web-navigation-performance" },
      "matches": [
        { "field": "content", "text": "...hybrid rendering..." }
      ]
    }
  ]
}
```

**Enhanced output**:
```json
{
  "results": [
    {
      "spec": { 
        "name": "082-web-navigation-performance",
        "subSpecs": [
          { "name": "DESIGN.md", "tokens": 1243 },
          { "name": "TESTING.md", "tokens": 892 }
        ]
      },
      "matches": [
        { 
          "field": "content", 
          "text": "...hybrid rendering...",
          "source": "README.md"  // NEW: Indicate which file matched
        },
        {
          "field": "content",
          "text": "...caching strategy...",
          "source": "DESIGN.md"  // NEW: Match from sub-spec
        }
      ]
    }
  ]
}
```

**Implementation**:
1. Modify `searchSpecsData()` in `packages/cli/src/mcp/tools/search.ts` to:
   - Load sub-spec content when `includeContent: true`
   - Search across README.md + all sub-specs
   - Track which file each match came from
2. Add `source` field to match results
3. Include `subSpecs` metadata in spec object

**Alternative (Simpler)**: Don't change search behavior, just add `subSpecs` metadata to results (agents can see sub-specs exist even if not searched)

#### 4. CLI Commands

Apply same changes to CLI formatters:
- `packages/cli/src/commands/lister.ts` - Display sub-spec count in list view
- `packages/cli/src/commands/viewer.ts` - Show sub-spec references when viewing main spec
- Search output formatter - Add source file to match display

### Sub-Spec Metadata Schema

```typescript
interface SubSpecReference {
  name: string;           // "DESIGN.md"
  tokens: number;         // 1243 (from countTokens)
  summary?: string;       // First 100 chars or H1 title (optional)
  size?: number;          // File size in bytes (optional)
}

interface SpecData {
  // ... existing fields ...
  subSpecs?: SubSpecReference[];  // Only when viewing main spec
}
```

### Performance Considerations

**Impact**: Adds ~5-10ms per spec (need to stat + count tokens for sub-files)

**Mitigation**:
- Only compute when outputting data (not during search indexing)
- Cache token counts in memory during single operation
- Skip for `--fast` flag (if we add one later)

**Trade-off**: Acceptable cost for massive UX improvement (agents won't miss critical content)

### Design Decisions

#### 1. Should sub-specs be included in search by default?

**Options**:
- **A**: Search README.md only by default, add `--include-subspecs` flag
- **B**: Search all content by default (current behavior)
- **C**: Search all, but indicate source file in results ✅ **Recommended**

**Decision**: Option C - Keep current search behavior (comprehensive), add source attribution

**Rationale**: Context Economy says "don't load if not needed", but if agent explicitly searches, they want complete results. The `source` field lets them know which file to fetch.

#### 2. How detailed should sub-spec summaries be?

**Options**:
- **A**: No summary, just filename + token count
- **B**: First H1 heading from file
- **C**: First 100 characters of content ✅ **Recommended**
- **D**: LLM-generated summary (too expensive)

**Decision**: Start with B (H1 heading), fall back to C (first 100 chars)

**Rationale**: Balance between information value and computation cost

#### 3. Should `files` tool output change?

**Current**: `lean-spec files <spec>` shows all files with sizes

**Proposed**: Add token counts to document listing

```diff
  Documents:
-   ✓ DESIGN.md        (15 KB)  
+   ✓ DESIGN.md        (15 KB, ~1,243 tokens)
```

**Decision**: Yes, add token counts (consistent with other tool outputs)

#### 4. Web app impact?

The web app (`packages/web`) already has `SubSpecTabs` component that detects and displays sub-specs. This spec only affects CLI/MCP tools.

**No changes needed** to web app (already handles sub-specs well)

## Plan

### Phase 1: Core Infrastructure (1-2 hours)
- [ ] Create `loadSubSpecMetadata(specDir)` helper function
  - Input: Spec directory path
  - Output: `SubSpecReference[]`
  - Uses existing `loadSubFiles()` + `countTokens()`
- [ ] Add `subSpecs?: SubSpecReference[]` to `SpecData` type in `packages/cli/src/mcp/types.ts`

### Phase 2: MCP Tools (2-3 hours)
- [ ] Update `list` tool - Add sub-spec metadata to list responses
- [ ] Update `view` tool - Add sub-spec references when viewing main spec
- [ ] Update `search` tool - Add sub-spec metadata + source tracking (or simpler version)

### Phase 3: CLI Formatters (1-2 hours)
- [ ] Update list formatter - Display sub-spec count: `(+2 sub-specs)`
- [ ] Update view formatter - Show sub-spec references with token counts
- [ ] Update search formatter - Show source file in match context
- [ ] Update `files` command - Add token counts to document listing

### Phase 4: Testing & Documentation (1-2 hours)
- [ ] Add test cases for specs with/without sub-specs
- [ ] Update AGENTS.md - Document new sub-spec visibility behavior
- [ ] Update docs site - Add examples to MCP tools documentation
- [ ] Update CLI help text where relevant

**Total estimate**: 6-10 hours

## Test

### Success Criteria

- [ ] **AI agents discover sub-specs**: When listing or viewing a spec, agents see which sub-spec files exist
- [ ] **Token-aware decisions**: Agents can decide whether to load sub-specs based on token count
- [ ] **Search attribution**: Search results indicate which file (README vs sub-spec) matches came from
- [ ] **No breaking changes**: Existing tools continue to work, `subSpecs` field is additive
- [ ] **Performance acceptable**: <50ms overhead per spec in list operations
- [ ] **Documentation complete**: AGENTS.md and docs site reflect new behavior

### Test Cases

**Unit Tests**:
- [ ] `loadSubSpecMetadata()` returns correct token counts
- [ ] `loadSubSpecMetadata()` handles specs without sub-specs
- [ ] `loadSubSpecMetadata()` extracts H1 title as summary
- [ ] Token counting works for all sub-spec types

**Integration Tests**:
- [ ] `list` tool includes `subSpecs` field for specs with sub-files
- [ ] `list` tool omits `subSpecs` field for single-file specs
- [ ] `view` tool includes `subSpecs` when viewing main README
- [ ] `view` tool omits `subSpecs` when viewing sub-spec file
- [ ] `search` tool includes `subSpecs` metadata in results
- [ ] CLI formatters display sub-spec information correctly

**Agent Workflow Tests** (manual):
- [ ] Agent viewing spec 082 sees DESIGN.md and TESTING.md references
- [ ] Agent can decide to fetch DESIGN.md based on token count
- [ ] Agent searching "performance" sees which file matches came from

## Notes

### Related Specs

- **Spec 012** - Sub-Spec Files Management (original sub-spec support)
- **Spec 066** - Context Economy Thresholds Refinement (why we split specs)
- **Spec 069** - Token Counting Utils (provides `countTokens()` function)
- **Spec 075** - Intelligent Search Engine (search infrastructure)
- **Spec 080** - MCP Server Modular Architecture (MCP tools structure)

### Open Questions

1. Should we add a `--no-subspecs` flag to list/view for minimal output? **→ Not yet, wait for user feedback**
2. Should search results be grouped by file (README, DESIGN, etc.)? **→ Future enhancement**
3. Should we precompute and cache token counts in metadata? **→ Not yet, measure performance first**

### Future Enhancements

- **Smart sub-spec recommendations**: "Based on your query, you might want to check DESIGN.md"
- **Sub-spec diff tracking**: Show which sub-specs changed in recent updates
- **Grouped search results**: Group matches by file for better readability
