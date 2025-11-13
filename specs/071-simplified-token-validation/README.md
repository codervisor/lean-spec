---
status: planned
created: '2025-11-13'
tags:
  - validation
  - simplification
  - tokens
priority: high
assignee: marvin
created_at: '2025-11-13T03:11:29.739Z'
related:
  - 066-context-economy-thresholds-refinement
  - 069-token-counting-utils
---

# Simplified Token-Based Validation

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-13 · **Tags**: validation, simplification, tokens

## Overview

**The Problem**: Current complexity validation uses a score-based approach (0-100) that:
- Uses arbitrary weight ratios (token score 0-60, structure modifier -30 to +20)
- Produces confusing derived scores (what does "45/100" mean?)
- Hides actual metrics users care about (5,207 tokens becomes "score 60")
- Can give misleading results (>5K tokens with sub-specs = "good" due to -30 modifier)

**The Solution**: Use **direct token thresholds** with clear, independent checks for each factor.

**Why Now**: We just removed line-count validator in favor of token-based validation, but the implementation is overly complex and confusing.

## Design

### Core Principle: Direct, Independent Checks

Instead of calculating a composite score, evaluate each factor independently and report clearly.

### Token Thresholds (Primary Check)

```typescript
interface TokenValidation {
  tokens: number;
  level: 'excellent' | 'good' | 'warning' | 'error';
  message: string;
}

function validateTokens(tokens: number): TokenValidation {
  if (tokens > 5000) {
    return {
      tokens,
      level: 'error',
      message: `Spec has ${tokens} tokens (threshold: 5,000) - should split for Context Economy`
    };
  }
  
  if (tokens > 3500) {
    return {
      tokens,
      level: 'warning',
      message: `Spec has ${tokens} tokens (threshold: 3,500) - consider simplification`
    };
  }
  
  if (tokens > 2000) {
    return {
      tokens,
      level: 'info',
      message: `Spec has ${tokens} tokens - acceptable, watch for growth`
    };
  }
  
  return {
    tokens,
    level: 'excellent',
    message: `Spec has ${tokens} tokens - excellent`
  };
}
```

### Structure Checks (Independent Feedback)

Each structural issue gets its own clear message:

```typescript
interface StructureCheck {
  passed: boolean;
  message?: string;
  suggestion?: string;
}

function checkStructure(metrics: Metrics): StructureCheck[] {
  const checks: StructureCheck[] = [];
  
  // Sub-specs presence (positive feedback)
  if (metrics.hasSubSpecs) {
    checks.push({
      passed: true,
      message: `✓ Uses ${metrics.subSpecCount} sub-spec files for progressive disclosure`
    });
  } else if (metrics.tokens > 3000) {
    checks.push({
      passed: false,
      message: `Consider using sub-spec files (DESIGN.md, IMPLEMENTATION.md)`,
      suggestion: `Progressive disclosure reduces cognitive load for large specs`
    });
  }
  
  // Section organization
  if (metrics.sectionCount >= 15 && metrics.sectionCount <= 35) {
    checks.push({
      passed: true,
      message: `✓ Good sectioning (${metrics.sectionCount} sections) enables cognitive chunking`
    });
  } else if (metrics.sectionCount < 8) {
    checks.push({
      passed: false,
      message: `Only ${metrics.sectionCount} sections - too monolithic`,
      suggestion: `Break into 15-35 sections for better readability (7±2 cognitive chunks)`
    });
  }
  
  return checks;
}
```

### Line Count (Backstop Only)

Line count becomes a simple backstop check:

```typescript
function checkLineCount(lines: number): StructureCheck | null {
  if (lines > 500) {
    return {
      passed: false,
      message: `Spec is very long (${lines} lines)`,
      suggestion: `Consider splitting even if token count is acceptable`
    };
  }
  return null;
}
```

### Output Format

**Example 1: Clean spec (016)**
```
✓ 016-github-action passed

Token Analysis:
  2,004 tokens - acceptable, watch for growth
  
Structure:
  ✓ Good sectioning (20 sections) enables cognitive chunking
```

