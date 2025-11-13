---
status: in-progress
created: '2025-11-13'
tags:
  - core
  - tooling
  - context-economy
  - llm
  - validation
priority: high
assignee: marvin
created_at: '2025-11-13T02:17:52.074Z'
depends_on:
  - 066-context-economy-thresholds-refinement
related:
  - 059-programmatic-spec-management
  - 048-spec-complexity-analysis
updated_at: '2025-11-13T02:35:30.196Z'
transitions:
  - status: in-progress
    at: '2025-11-13T02:35:30.196Z'
---

# Token Counting Utilities for LLM Context Management

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-11-13 · **Tags**: core, tooling, context-economy, llm, validation
> **Assignee**: marvin · **Reviewer**: TBD

**The Problem**: Token count is the most accurate predictor of LLM context performance, but we lack convenient tools (MCP, CLI, core utilities) to measure it for specs and sub-specs.

**The Solution**: Create a comprehensive token counting utility layer as core infrastructure for LLM context management, enabling both humans and AI agents to measure and optimize spec token usage.

## Overview

### Why Token Counting Matters

From spec 066 research findings:

1. **Token count predicts AI performance better than line count**
   - 39% average performance drop in multi-turn contexts (arXiv:2505.06120)
   - Quality degradation starts well before 50K token limits
   - 6x cost difference: 2,000-line vs 300-line specs

2. **Content density varies significantly**
   - Code: ~3 chars/token (denser)
   - Prose: ~4 chars/token (lighter)
   - Spec 016: Only 315 lines but ~2,400 tokens (26 code blocks)
   - Spec 049: 374 lines but only ~1,700 tokens (pure prose)

3. **Current validation uses tokenx**
   - Integrated in `ComplexityValidator` (spec 066 implementation)
   - Will migrate to tiktoken for exact token counts
   - No user-facing tools to inspect token counts
   - No way for AI agents to query token counts programmatically

### What's Missing

**Current State**:
- ✅ `ComplexityValidator` uses `tokenx` internally (will migrate to tiktoken)
- ✅ Token thresholds defined (2K/3.5K/5K - hypotheses)
- ❌ No CLI command to check token counts
- ❌ No MCP tool for AI agents to query tokens
- ❌ No utility to count sub-spec tokens
- ❌ No breakdown by content type (code vs prose vs tables)

**User Pain Points**:
- Can't answer "How many tokens is this spec?"
- Can't compare token counts across specs
- Can't see token breakdown before/after edits
- AI agents can't make token-aware decisions
- No way to validate MCP tool context fits in budget

### What We're Building

**Three Layers of Token Counting**:

1. **Core Library** (`@leanspec/core`)
   - Token counting utilities using `tiktoken`
   - Sub-spec aggregation
   - Content type breakdown
   - Export for reuse across packages

2. **CLI Commands** (`@leanspec/cli`)
   - `lean-spec tokens <spec>` - Show token count for spec
   - `lean-spec tokens <spec> --detailed` - Breakdown by file/type
   - `lean-spec tokens --all` - Compare all specs
   - Integration with `lean-spec analyze`

3. **MCP Tools** (Future)
   - `mcp_lean-spec_tokens` - Query token counts
   - Enable AI agents to make token-aware decisions
   - Support context budget planning

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interfaces                       │
├──────────────┬──────────────────┬───────────────────────┤
│  CLI         │   MCP Server     │   Internal (Validator)│
│              │                  │                       │
│ lean-spec    │  mcp_lean-spec  │  ComplexityValidator  │
│   tokens     │    _tokens       │                       │
└──────┬───────┴────────┬─────────┴──────────┬───────────┘
       │                │                    │
       └────────────────┴────────────────────┘
                        │
              ┌─────────▼──────────┐
              │   Core Library     │
              │  @leanspec/core    │
              ├────────────────────┤
              │ TokenCounter       │
              │  - count()         │
              │  - analyze()       │
              │  - breakdown()     │
              │                    │
              │ Uses: tiktoken     │
              └────────────────────┘
