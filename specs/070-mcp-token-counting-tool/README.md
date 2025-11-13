---
status: complete
created: '2025-11-13'
tags:
  - core
  - mcp
  - llm
  - tooling
priority: medium
assignee: marvin
created_at: '2025-11-13T02:56:09.580Z'
depends_on:
  - 069-token-counting-utils
related:
  - 059-programmatic-spec-management
  - 066-context-economy-thresholds-refinement
updated_at: '2025-11-13T08:55:34.796Z'
completed_at: '2025-11-13T08:55:34.796Z'
completed: '2025-11-13'
transitions:
  - status: complete
    at: '2025-11-13T08:55:34.796Z'
---

# MCP Token Counting Tool

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-13 · **Tags**: core, mcp, llm, tooling
> **Assignee**: marvin · **Reviewer**: TBD

**The Problem**: AI agents cannot query token counts programmatically. They need to make context-aware decisions about which specs to load, but have no way to check token sizes.

**The Solution**: Add `mcp_lean-spec_tokens` tool to the MCP server, enabling AI agents to query token counts for specs and sub-specs before loading them into context.

## Overview

### Context

From **Spec 069** (Token Counting Utilities):
- ✅ Core infrastructure complete (`TokenCounter` class)
- ✅ CLI commands working (`lean-spec tokens`)
- ✅ Validation integrated (using tiktoken)
- ❌ MCP tool not yet implemented

This spec extracts the MCP tool implementation into focused, standalone work.

### Why This Matters

**For AI Agents**:
1. **Context Budget Management** - Check if spec fits before loading
2. **Smart Loading Decisions** - Load README.md vs full spec with sub-specs
3. **Cost Awareness** - Understand token costs before operations
4. **Performance Optimization** - Avoid context window overflow

**Use Case Example**:
```
Agent: "I need to understand spec 059"
Agent: [queries mcp_lean-spec_tokens("059", includeSubSpecs=true)]
Response: { total: 8450, files: [...] }
Agent: "Too large. Let me just load README.md"
Agent: [queries mcp_lean-spec_tokens("059")]
Response: { total: 2100 }
Agent: "Perfect, I'll load that"
Agent: [queries mcp_lean-spec_view("059")]
```

### What We're Building

**Single MCP Tool**: `mcp_lean-spec_tokens`
- Query token count for spec or sub-spec
- Support for detailed breakdown
- Integration with existing MCP server
- Uses proven `TokenCounter` infrastructure from spec 069

## Design

### MCP Tool Interface

```typescript
{
  name: "mcp_lean-spec_tokens",
  description: "Count tokens in spec or sub-spec for LLM context management. Use this before loading specs to check if they fit in context budget.",
  inputSchema: {
    type: "object",
    properties: {
      specPath: {
        type: "string",
        description: "Spec name, number, or file path (e.g., '059', 'unified-dashboard', '059/DESIGN.md')"
      },
      includeSubSpecs: {
        type: "boolean",
        description: "Include all sub-spec files in count (default: false)",
        default: false
      },
      detailed: {
        type: "boolean",
        description: "Return breakdown by content type (code, prose, tables, frontmatter)",
        default: false
      }
    },
    required: ["specPath"]
  }
}
```

### Response Format

**Basic Response**:
```json
{
  "spec": "059-programmatic-spec-management",
  "total": 2100,
  "files": [
    { "path": "README.md", "tokens": 2100, "lines": 394 }
  ]
}
```

**With Sub-Specs**:
```json
{
  "spec": "059-programmatic-spec-management",
  "total": 8450,
  "files": [
    { "path": "README.md", "tokens": 2100, "lines": 394 },
    { "path": "ARCHITECTURE.md", "tokens": 1850, "lines": 411 },
    { "path": "CONTEXT-ENGINEERING.md", "tokens": 3200, "lines": 799 },
    { "path": "COMMANDS.md", "tokens": 560, "lines": 156 },
    { "path": "ALGORITHMS.md", "tokens": 240, "lines": 62 },
    { "path": "IMPLEMENTATION.md", "tokens": 310, "lines": 88 },
    { "path": "TESTING.md", "tokens": 190, "lines": 54 }
  ],
  "recommendation": "⚠️ Total >5K tokens - consider loading README.md only"
}
```

**With Detailed Breakdown**:
```json
{
  "spec": "066-context-economy-thresholds-refinement",
  "total": 8073,
  "files": [...],
  "breakdown": {
    "prose": 4200,
    "code": 2100,
    "tables": 800,
    "frontmatter": 207
  },
  "performance": {
    "level": "problem",
    "costMultiplier": 6.7,
    "effectiveness": 70,
    "recommendation": "🔴 Should split - elevated token count"
  }
}
```

### Implementation Location

Add to existing MCP server at `packages/cli/src/mcp-server.ts`:

```typescript
// Add near other tool registrations (after mcp_lean-spec_view, etc.)
server.addTool({
  name: 'mcp_lean-spec_tokens',
  description: 'Count tokens in spec or sub-spec for LLM context management',
  inputSchema: zodToJsonSchema(
    z.object({
      specPath: z.string().describe('Spec name, number, or file path'),
      includeSubSpecs: z.boolean().optional().describe('Include all sub-spec files'),
      detailed: z.boolean().optional().describe('Return breakdown by content type'),
    })
  ),
  handler: async ({ specPath, includeSubSpecs, detailed }) => {
    // Implementation using TokenCounter
  }
});
```

### Error Handling

```typescript
// Spec not found
{
  "error": "Spec not found: invalid-spec",
  "code": "SPEC_NOT_FOUND"
}

// File access error
{
  "error": "Cannot read spec file: permission denied",
  "code": "FILE_ACCESS_ERROR"
}

// Token counting error
{
  "error": "Token counting failed: encoding error",
  "code": "TOKEN_COUNT_ERROR"
}
```

