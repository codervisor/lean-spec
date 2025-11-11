---
status: in-progress
created: '2025-11-11'
tags:
  - validation
  - philosophy
  - context-economy
  - quality
priority: high
related:
  - 048-spec-complexity-analysis
  - 049-leanspec-first-principles
  - 018-spec-validation
  - 059-programmatic-spec-management
created_at: '2025-11-11T06:58:44.846Z'
updated_at: '2025-11-11T06:58:44.846Z'
---

# Context Economy Thresholds Refinement

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-11-11 · **Tags**: validation, philosophy, context-economy, quality

## Overview

**The Suspicion**: Hard line thresholds (>300 warning, >400 error) may not accurately reflect spec complexity and readability.

**The Investigation**: Deep dive into existing specs + research on LLM performance reveals that **structure, density, and token count matter more than raw line count**.

**Key Finding**: A well-structured 394-line spec with sub-specs can be **more readable** than a dense 316-line spec with 26 code blocks. **Token count is critical** - research shows 39% performance drop in multi-turn contexts and quality degradation beyond 50K tokens.

## Evidence from Current Specs

### Top 4 Largest Specs (All Near Threshold)

| Spec | Lines | Tokens* | Sections | Code Blocks | Lines/Section | Sub-specs | Readable? |
|------|-------|---------|----------|-------------|---------------|-----------|-----------|
| 059-programmatic | 394 | ~2,100 | 32 | 8 | ~12 | 6 files | ✅ Yes |
| 049-first-principles | 374 | ~1,700 | 38 | 0 | ~9 | 5 files | ✅ Yes |
| 051-docs-system-prompt | 339 | ~1,600 | 28 | 4 | ~12 | 0 | ✅ Yes |
| 016-github-action | 315 | ~2,400 | 20 | 26 | ~15 | 0 | ⚠️ Dense |

*Estimated tokens (code is denser: ~3 chars/token vs prose: ~4 chars/token)

### Key Observations

**1. Sub-specs Improve Readability**
- Spec 059 (394 lines): Has 6 sub-spec files → README is just an overview
- Spec 049 (374 lines): Has 5 sub-spec files → Progressive disclosure works
- These are **easier to navigate** than 300-line single-file specs

**2. Section Density Matters More Than Line Count**
- Spec 049: 9 lines/section → Easy to scan and understand
- Spec 016: 15 lines/section + 26 code blocks → Cognitively heavier despite fewer lines

**3. Code Block Density is a Complexity Factor**
- High code density (like spec 016 with 26 blocks) increases cognitive load
- Code requires more attention than prose
- Not captured by simple line counting

**4. Structure Trumps Size**
- A well-organized 400-line spec with clear sections and sub-specs
- Is MORE readable than a poorly structured 250-line spec
- Current validation misses this

**5. Token Count Reveals True Cognitive Load**
- Spec 016: Only 315 lines but **~2,400 tokens** (26 code blocks = dense)
- Spec 049: 374 lines but only **~1,700 tokens** (pure prose, no code)
- Research shows: Quality drops beyond 50K tokens, 6x cost difference between 2,000-line vs 300-line specs
- **Token count better predicts AI performance** than line count

## The Problem with Hard Thresholds

### What Current Validation Checks

```typescript
// Current: Simple line counting
if (lines > 400) return ERROR;
if (lines > 300) return WARNING;
```