```

### Token Counting Options

Based on spec 066 analysis of token counting packages:

### Using tiktoken for Token Counting

**Official OpenAI tokenizer** for precise token counting and complexity measurement.

**Note**: We use `tiktoken` (official OpenAI package) NOT `gpt-tokenizer` mentioned in spec 066. The `tiktoken` npm package is the official JavaScript port.

**Why tiktoken?**:
- ✅ Exact BPE encoding used by GPT-4 and similar models
- ✅ Official OpenAI tokenizer (ported to JS)
- ✅ Battle-tested and maintained (1.1M+ weekly downloads)
- ✅ Token count is the primary metric for complexity (not line count)
- ✅ Easy to install and setup (no complex configuration)
- ✅ Fast enough for our use case (<50ms per spec)

**Trade-offs**:
- Bundle size: ~500KB (acceptable for core functionality)
- Slightly slower than estimation (but negligible: <50ms per spec)
- Model-specific encoding (we standardize on GPT-4/Claude encoding)

**Package**: https://www.npmjs.com/package/tiktoken

**Usage**:
```typescript
import { encoding_for_model } from 'tiktoken';

const enc = encoding_for_model('gpt-4');
const tokens = enc.encode(specContent);
const count = tokens.length;
enc.free(); // Important: free memory
```

**Decision**: Use tiktoken as the single solution—no fallback needed. Easy to setup, fast enough, and gives us exact token counts.

### Core Utilities

New utilities in `@leanspec/core/src/utils/token-counter.ts`:

```typescript
export interface TokenCount {
  total: number;
  files: {
    path: string;
    tokens: number;
  }[];
  breakdown?: {
    code: number;      // Tokens in code blocks
    prose: number;     // Tokens in prose
    tables: number;    // Tokens in tables
    frontmatter: number; // Tokens in frontmatter
  };
}

export interface TokenCounterOptions {
  detailed?: boolean;    // Include breakdown by file and type
  includeSubSpecs?: boolean; // Count sub-spec files
}

export class TokenCounter {
  /**
   * Count tokens in a single file
   */
  async countFile(filePath: string, options?: TokenCounterOptions): Promise<TokenCount>;
  
  /**
   * Count tokens in a spec (including sub-specs if requested)
   */
  async countSpec(specPath: string, options?: TokenCounterOptions): Promise<TokenCount>;
  
  /**
   * Analyze token breakdown by content type
   */
  async analyzeBreakdown(content: string): Promise<TokenCount['breakdown']>;
  
  /**
   * Check if content fits within token limit
   */
  isWithinLimit(count: TokenCount, limit: number): boolean;
  
  /**
   * Format token count for display
   */
  formatCount(count: TokenCount, verbose?: boolean): string;
}
```

### CLI Commands

#### Basic Command

```bash
$ lean-spec tokens 059
Spec: 059-programmatic-spec-management
Total: 2,100 tokens
Files:
  README.md: 394 lines, 2,100 tokens
```

#### With Sub-Specs

```bash
$ lean-spec tokens 059 --include-sub-specs
Spec: 059-programmatic-spec-management
Total: 8,450 tokens
Files:
  README.md:            2,100 tokens (394 lines)
  ARCHITECTURE.md:      1,850 tokens (411 lines)
  CONTEXT-ENGINEERING.md: 3,200 tokens (799 lines)
  COMMANDS.md:          560 tokens (156 lines)
  ALGORITHMS.md:        240 tokens (62 lines)
  IMPLEMENTATION.md:    310 tokens (88 lines)
  TESTING.md:           190 tokens (54 lines)
```

#### Detailed Breakdown

```bash
$ lean-spec tokens 066 --detailed
Spec: 066-context-economy-thresholds-refinement
Total: 7,307 tokens