## Plan

### Phase 1: Implementation (v0.3.0 - Week 1)
- [ ] Add `mcp_lean-spec_tokens` tool to MCP server
- [ ] Implement handler using existing `TokenCounter` class
- [ ] Support `specPath` resolution (name, number, file path)
- [ ] Support `includeSubSpecs` flag
- [ ] Support `detailed` flag for breakdown
- [ ] Add error handling (spec not found, file access, etc.)
- [ ] Ensure proper resource cleanup (TokenCounter.dispose())

### Phase 2: Testing (v0.3.0 - Week 1)
- [ ] Unit tests for MCP tool handler
- [ ] Integration tests with MCP client
- [ ] Test all parameter combinations
- [ ] Test error scenarios
- [ ] Verify memory cleanup

### Phase 3: Documentation (v0.3.0 - Week 1)
- [ ] Add to MCP tool catalog in README
- [ ] Update AGENTS.md with token query examples
- [ ] Add usage examples to docs site
- [ ] Document in MCP server help text

## Test

### Functional Tests

**Basic Token Counting**:
- [ ] Query single spec returns total token count
- [ ] Query with sub-specs aggregates correctly
- [ ] Query specific sub-spec file works
- [ ] Detailed breakdown includes all content types

**Path Resolution**:
- [ ] Spec number resolves correctly (e.g., "59" or "059")
- [ ] Spec name resolves correctly (e.g., "unified-dashboard")
- [ ] Full spec folder name works (e.g., "059-programmatic-spec-management")
- [ ] Sub-spec file path works (e.g., "059/DESIGN.md")

**Error Cases**:
- [ ] Invalid spec returns proper error
- [ ] Missing file returns proper error
- [ ] Invalid parameters return validation error

### Integration Tests

**With Real Specs**:
- [ ] Matches CLI output for same spec
- [ ] Matches validation complexity scores
- [ ] Performance indicators are correct
- [ ] Recommendations are actionable

**MCP Protocol**:
- [ ] Tool appears in MCP tool list
- [ ] Schema validation works
- [ ] Response format matches MCP spec
- [ ] Error responses follow MCP conventions

### AI Agent Workflows

**Context Budget Planning**:
```typescript
// Agent checks token count before loading
const result = await callTool('mcp_lean-spec_tokens', { 
  specPath: '059',
  includeSubSpecs: true 
});

if (result.total > 5000) {
  // Load just README instead
  await callTool('mcp_lean-spec_tokens', { specPath: '059' });
}
```

**Smart Loading**:
```typescript
// Agent decides what to load based on tokens
const tokens = await callTool('mcp_lean-spec_tokens', { specPath: '066' });

if (tokens.total < 3500) {
  // Load full spec
  await callTool('mcp_lean-spec_view', { specPath: '066' });
} else {
  // Load just overview
  await callTool('mcp_lean-spec_view', { 
    specPath: '066',
    section: 'overview' 
  });
}
```

## Success Metrics

### Quantitative

**Performance**:
- [ ] Token counting via MCP takes <100ms per request
- [ ] No memory leaks (TokenCounter properly disposed)
- [ ] MCP server startup time unaffected (<2s)

**Reliability**:
- [ ] Matches CLI token counts exactly
- [ ] Error handling covers all edge cases
- [ ] Schema validation prevents invalid requests

### Qualitative

**AI Agent Experience**:
- [ ] "Can query token counts programmatically" ✅
- [ ] "Makes informed context budget decisions" ✅
- [ ] "Avoids overloading context windows" ✅
- [ ] "Understands which specs fit in context" ✅

**Developer Experience**:
- [ ] MCP tool is discoverable (shows in tool list)
- [ ] Error messages are clear and actionable
- [ ] Documentation with examples is complete

## Notes

### Why Separate Spec?

**Separated from Spec 069** because:
1. **Different scope**: MCP integration vs core utilities
2. **Different stakeholder**: AI agents vs developers
3. **Can be deferred**: Core infrastructure works without it
4. **Clear dependency**: Builds on completed spec 069

**Dependency**: Spec 069 must be complete (✅ it is!)

### Implementation Strategy

**Reuse, Don't Rebuild**:
- Use existing `TokenCounter` class (proven, tested)
- Use existing path resolution (from `resolveSpecPath`)
- Use existing spec loading (from `getSpec`)
- Just add thin MCP wrapper around existing logic

**Estimated Effort**: 4-6 hours (simple integration)

### Future Enhancements (v0.4.0+)

**Context Budget Planning**:
- [ ] `--budget` flag to check "will this fit in X tokens?"
- [ ] Multi-spec budget planning (e.g., "can I load specs 59, 66, 69?")
- [ ] Cost estimation ($/1M tokens by model)

**Advanced Queries**:
- [ ] "Find specs under 2K tokens"
- [ ] "What's the largest spec in the project?"
- [ ] Token trends over time (git history)

### Open Questions

1. **Should we cache token counts?** 
   - Pro: Faster repeated queries
   - Con: Need invalidation strategy
   - **Decision**: No caching for v0.3.0 (YAGNI)

2. **Should we add token count to other MCP tools?**
   - E.g., `mcp_lean-spec_list` shows token counts
   - E.g., `mcp_lean-spec_view` includes token info in response
   - **Decision**: Start with dedicated tool, expand later if needed

3. **Should we support token budgets directly?**
   - E.g., `maxTokens` parameter returns error if exceeded
   - **Decision**: Defer to Phase 5 / v0.4.0

---

**Remember**: This is a thin MCP wrapper around proven infrastructure (spec 069). Keep it simple, reuse existing code, ship fast.