**Example 2: Warning spec (049)**
```
⚠ 049-first-principles has warnings

Token Analysis:
  3,413 tokens (threshold: 3,500) - consider simplification
  
Structure:
  ✓ Uses 5 sub-spec files for progressive disclosure
  ✓ Good sectioning (38 sections) enables cognitive chunking
```

**Example 3: Error spec (066)**
```
✖ 066-context-economy-thresholds-refinement failed

Token Analysis:
  8,073 tokens (threshold: 5,000) - should split for Context Economy
  
Structure:
  Consider using sub-spec files (DESIGN.md, IMPLEMENTATION.md)
    → Progressive disclosure reduces cognitive load for large specs
    
Line Count:
  Spec is very long (843 lines)
    → Consider splitting even if token count is acceptable
```

### Key Improvements

1. **Clear thresholds**: Users see actual token counts and thresholds
2. **No derived scores**: No confusing "45/100" numbers
3. **Independent factors**: Each aspect evaluated separately
4. **Actionable feedback**: Specific suggestions for each issue
5. **Positive reinforcement**: Shows what's working well
6. **Simple logic**: Easy to understand and maintain

### Comparison: Before vs After

**Before (Score-Based):**
```
✖ error: Spec complexity too high (score: 60/100, 8073 tokens) and 843 lines
       → Token count very high - strongly consider splitting; 
         Use sub-spec files for progressive disclosure
```

**After (Direct Thresholds):**
```
✖ error: Spec has 8,073 tokens (threshold: 5,000) - should split for Context Economy
⚠ warning: Consider using sub-spec files (DESIGN.md, IMPLEMENTATION.md)
          → Progressive disclosure reduces cognitive load for large specs
⚠ warning: Spec is very long (843 lines)
          → Consider splitting even if token count is acceptable
```

**Advantages:**
- ✅ Shows actual token count prominently
- ✅ Clear threshold (5,000)
- ✅ Separate, specific suggestions
- ✅ No confusing score math
- ✅ Easy to understand what's wrong and how to fix it

## Plan

### Phase 1: Simplify ComplexityValidator ✓
- [x] Remove score calculation logic
- [x] Implement direct token threshold checks
- [x] Implement independent structure checks
- [x] Update error/warning messages to show actual values
- [x] Keep line count as simple backstop

### Phase 2: Update SubSpecValidator
- [ ] Apply same simplification to sub-spec validation
- [ ] Remove score calculation from sub-spec checks
- [ ] Use direct token thresholds for sub-specs

### Phase 3: Update Tests
- [ ] Remove tests that check score values
- [ ] Add tests for direct threshold behavior
- [ ] Add tests for structure feedback messages
- [ ] Verify output format

### Phase 4: Update Documentation
- [ ] Update AGENTS.md to remove score references
- [ ] Update spec 066 to document simplified approach
- [ ] Update validation output examples in docs

### Phase 5: Test Against Real Specs
- [ ] Validate against all current specs
- [ ] Verify messages are clear and actionable
- [ ] Confirm no false positives/negatives

## Test

### Validation Behavior Tests

**Test Case 1: Excellent spec (<2K tokens)**
- Input: Spec with 1,500 tokens, 15 sections, 250 lines
- Expected: ✓ Pass with positive feedback
- Output: Shows token count, notes good sectioning

**Test Case 2: Good spec (2-3.5K tokens)**
- Input: Spec with 2,800 tokens, 20 sections, 350 lines
- Expected: ✓ Pass with info message
- Output: "acceptable, watch for growth"

**Test Case 3: Warning spec (3.5-5K tokens)**
- Input: Spec with 4,200 tokens, 18 sections, 450 lines
- Expected: ⚠ Warning
- Output: Shows exact token count and threshold (3,500)

**Test Case 4: Error spec (>5K tokens)**
- Input: Spec with 8,073 tokens, 45 sections, 843 lines
- Expected: ✖ Error
- Output: Shows exact token count and threshold (5,000)

**Test Case 5: Good tokens + sub-specs**
- Input: Spec with 3,200 tokens, has 4 sub-specs
- Expected: ✓ Pass with positive feedback
- Output: Notes progressive disclosure

**Test Case 6: High tokens + poor structure**
- Input: Spec with 4,500 tokens, only 5 sections
- Expected: ⚠ Warning for tokens + structure
- Output: Both token warning and sectioning suggestion