Content Breakdown:
  Prose:       4,200 tokens (57%)
  Code:        2,100 tokens (29%)
  Tables:      800 tokens (11%)
  Frontmatter: 207 tokens (3%)

Performance Indicators:
  Cost multiplier: 6.1x vs baseline (1,200 tokens)
  AI effectiveness: ~65% (hypothesis - >5K tokens)
  Context Economy: ⚠️ Review - elevated token count

Recommendation: Consider splitting or using sub-specs
```

#### Compare All Specs

```bash
$ lean-spec tokens --all --sort-by tokens
╭────────────────────────────────────────────────────────╮
│ Token Counts (Top 10)                                   │
├─────────┬──────────────────────────────┬───────────────┤
│ Spec    │ Name                         │ Tokens        │
├─────────┼──────────────────────────────┼───────────────┤
│ 066     │ context-economy-thresholds   │ 7,307 (⚠️)    │
│ 045     │ unified-dashboard            │ 4,800 (⚠️)    │
│ 016     │ github-action                │ 2,400         │
│ 059     │ programmatic-spec-mgmt       │ 2,100         │
│ 049     │ first-principles             │ 1,700         │
│ 051     │ docs-system-prompt           │ 1,600         │
╰─────────┴──────────────────────────────┴───────────────╯

Legend: ⚠️ = >3,500 tokens (review recommended)
```

### MCP Tool Interface

```json
{
  "name": "mcp_lean-spec_tokens",
  "description": "Count tokens in spec or sub-spec for LLM context management",
  "parameters": {
    "specPath": {
      "type": "string",
      "description": "Spec name, number, or file path (e.g., '059', 'unified-dashboard', '059/DESIGN.md')"
    },
    "includeSubSpecs": {
      "type": "boolean",
      "description": "Include all sub-spec files in count (default: false)"
    },
    "detailed": {
      "type": "boolean",
      "description": "Return breakdown by content type (default: false)"
    }
  }
}
```

**Example Usage by AI Agent**:
```
Agent: "I need to include spec 059 in context. Will it fit?"
Tool call: mcp_lean-spec_tokens("059", includeSubSpecs=true)
Response: { total: 8450 }
Agent: "That's too large. Let me just include README.md"
Tool call: mcp_lean-spec_tokens("059")
Response: { total: 2100 }
Agent: "Perfect, that fits in my context budget."
```

## Plan

### Phase 1: Core Utilities (v0.3.0 - Week 1)
- [ ] Install `tiktoken` as dependency
- [ ] Create `TokenCounter` class in `@leanspec/core`
- [ ] Implement `countFile()` using `tiktoken`
- [ ] Implement `countSpec()` with sub-spec support
- [ ] Implement `analyzeBreakdown()` for content type analysis
- [ ] Add unit tests for edge cases
- [ ] Export utilities from core package

### Phase 2: CLI Integration (v0.3.0 - Week 1-2)
- [ ] Add `tokens` command to CLI (using tiktoken)
- [ ] Implement `--include-sub-specs` flag
- [ ] Implement `--detailed` flag for breakdown
- [ ] Implement `--all` flag for project-wide view
- [ ] Add `--sort-by` option (tokens, lines, name)
- [ ] Format output with tables and colors
- [ ] Update `analyze` command to include token count

### Phase 3: Integration & Polish (v0.3.0 - Week 2)
- [ ] **Replace `tokenx` with `tiktoken` in `ComplexityValidator`**
- [ ] **Make token count the PRIMARY complexity metric** (line count secondary)
- [ ] Update validation thresholds based on exact token counts
- [ ] Ensure consistency across validation and CLI
- [ ] Add token count to `lean-spec list` output (optional column)
- [ ] Update documentation in README.md
- [ ] Update AGENTS.md with token counting guidance

### Phase 4: MCP Tool (v0.3.0 - Week 3)
- [ ] Design MCP tool interface
- [ ] Implement `mcp_lean-spec_tokens` tool (using tiktoken)
- [ ] Add to MCP server exports
- [ ] Test with AI agent workflows
- [ ] Document in MCP tool catalog

### Phase 5: Advanced Features (Future - v0.4.0+)
- [ ] Add token trends over time (git history)
- [ ] Add context budget planning (`--budget` flag)
- [ ] Add "will this fit?" checker for MCP tools
- [ ] Support for multiple model tokenizers (Claude, Gemini, etc.)
- [ ] Token cost estimation ($/1M tokens)

## Test

### Unit Tests

**Core Utilities**:
- [ ] `countFile()` returns correct token counts
- [ ] `countSpec()` aggregates sub-specs correctly
- [ ] `analyzeBreakdown()` categorizes content types
- [ ] `isWithinLimit()` compares correctly
- [ ] `formatCount()` produces readable output

**Edge Cases**:
- [ ] Empty files (0 tokens)
- [ ] Very large files (>10K tokens)
- [ ] Files with only code blocks
- [ ] Files with only frontmatter
- [ ] Specs without sub-specs
- [ ] Invalid file paths

### Integration Tests

**CLI Commands**:
- [ ] `lean-spec tokens <spec>` shows basic count
- [ ] `--include-sub-specs` aggregates correctly
- [ ] `--detailed` shows breakdown
- [ ] `--all` lists all specs
- [ ] Output format is readable and correct
- [ ] Error handling for invalid specs

### Validation Tests

**Against Known Specs**:
- [ ] Spec 066: ~7,300 tokens (matches current validation)
- [ ] Spec 059: ~2,100 tokens (matches current validation)
- [ ] Spec 016: ~2,400 tokens (code-dense)
- [ ] Spec 049: ~1,700 tokens (prose-heavy)

### Consistency Tests

**Validate tiktoken Behavior**:
- [ ] Token counts are consistent across multiple runs
- [ ] Proper memory cleanup (enc.free() called)
- [ ] Works with various content types (code, prose, tables)
- [ ] Handles edge cases (empty files, very large files)

## Success Metrics

### Quantitative

**Performance**:
- [ ] Token counting takes <50ms per spec
- [ ] Aggregate counting (10 specs) takes <500ms
- [ ] Memory usage stays under 100MB

**Reliability**:
- [ ] Token counts are consistent and reproducible
- [ ] Matches validation thresholds correctly
- [ ] Uses same tokenization as GPT-4/Claude

### Qualitative

**Developer Experience**:
- [ ] "Now I can see token counts easily"
- [ ] "Helps me understand Context Economy better"
- [ ] "Makes token-aware editing decisions"
- [ ] "CLI output is clear and actionable"

**AI Agent Experience**:
- [ ] "Can query token counts programmatically"
- [ ] "Makes informed context budget decisions"
- [ ] "Avoids overloading context windows"
- [ ] "Understands which specs fit in context"

## Notes

### Why This Spec Exists

**Separated from Spec 059** because:
1. **Different lifecycle**: Token counting is foundational infrastructure, programmatic spec management builds on it
2. **Clearer dependency**: Spec 059 *depends on* having token counting utilities
3. **Reusable utilities**: Token counting is useful beyond just spec management (MCP tools, validation, CLI)
4. **Context Economy**: Spec 059 is already 394 lines with 6 sub-specs - adding token counting details would violate its own principles

**Dependency Relationship**:
- Spec 066: Establishes *why* token counting matters (research, thresholds)
- **Spec 069 (this)**: Provides *how* to count tokens (utilities, tools)
- Spec 059: Uses token counting for *programmatic transformations*

### Research References

From Spec 066:

1. **Token Count Critical for AI Performance**
   - [arXiv:2505.06120](https://arxiv.org/abs/2505.06120): 39% performance drop in multi-turn contexts
   - [Berkeley BFCL](https://gorilla.cs.berkeley.edu/leaderboard.html): All models worse with more tools/options
   - [Databricks Research](https://www.databricks.com/blog/long-context-rag-performance-llms): Degradation even within limits

2. **Token Count vs Line Count**
   - Code: ~3 chars/token (denser)
   - Prose: ~4 chars/token (lighter)
   - Better predictor than line count for AI effectiveness

3. **Validated Thresholds** (hypothesis, to be tested):
   - <2K tokens: Baseline performance (~100%)
   - 2-3.5K tokens: Good range (~90-95%)
   - 3.5-5K tokens: Warning zone (~80-85%)
   - >5K tokens: Should split (~65-80%)

### Why tiktoken?

| Feature | tiktoken |
|---------|----------|
| Tokenization | Exact BPE encoding (GPT-4) |
| Size | ~500KB |
| Speed | Fast (<50ms/spec, <2s for 100 specs) |
| Dependencies | Some (but well-maintained) |
| Downloads/week | 1.1M+ |
| Maintenance | Official OpenAI port |
| Setup | Easy (`npm install tiktoken`) |

**Decision Rationale**:
- Token count is the **primary complexity metric** (spec 066 research)
- Exact token counts are essential for reliable validation thresholds
- ~500KB bundle cost is justified for core functionality
- Performance is more than acceptable for our use case
- Easy to install and setup—no complex configuration needed
- Line count becomes secondary "backstop" metric only
- **No fallback needed**—tiktoken is good enough as single solution

### Implementation Notes

**Why tiktoken Over gpt-tokenizer?**
- Spec 066 mentioned `gpt-tokenizer` (53.1 MB unpacked)
- Better choice: `tiktoken` (official OpenAI port to JS)
- Official, well-maintained, reasonable size (~500KB)
- **v0.3.0 decision: Use tiktoken as single solution**

**Why tiktoken Over tokenx?**
- Token count is THE metric for complexity (spec 066 research)
- tokenx estimation has ~10% variance which is too large for validation thresholds
- Need exact counts to set reliable thresholds and measure effectiveness
- Bundle size (~500KB) is justified for core functionality
- Easy to install—no fallback complexity needed

**Migration from tokenx**:
- `ComplexityValidator` currently uses `tokenx`
- Phase 3: Replace with `tiktoken` for exact counts
- Update validation thresholds based on exact counts
- Remove `tokenx` dependency entirely

### Open Questions

1. **Display Format**: Show tokens always, or only on request?
   - **Decision**: Show in `lean-spec list` with flag, dedicated `tokens` command for details

2. **Sub-Spec Aggregation**: Default to including sub-specs or not?
   - **Decision**: Default to README only (most common), `--include-sub-specs` flag for all

3. **MCP Tool Priority**: Build now or defer to v0.4.0?
   - **Updated**: Build in v0.3.0 (Phase 4) - token counting is foundational for AI agents

4. **Exact Counts**: Install tiktoken now or wait for user feedback?
   - **RESOLVED**: Install tiktoken in v0.3.0 as single dependency, no fallback
   - **Rationale**: Token count is primary metric, need exact counts, easy to setup

5. **Integration with Analyze**: Show tokens in `lean-spec analyze`?
   - **Decision**: Yes, prominently display exact token count in complexity analysis

6. **Line Count Role**: Keep line count validation or remove it?
   - **Decision**: Keep as backstop only (warn at >500 lines regardless of tokens)
   - **Primary metric**: Token count thresholds (2K/3.5K/5K from spec 066)

## Related Specs

- **[066-context-economy-thresholds-refinement](../066-context-economy-thresholds-refinement/)** - Research & thresholds (dependency)
- **[059-programmatic-spec-management](../059-programmatic-spec-management/)** - Programmatic transformations (dependent)
- **[048-spec-complexity-analysis](../048-spec-complexity-analysis/)** - Initial complexity work
- **[018-spec-validation](../018-spec-validation/)** - Validation framework

---

**Remember**: Token counting is foundational infrastructure for Context Economy. Make it fast, accurate, and easy to use.