**Issues**:
1. ❌ Doesn't account for structure (section organization)
2. ❌ Doesn't account for density (code blocks, lists, tables)
3. ❌ Doesn't account for sub-specs (progressive disclosure)
4. ❌ Doesn't account for content type (prose vs. code vs. data)
5. ❌ **Doesn't account for token count** (true cognitive load for AI)
6. ❌ False positives: 394-line spec with 6 sub-specs → WARNING (but it's fine!)
7. ❌ False negatives: 280-line dense spec with no structure → PASS (but it's hard to read!)

### What Actually Affects Readability

**Cognitive Load Factors (in priority order)**:

1. **Cognitive Chunking** - Can you break it into 7±2 concepts?
   - Well-sectioned spec with 15-30 sections: Easy to chunk
   - Monolithic wall of text: Hard to process

2. **Information Density** - How much attention does each line require?
   - Code blocks: High cognitive load
   - Tables: Medium load
   - Narrative prose: Lower load
   - Frontmatter/lists: Scannable

3. **Progressive Disclosure** - Can you defer details?
   - Spec with sub-specs: Read README for overview, dive into DESIGN.md when needed
   - Single file: Must read everything to understand

4. **Signal-to-Noise** - How much is fluff vs. decision-critical?
   - High signal: Every sentence informs decisions
   - Low signal: Obvious content, verbose explanations

5. **Token Count** - True AI cognitive load (CRITICAL)
   - Research: 39% performance drop in multi-turn contexts
   - Quality degrades beyond 50K tokens despite 200K limits
   - 6x cost difference: 2,000 lines vs 300 lines
   - Code is denser (~3 chars/token) than prose (~4 chars/token)
   - **Better predictor of AI effectiveness than line count**

6. **Total Length** - Raw line count (legacy metric)
   - Yes, it matters, but LESS than the above factors
   - A necessary but not sufficient condition
   - Proxy for token count but less accurate

## Proposed Refined Approach

### Multi-Dimensional Complexity Score

Instead of just line count, calculate **Cognitive Load Score**:

```typescript
type ComplexityMetrics = {
  lineCount: number;
  sectionCount: number;
  codeBlockCount: number;
  codeBlockChars: number;  // Total characters in code blocks
  listItemCount: number;
  tableCount: number;
  tableChars: number;      // Total characters in tables
  hasSubSpecs: boolean;
  subSpecCount: number;
  averageSectionLength: number;
  estimatedTokens: number; // Estimated token count for LLM input
  estimatedReadingTime: number; // minutes
};

type ComplexityScore = {
  score: number; // 0-100
  factors: {
    size: number;        // From line count (0-25)
    tokens: number;      // From token estimation (0-35) - MOST IMPORTANT
    density: number;     // From code blocks, tables (0-20)
    structure: number;   // From section organization (-20 to +20)
    disclosure: number;  // From sub-specs usage (-30)
  };
  recommendation: 'good' | 'review' | 'split';
  costMultiplier: number; // vs 300-line baseline
  aiEffectiveness: number; // 0-100% (degrades with tokens)
};
```

### Scoring Algorithm (Draft)

```typescript
// Token estimation using tokenx package (https://www.npmjs.com/package/tokenx)
// 94% accuracy, 2kB size, zero dependencies
import { estimateTokenCount } from 'tokenx';

function estimateTokens(content: string): number {
  // tokenx provides fast, accurate estimation
  // Handles multi-language support and code/prose automatically
  return estimateTokenCount(content, {
    defaultCharsPerToken: 4, // Default for English prose
  });
}

// Alternative: Manual estimation if tokenx not available
function estimateTokensManual(content: string, metrics: ComplexityMetrics): number {
  const totalChars = content.length;
  const proseChars = totalChars - metrics.codeBlockChars - metrics.tableChars;
  
  // Code: ~3 chars/token (denser)
  // Prose: ~4 chars/token (average)
  // Tables: ~5 chars/token (less dense, lots of formatting)
  const codeTokens = metrics.codeBlockChars / 3;
  const proseTokens = proseChars / 4;
  const tableTokens = metrics.tableChars / 5;
  
  return Math.ceil(codeTokens + proseTokens + tableTokens);
}

function calculateComplexityScore(metrics: ComplexityMetrics): ComplexityScore {
  // Size factor (0-25 points) - reduced weight, line count is proxy
  // Penalty increases non-linearly as line count grows
  const sizePenalty = Math.min(25, (metrics.lineCount / 400) * 25);
  
  // Token factor (0-35 points) - MOST IMPORTANT based on research
  // Research: Degradation begins early (~5K), accelerates at ~10-20K, severe at ~50K+
  // Cost scales linearly, but quality degrades non-linearly
  // Target: <1,500 tokens (minimal impact), <3,000 (acceptable), >5,000 (degradation zone)
  let tokenPenalty = 0;
  if (metrics.estimatedTokens < 1500) {
    tokenPenalty = 0;  // ~375 lines - excellent, minimal degradation
  } else if (metrics.estimatedTokens < 2000) {
    tokenPenalty = 10; // ~500 lines - acceptable, slight degradation
  } else if (metrics.estimatedTokens < 3000) {
    tokenPenalty = 20; // ~750 lines - warning, noticeable degradation
  } else if (metrics.estimatedTokens < 5000) {
    tokenPenalty = 30; // ~1250 lines - significant degradation begins
  } else {
    tokenPenalty = 35; // >5000 tokens - severe penalty (degradation zone, high costs)
  }
  
  // Density factor (0-20 points) - reduced weight, captured by tokens
  // More code blocks = higher cognitive load
  const densityPenalty = Math.min(20, 
    (metrics.codeBlockCount * 1.5) + 
    (metrics.tableCount * 1)
  );
  
  // Structure factor (-20 to +20 points)
  // Good: 15-30 sections (easy to chunk, follows 7±2 rule)
  // Bad: <10 sections (no structure) or >40 sections (too fragmented)
  const structureScore = metrics.sectionCount >= 15 && metrics.sectionCount <= 30 
    ? -20  // Bonus for good structure
    : metrics.sectionCount < 10 
      ? +20  // Penalty for poor structure
      : +10; // Slight penalty for over-fragmentation
  
  // Progressive disclosure factor (-30 points bonus)
  // Has sub-specs = major reduction in cognitive load
  const disclosureBonus = metrics.hasSubSpecs ? -30 : 0;
  
  const totalScore = sizePenalty + tokenPenalty + densityPenalty + structureScore + disclosureBonus;
  
  // Calculate cost multiplier (vs 300-line baseline ≈ 1,200 tokens)
  const baselineTokens = 1200;
  const costMultiplier = metrics.estimatedTokens / baselineTokens;
  // Calculate AI effectiveness (degrades with token count)
  // Research: 39% avg drop in multi-turn, degradation starts early, non-linear
  // Note: Severe "50K cliff" is much later, but degradation begins at ~5K tokens
  let aiEffectiveness = 100;
  if (metrics.estimatedTokens > 10000) {
    aiEffectiveness = 50; // Severe degradation (approaching research thresholds)
  } else if (metrics.estimatedTokens > 5000) {
    aiEffectiveness = 65; // Significant degradation (measurable quality loss)
  } else if (metrics.estimatedTokens > 3000) {
    aiEffectiveness = 75; // Noticeable degradation begins
  } else if (metrics.estimatedTokens > 2000) {
    aiEffectiveness = 85; // Slight degradation (within acceptable range)
  } else if (metrics.estimatedTokens > 1500) {
    aiEffectiveness = 95; // Minimal impact
  } aiEffectiveness = 95; // Minimal impact
  }
  
  return {
    score: Math.max(0, Math.min(100, totalScore)),
    factors: {
      size: sizePenalty,
      tokens: tokenPenalty,
      density: densityPenalty,
      structure: structureScore,
      disclosure: disclosureBonus,
    },
    recommendation: 
      totalScore <= 30 ? 'good' :
      totalScore <= 60 ? 'review' :
      'split',
    costMultiplier: Math.round(costMultiplier * 10) / 10,
    aiEffectiveness: Math.round(aiEffectiveness),
  };
}
```

### New Thresholds

Instead of hard line limits:

- **Score 0-30**: ✅ Good - Readable and well-structured
- **Score 31-60**: ⚠️ Review - Consider simplification or splitting
- **Score 61-100**: 🔴 Split - Too complex, should split

### Examples Applied to Current Specs

**Spec 059 (394 lines, ~2,100 tokens, 32 sections, 8 code blocks, 6 sub-specs)**:
- Size penalty: ~25 (394/400 * 25)
- Token penalty: 20 (~2,100 tokens, acceptable range)
- Density penalty: ~12 (8 blocks * 1.5)
- Structure bonus: -20 (32 sections, well-chunked)
- Disclosure bonus: -30 (has sub-specs)
- **Total: 7 points** → ✅ Good | Cost: 1.8x | AI: 85%

**Spec 016 (315 lines, ~2,400 tokens, 20 sections, 26 code blocks, no sub-specs)**:
- Size penalty: ~20 (315/400 * 25)
- Token penalty: 20 (~2,400 tokens, code density)
- Density penalty: ~20 (26 blocks * 1.5, capped at 20)
- Structure bonus: -20 (20 sections, acceptable)
- Disclosure bonus: 0 (no sub-specs)
- **Total: 40 points** → ⚠️ Review | Cost: 2.0x | AI: 85%
- **Key insight**: Dense code blocks → high token count despite fewer lines

**Spec 051 (339 lines, ~1,600 tokens, 28 sections, 4 code blocks, no sub-specs)**:
- Size penalty: ~21 (339/400 * 25)
- Token penalty: 10 (~1,600 tokens, efficient prose)
- Density penalty: ~6 (4 blocks * 1.5)
- Structure bonus: -20 (28 sections, well-chunked)
- Disclosure bonus: 0 (no sub-specs)
- **Total: 17 points** → ✅ Good | Cost: 1.3x | AI: 95%

**Spec 049 (374 lines, ~1,700 tokens, 38 sections, 0 code blocks, 5 sub-specs)**:
- Size penalty: ~23 (374/400 * 25)
- Token penalty: 10 (~1,700 tokens, pure prose)
- Density penalty: 0 (no code blocks)
- Structure bonus: -20 (38 sections, well-chunked)
- Disclosure bonus: -30 (has sub-specs)
- **Total: -17 points** → ✅ Excellent | Cost: 1.4x | AI: 95%
- **Key insight**: Sub-specs + good structure = readable despite length

**Hypothetical: 280 lines, ~1,400 tokens, 5 sections, no code blocks, no sub-specs**:
- Size penalty: ~18 (280/400 * 25)
- Token penalty: 0 (~1,400 tokens, good range)
- Density penalty: 0
- Structure penalty: +20 (only 5 sections, poor chunking)
- Disclosure bonus: 0
- **Total: 38 points** → ⚠️ Review | Cost: 1.2x | AI: 95%
- **Key insight**: Short but poorly structured still problematic

## Validation Changes Needed

### Phase 1: Add Complexity Metrics (v0.3.0)

Enhance validation to collect:
```typescript
interface SpecComplexity {
  lineCount: number;
  sectionCount: number;
  codeBlockCount: number;
  listItemCount: number;
  tableCount: number;
  subSpecFiles: string[];
  averageSectionLength: number;
  estimatedReadingTime: number;
}
```

### Phase 2: Implement Complexity Scoring (v0.3.0)

Add new validator:
```typescript
class ComplexityScoreValidator implements ValidationRule {
  name = 'complexity-score';
  description = 'Multi-dimensional complexity analysis';
  
  validate(spec: SpecInfo, content: string): ValidationResult {
    const metrics = analyzeComplexity(spec, content);
    const score = calculateComplexityScore(metrics);
    
    if (score.recommendation === 'split') {
      return {
        passed: false,
        errors: [{
          message: `Spec complexity too high (score: ${score.score}/100)`,
          suggestion: `Consider splitting. Main issues: ${identifyTopIssues(score.factors)}`,
        }],
      };
    }
    
    if (score.recommendation === 'review') {
      return {
        passed: true,
        warnings: [{
          message: `Spec complexity moderate (score: ${score.score}/100)`,
          suggestion: `Consider: ${suggestImprovements(metrics, score.factors)}`,
        }],
      };
    }
    
    return { passed: true, errors: [], warnings: [] };
  }
}
```

### Phase 3: Keep Line Count as Backstop (v0.3.0)

Don't remove line count validation entirely - use it as a **backstop**:

```typescript
// Complexity score is primary
// Line count is secondary safety net

if (complexityScore < 60 && lineCount < 500) {
  // Good - pass both checks
} else if (complexityScore < 60 && lineCount >= 500) {
  // Warning - good structure but very long
  warning("Well-structured but consider splitting for Context Economy");
} else if (complexityScore >= 60 && lineCount < 400) {
  // Error - complex despite being shorter
  error("Poor structure or high density - needs refactoring");
} else {
  // Error - both metrics problematic
  error("Too complex - split into sub-specs");
}
```

### Phase 4: Educate Users (v0.3.0)

Update guidance:
- AGENTS.md: Explain complexity factors beyond line count
- README.md: Show examples of good vs. poor structure
- Validation output: Explain WHY a spec is complex
- CLI: Add `lean-spec complexity <spec>` command for detailed analysis

### 1. Token Count is Critical

**Source**: [AI Agent Performance Blog Post](https://www.lean-spec.dev/blog/ai-agent-performance)

- **Finding**: 2,000-line spec costs **6x more** than 300-line spec
- **Finding**: Quality degradation happens **even within context limits** (not just at 50K)
- **Key Quote**: "Quality drops beyond 50K tokens despite 200K limits" - but degradation **starts much earlier**
- **Why**: Attention dilution (N² complexity), context rot, option overload, premature convergence/ai-agent-performance)

- **Finding**: 2,000-line spec costs **6x more** than 300-line spec
- **Finding**: Quality degradation happens **even within context limits** (not just at 50K)
- **Key Quote**: "Quality drops beyond 50K tokens despite 200K limits" - but degradation **starts much earlier**
- **Why**: Attention dilution (N² complexity), context rot, option overload, premature convergence

### 2. Multi-Turn Performance Degradation

**Source**: [arXiv:2505.06120 - "LLMs Get Lost In Multi-Turn Conversation"](https://arxiv.org/abs/2505.06120)

- **Finding**: **39% average performance drop** across six generation tasks
- **Root Cause**: LLMs make premature assumptions and can't recover
- **Key Quote**: "When LLMs take a wrong turn, they get lost and do not recover"

### 3. Function-Calling Performance

**Source**: [Berkeley Function-Calling Leaderboard (BFCL)](https://gorilla.cs.berkeley.edu/leaderboard.html)

- **Finding**: ALL models perform worse with more tools/options
- **Implication**: More context = more confusion = lower accuracy

### 4. Information Density Matters

**Source**: [arXiv:2407.11963 - "NeedleBench"](https://arxiv.org/abs/2407.11963)

- **Finding**: Models struggle with information-dense scenarios even at shorter context lengths
- **Phenomenon**: "Under-thinking" - premature reasoning termination

### 5. Long-Context RAG Performance

**Source**: [Databricks Research](https://www.databricks.com/blog/long-context-rag-performance-llms)

- **Finding**: Long-context performance degrades significantly even within theoretical limits
- **Implication**: Smaller models degrade earlier

### Key Takeaway

**Token count is a better predictor of AI performance than line count** because:
1. Direct measure of LLM input cost
2. Accounts for content density (code vs prose)
3. Backed by research showing **non-linear degradation patterns**
4. Correlates with actual AI effectiveness

**Degradation Gradient** (based on research):
- **<2K tokens**: Baseline performance (~100% effectiveness)
- **2-5K tokens**: Early degradation begins (~85-95% effectiveness)
- **5-10K tokens**: Noticeable degradation (~65-85% effectiveness)
- **10-20K tokens**: Moderate degradation (~50-65% effectiveness)  
- **50K+ tokens**: Severe "cliff" effect (~40% performance drop or worse)

For validation, we use conservative thresholds (5K tokens = severe penalty) to catch specs **before** they reach problematic sizes.

## Implementation Plan

### Phase 1: Research & Metrics ✅ (This spec)
- [x] Investigate current specs
- [x] Identify complexity factors
- [x] Propose scoring algorithm
- [ ] Get feedback on approach

### Phase 2: Core Implementation (v0.3.0)
- [ ] Install `tokenx` package for token estimation
- [ ] Implement `analyzeComplexity()` function (with tokenx integration)
- [ ] Implement `calculateComplexityScore()` function
- [ ] Create `ComplexityScoreValidator` class
- [ ] Add tests for edge cases (including token count accuracy)
- [ ] Integrate with existing validation framework

### Phase 3: CLI Integration (v0.3.0)
- [ ] Add `lean-spec complexity <spec>` command
- [ ] Show breakdown of complexity factors (including token count)
- [ ] Display cost multiplier and AI effectiveness estimates
- [ ] Provide actionable suggestions based on scoring
- [ ] Update `lean-spec validate` output with token metrics

### Phase 4: Documentation & Refinement (v0.3.0)
- [ ] Update AGENTS.md with complexity guidance
- [ ] Update README.md with examples
- [ ] Create "good structure" showcase
- [ ] Refine scoring weights based on usage

### Phase 5: Advanced Features (v0.4.0)
- [ ] Complexity trends over time
- [ ] Project-wide complexity dashboard
- [ ] Automated splitting suggestions

## Implementation Details

### Token Estimation: Two Options

We have two viable approaches for token counting, each with different tradeoffs:

#### Option 1: tokenx (Recommended for Validation)

**Fast, lightweight estimation** - Best for validation thresholds where perfect accuracy isn't critical.

**Pros:**
- ✅ 94% accuracy compared to full tokenizers
- ✅ Just **2kB** bundle size with **zero dependencies**
- ✅ Very fast - no tokenization overhead
- ✅ Multi-language support (English, German, French, Chinese, etc.)
- ✅ Good enough for validation warnings/errors
- ✅ 45K+ weekly downloads

**Cons:**
- ❌ Not 100% accurate (6-12% error margin)
- ❌ Estimation-based, not true BPE encoding

**Installation:**
```bash
npm install tokenx
```

**Usage:**
```typescript
import { estimateTokenCount, isWithinTokenLimit } from 'tokenx';

// Fast estimation for validation
const tokens = estimateTokenCount(specContent);

// Check if within limit (e.g., 5000 token warning threshold)
const needsReview = !isWithinTokenLimit(specContent, 5000);
```

**Accuracy benchmarks:**
- English prose: 10-12% error margin
- Code (TypeScript): 6.18% error margin
- Large text (31K tokens): 12.29% error margin

---

#### Option 2: gpt-tokenizer (For Exact Counts)

**Precise tokenization** - Port of OpenAI's tiktoken with 100% accuracy.

**Pros:**
- ✅ **100% accurate** - exact BPE encoding
- ✅ Supports all OpenAI models (GPT-4o, GPT-4, GPT-3.5, etc.)
- ✅ Fastest full tokenizer on NPM (faster than WASM bindings)
- ✅ Built-in cost estimation with `estimateCost()`
- ✅ Chat-specific tokenization with `encodeChat()`
- ✅ 283K+ weekly downloads, trusted by Microsoft, Elastic

**Cons:**
- ❌ **53.1 MB** unpacked size (vs 2kB for tokenx)
- ❌ Slower than estimation (but still fastest full tokenizer)
- ❌ Model-specific - need to import correct encoding

**Installation:**
```bash
npm install gpt-tokenizer
```

**Usage:**
```typescript
import { encode, countTokens, isWithinTokenLimit } from 'gpt-tokenizer';
// or model-specific: from 'gpt-tokenizer/model/gpt-4o'

// Exact token count
const tokens = encode(specContent);
const count = tokens.length;

// Or use helper
const exactCount = countTokens(specContent);

// Check limit with exact counting
const needsReview = !isWithinTokenLimit(specContent, 5000);
```

**Accuracy:**
- 100% accurate (port of OpenAI's tiktoken)
- Benchmarked against OpenAI's Python library

---

### Recommendation: Hybrid Approach

**For v0.3.0, use tokenx:**
- Fast validation during CLI commands
- 2kB size won't bloat the package
- 94% accuracy is sufficient for warnings/errors
- 6-12% margin is acceptable for thresholds

**Future: Offer gpt-tokenizer as optional**
- Add as peer dependency (optional install)
- Use if available for exact counts
- Fall back to tokenx if not installed
- Display "estimated" vs "exact" in output

**Implementation:**
```typescript
// Try exact tokenizer first, fall back to estimation
let tokenCount: number;
let isExact = false;

try {
  const { countTokens } = await import('gpt-tokenizer');
  tokenCount = countTokens(content);
  isExact = true;
} catch {
  const { estimateTokenCount } = await import('tokenx');
  tokenCount = estimateTokenCount(content);
  isExact = false;
}

// Display in output
console.log(`Tokens: ${tokenCount} ${isExact ? '(exact)' : '(estimated ±6%)'}`);
```

## Open Questions

1. **Scoring Weights**: Are the penalty/bonus values correct?
   - Token penalty weighted as most important (0-35 pts) - validate with real specs
   - Structure and disclosure bonuses seem right - need user feedback
   - Need to test on more specs across projects

2. **Section Count Sweet Spot**: Is 15-30 sections the right range?
   - Cognitive science suggests 7±2 chunks
   - But specs have nested sections (##, ###, ####)
   - May need to weight by heading level in future refinement
3. **Token Threshold Values**: Are 1,500 / 3,000 / 5,000 the right thresholds?
   - Based on research showing **early degradation** (not the 50K cliff)
   - 5K tokens = degradation zone begins, not "approaching cliff"
   - May need adjustment based on real-world usage
   - Consider model-specific thresholds (Claude vs GPT vs local models)
   - Should we add intermediate thresholds? (e.g., 10K, 20K for context)
   - Consider model-specific thresholds (Claude vs GPT vs local models)

4. **Backwards Compatibility**: How to handle transition?
   - Keep line count warnings during v0.3.0?
   - Phase out gradually in v0.4.0?
   - Or switch immediately with good messaging?

5. **Performance**: Is this too complex to calculate?
   - tokenx is very fast (2kB, no dependencies)
   - Need to benchmark on large projects (100+ specs)
   - Consider caching complexity scores in frontmatter
   - Only recalculate on file changests
   - Cache complexity scores?
   - Only recalculate on file changes?

## Success Criteria

We'll know this refinement succeeded when:

- ✅ Spec 059 (394 lines, 6 sub-specs) passes validation without warnings
- ✅ Dense specs with poor structure get flagged even if <300 lines
- ✅ Users understand WHY a spec is complex, not just that it's "too long"
- ✅ Validation guides users toward better structure, not just shorter specs
- ✅ AI agents make better splitting decisions based on complexity factors
- ✅ No regression: Truly oversized specs (>600 lines) still get caught

## Related Specs

- **[048-spec-complexity-analysis](../048-spec-complexity-analysis/)** - Identified line count thresholds
- **[049-leanspec-first-principles](../049-leanspec-first-principles/)** - Context Economy principle
- **[059-programmatic-spec-management](../059-programmatic-spec-management/)** - Context engineering and programmatic analysis
- **[018-spec-validation](../018-spec-validation/)** - Current validation framework

## Notes

### Why This Matters

**Current Problem**: False positives and false negatives
- We're warning about well-structured 394-line specs (false positive)
- We're missing dense 280-line specs with poor structure (false negative)

**Impact**:
- Users may ignore warnings if they seem arbitrary
- AI agents get confused about when to split
- We're not measuring what we actually care about (readability, not just length)

**Solution**: Measure complexity more holistically
- Line count remains important but not sufficient
- Structure, density, and progressive disclosure matter
- Give users actionable feedback

### The Meta-Learning

This spec itself demonstrates the principle:
- 410 lines, ~2,200 tokens (includes code examples)
- Well-structured with clear sections (28 sections)
- Each section is scannable and focused
- Tables and lists make information easy to parse
- References research with clear citations

**Applying the new scoring to this spec:**
- Size penalty: ~26 (410/400 * 25)
- Token penalty: 20 (~2,200 tokens)
- Density penalty: ~12 (8 code blocks * 1.5)
- Structure bonus: -20 (28 sections, good chunking)
- Disclosure bonus: 0 (no sub-specs yet)
- **Total: 38 points** → ⚠️ Review | Cost: 1.8x | AI: 85%

**Recommendation**: This spec is at the threshold. Could benefit from splitting research section into sub-spec.

Using old rules: "🔴 Error: 410/400 lines - must split!"
Using new rules: "⚠️ Review: Score 38/100 - well-structured but approaching limits, consider sub-specs for research details"

---

**Status**: Research complete, awaiting feedback before implementation.