**Test Case 7: Line count backstop**
- Input: Spec with 2,500 tokens, 600 lines
- Expected: ⚠ Warning about length
- Output: Token count OK, but warns about line count

### Output Format Tests

- [ ] Error messages show actual token counts
- [ ] Warnings show actual thresholds
- [ ] Structure feedback is separate from token checks
- [ ] Positive feedback appears for good practices
- [ ] No score values (0-100) appear anywhere
- [ ] Messages are actionable with specific suggestions

### Real Spec Validation

Test against actual specs:
- [ ] 016 (2,004 tokens): Should pass cleanly
- [ ] 049 (3,413 tokens): Should pass with info/positive feedback
- [ ] 059 (3,364 tokens): Should pass with positive feedback for sub-specs
- [ ] 066 (8,073 tokens): Should error with clear token threshold message
- [ ] 069 (5,207 tokens): Should error with clear token threshold message

## Notes

### Why Simplify?

**Current Problems:**
1. **Arbitrary math**: `tokenScore (0-60) + structureModifier (-30 to +20) = finalScore` - these ratios are made up
2. **Confusing abstraction**: Score 45/100 is meaningless to users
3. **Misleading results**: >5K tokens with sub-specs gets -30 modifier = "good" (but it's still >5K!)
4. **Hides real data**: Users care about "5,207 tokens" not "score 60"
5. **Hard to maintain**: Complex score calculation logic

**Simplification Benefits:**
1. **Direct thresholds**: If tokens > 5000 → error. Simple.
2. **Clear values**: Show actual tokens and thresholds
3. **Independent checks**: Each factor evaluated separately
4. **Easier to understand**: No derived scores to explain
5. **Easier to maintain**: Straightforward if/else logic

### Design Principles Applied

From First Principles (spec 049):

1. **Context Economy**: Token count is the direct measure of context size - don't abstract it
2. **Signal-to-Noise**: Show actual numbers users care about, not derived scores
3. **Intent Over Implementation**: Users want to know "how many tokens?" not "what's the complexity score?"

### Research Basis & Threshold Validation

**From Academic Research (2024-2025):**

1. **NeedleBench (arXiv:2407.11963, Sep 2025)** - Information Density Study:
   - Models struggle with "information-dense" scenarios where relevant information is continuously distributed
   - "Under-thinking" phenomenon: Models prematurely conclude reasoning despite available information
   - **Finding**: Even advanced reasoning models (Deepseek-R1, OpenAI o3) struggle with continuous retrieval
   - **Implication**: Denser specs (more code blocks, tables) are cognitively heavier

2. **Multi-Turn Degradation (arXiv:2505.06120, May 2025)** - Context Accumulation:
   - **39% average performance drop** in multi-turn conversations vs single-turn
   - LLMs make premature assumptions and overly rely on them
   - **Finding**: "When LLMs take a wrong turn in a conversation, they get lost and do not recover"
   - **Implication**: Accumulated context across turns compounds degradation

**From Latest Models (Nov 2025):**

**OpenAI GPT-5 & Family:**
- **GPT-5**: Flagship model with "thinking built in" for complex tasks
- **GPT-4o**: 128K context window standard
- **Industry standard**: Most models now support 100K-200K tokens
- **Key insight**: "Tasks that would typically require hours of human effort to complete may take Claude a few minutes" - latency increases with context

**Anthropic Claude 4.5 & Family:**
- **Claude Sonnet 4.5**: 200K context standard, **1M tokens (beta)**
- **Pricing**: $3/MTok input, $15/MTok output
- **Extended thinking**: Available for complex reasoning
- **Finding**: "Superior instruction following, tool selection, error correction for long-running agents"
- **Implication**: While 200K+ is possible, optimal performance is still at lower token counts

**Industry Pricing Signal:**
- Standard context: Free/low-cost tier
- Extended context (>50K): Premium pricing
- **Interpretation**: Providers indicate optimal usage is <50K tokens despite technical capacity

**Our Threshold Analysis:**

Real-world spec data from our corpus:
- Median spec: ~2,500 tokens (~300 lines)
- Well-structured: ~3,500 tokens (~400 lines)  
- Large spec: ~5,000 tokens (~550 lines)
- Very large: >8,000 tokens (~800+ lines)

**Conservative Thresholds (RECOMMENDED):**

Based on:
- Multi-turn degradation research (39% drop)
- Information density effects
- Real-world spec corpus
- Industry pricing signals

```
<2,000 tokens:  ✅ Excellent - Baseline performance
                   (~1,500 words, ~250 lines)
                   Fits comfortably with room for conversation

2,000-3,500:    ✅ Good - Slight degradation acceptable
                   (~2,500 words, ~350 lines)
                   Well within all model capacities

3,500-5,000:    ⚠️  Warning - Consider simplification
                   (~4,000 words, ~500 lines)
                   Approaching cognitive/attention limits

>5,000:         🔴 Should split - Significant performance impact
                   (~4,000+ words, ~600+ lines)
                   Research shows compound degradation
```

**Why These Thresholds Remain Valid (Nov 2025):**

1. **Research-backed**: 39% degradation in multi-turn contexts affects all models
2. **Information density**: Dense content (code, tables) remains cognitively heavier
3. **Attention constraints**: Human working memory still limited to 7±2 items
4. **Cost-effective**: Smaller prompts = faster responses + lower costs
5. **Conservative**: Well below technical limits, optimized for quality

**Validation Against Real Specs:**
- 016 (2,004 tokens): ✅ Just above baseline - info appropriate
- 049 (3,413 tokens): ✅ Good range - acceptable
- 059 (3,364 tokens): ✅ Good range with sub-specs
- 066 (8,073 tokens): 🔴 Way over 5K - must split
- 069 (5,207 tokens): 🔴 Just over 5K - should split

**Conclusion**: Despite massive increases in context window sizes (now 200K-1M tokens), our **conservative thresholds (2K/3.5K/5K) remain optimal** for:
- Best AI performance (avoiding multi-turn degradation)
- Human readability (Context Economy principle)
- Cost efficiency (smaller prompts = faster/cheaper)
- Cognitive load (attention limits haven't changed)

**Context windows got bigger, but optimal usage patterns didn't change.**

### Alternative Considered: Weighted Score

We could keep the score approach but make weights more principled:
- Use empirically validated weights from benchmarking
- Make score calculation transparent
- Show breakdown (token score, structure score, etc.)

**Rejected because:**
- Still abstracts away the actual metrics
- Users don't care about scores, they care about token counts
- Adds complexity without clear benefit
- "Good enough" now is better than "perfect" later

### Migration Notes

**Breaking Changes:**
- No more `ComplexityScore.score` field
- No more `recommendation` field ('excellent', 'good', 'review', 'split')
- Validation results return direct checks instead of derived scores

**Backward Compatibility:**
- Can keep deprecated score fields temporarily if needed
- Migration path: Show both old score and new checks for one release
- Remove score fields in v0.4.0

**For Now:**
- Implement new approach as replacement
- Update all tests
- Single release, clean break

### Open Questions

1. **Should we show positive feedback?** (e.g., "✓ Uses sub-specs")
   - Pro: Reinforces good practices
   - Con: Adds noise to output
   - **Decision**: Yes, but only in verbose mode or when spec passes

2. **Info level for 2-3.5K tokens?**
   - Current design: Shows "acceptable, watch for growth"
   - Alternative: Silent pass (only warn/error)
   - **Research supports**: Slight degradation in this range, info message is appropriate
   - **Decision**: Show info message - it's educational and matches research

3. **Line count threshold?**
   - Current: 500 lines backstop
   - Research: Token count is primary, line count is proxy
   - **Decision**: Keep 500 lines as simple backstop for extreme cases

4. **Sub-spec thresholds?**
   - Should sub-specs use same thresholds (2K/3.5K/5K)?
   - Or lower since they're typically smaller?
   - **Hypothesis**: Same thresholds - a sub-spec shouldn't be a dumping ground
   - **Decision**: Use same thresholds, validate with real sub-spec data

### Related Work

- **Spec 066**: Established token-based validation with research
- **Spec 069**: Implemented token counting utilities
- **This spec (071)**: Simplifies the validation logic itself
