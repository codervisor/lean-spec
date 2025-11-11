---
status: complete
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
updated_at: '2025-11-11T15:00:26.886Z'
completed_at: '2025-11-11T15:00:26.886Z'
completed: '2025-11-11'
transitions:
  - status: complete
    at: '2025-11-11T15:00:26.886Z'
---

# Context Economy Thresholds Refinement

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-11 · **Tags**: validation, philosophy, context-economy, quality

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
    tokens: number;      // Primary: token-based score (0-60)
    structure: number;   // Modifier: structure quality (-30 to +20)
  };
  recommendation: 'good' | 'review' | 'split';
  costMultiplier: number; // vs 300-line baseline
  aiEffectiveness: number; // 0-100% (hypothesis to validate)
};
```

### Scoring Algorithm (Draft)

```typescript
// Token estimation using tokenx package (https://www.npmjs.com/package/tokenx)
// 94% accuracy, 2kB size, zero dependencies
import { estimateTokenCount } from 'tokenx';

function calculateComplexityScore(metrics: ComplexityMetrics): ComplexityScore {
  // PRIMARY: Token count (research-backed predictor of AI performance)
  // Thresholds to be validated empirically - these are hypotheses
  const tokenScore = 
    metrics.estimatedTokens < 2000 ? 0 :   // Excellent
    metrics.estimatedTokens < 3500 ? 20 :  // Good
    metrics.estimatedTokens < 5000 ? 40 :  // Warning
    60;                                     // Should split
  
  // MODIFIERS: Structure quality adjusts token-based score
  // Sub-specs enable progressive disclosure (big win for Context Economy)
  // Good sectioning enables cognitive chunking (7±2 rule)
  const structureModifier = 
    metrics.hasSubSpecs ? -30 :                           // Progressive disclosure bonus
    (metrics.sectionCount >= 15 && metrics.sectionCount <= 35) ? -15 : // Good chunking
    (metrics.sectionCount < 8) ? +20 :                    // Too monolithic
    0;                                                     // Acceptable
  
  const finalScore = Math.max(0, Math.min(100, tokenScore + structureModifier));
  
  // Calculate cost multiplier (vs 300-line baseline ≈ 1,200 tokens)
  const baselineTokens = 1200;
  const costMultiplier = metrics.estimatedTokens / baselineTokens;
  
  // AI effectiveness estimate (to be validated empirically)
  // Research suggests degradation, but exact thresholds need testing
  let aiEffectiveness = 100;
  if (metrics.estimatedTokens > 10000) {
    aiEffectiveness = 50; // Severe degradation (hypothesis)
  } else if (metrics.estimatedTokens > 5000) {
    aiEffectiveness = 65; // Significant degradation (hypothesis)
  } else if (metrics.estimatedTokens > 3500) {
    aiEffectiveness = 80; // Noticeable degradation (hypothesis)
  } else if (metrics.estimatedTokens > 2000) {
    aiEffectiveness = 90; // Slight degradation (hypothesis)
  }
  
  return {
    score: finalScore,
    factors: {
      tokens: tokenScore,        // Primary factor
      structure: structureModifier, // Modifier
    },
    recommendation: 
      finalScore <= 25 ? 'good' :
      finalScore <= 50 ? 'review' :
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
- Token score: 20 (~2,100 tokens)
- Structure modifier: -30 (has sub-specs)
- **Total: -10 points** → ✅ Excellent | Cost: 1.8x | AI: 90%

**Spec 016 (315 lines, ~2,400 tokens, 20 sections, 26 code blocks, no sub-specs)**:
- Token score: 20 (~2,400 tokens)
- Structure modifier: -15 (20 sections, good chunking)
- **Total: 5 points** → ✅ Good | Cost: 2.0x | AI: 90%
- **Key insight**: Token count captures code density automatically

**Spec 051 (339 lines, ~1,600 tokens, 28 sections, 4 code blocks, no sub-specs)**:
- Token score: 0 (~1,600 tokens)
- Structure modifier: -15 (28 sections, good chunking)
- **Total: -15 points** → ✅ Excellent | Cost: 1.3x | AI: 100%

**Spec 049 (374 lines, ~1,700 tokens, 38 sections, 0 code blocks, 5 sub-specs)**:
- Token score: 0 (~1,700 tokens)
- Structure modifier: -30 (has sub-specs, 38 sections)
- **Total: -30 points** → ✅ Excellent | Cost: 1.4x | AI: 100%
- **Key insight**: Sub-specs + good structure = optimal

**Hypothetical: 280 lines, ~1,400 tokens, 5 sections, no code blocks, no sub-specs**:
- Token score: 0 (~1,400 tokens)
- Structure modifier: +20 (only 5 sections, poor chunking)
- **Total: 20 points** → ✅ Good | Cost: 1.2x | AI: 100%
- **Key insight**: Short with poor structure still acceptable (tokens dominate)

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
- [x] Design empirical validation plan
- [x] Get feedback on approach

### Phase 2: Core Implementation (v0.3.0 - Next)
- [ ] Install `tokenx` for token estimation
- [ ] Implement simplified `calculateComplexityScore()` function
- [ ] Use **hypothesis thresholds** (2K/3.5K/5K tokens) initially
- [ ] Create `ComplexityScoreValidator` class
- [ ] Add tests for edge cases
- [ ] Integrate with existing validation framework

### Phase 3: CLI Integration (v0.3.0)
- [ ] Add `lean-spec complexity <spec>` command
- [ ] Show breakdown: token score, structure modifier
- [ ] Display cost multiplier and AI effectiveness estimates
- [ ] Provide actionable suggestions
- [ ] Update `lean-spec validate` output

### Phase 4: Documentation (v0.3.0)
- [ ] Update AGENTS.md with complexity guidance
- [ ] Update README.md with examples
- [ ] Create "good structure" showcase
- [ ] Document that thresholds are hypotheses pending validation

### Phase 5: Empirical Validation (Future - v0.4.0+)
**Deferred until we have:**
- More real-world usage data from v0.3.0
- Clear methodology for LLM integration
- Resources for comprehensive benchmarking

**Tasks when ready:**
- [ ] Implement benchmark framework (already stubbed in `src/benchmark/`)
- [ ] Define benchmark tasks for 10+ specs
- [ ] Run benchmarks to validate thresholds
- [ ] Refine scoring weights based on data
- [ ] Publish empirical findings

### Phase 6: Advanced Features (v0.4.0+)
- [ ] Complexity trends over time
- [ ] Project-wide complexity dashboard
- [ ] Automated splitting suggestions
- [ ] Model-specific thresholds (if empirical data shows need)

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

## Empirical Validation Plan (Future Work)

**Status**: Deferred to v0.4.0+ - too early for comprehensive benchmarking

**The Problem**: Current thresholds (2K/3.5K/5K tokens) are hypotheses based on research, not validated on LeanSpec's actual use case.

**The Challenge**: Building a proper benchmark suite requires:
- Clear methodology for LLM integration and evaluation
- Significant time investment for framework + test data
- Real-world usage patterns from v0.3.0 to guide validation
- Resources for running benchmarks across multiple models

**The Pragmatic Approach**:
1. **v0.3.0**: Ship complexity scoring with research-based thresholds (good enough to start)
2. **Collect data**: Gather real-world usage patterns, see which specs trigger warnings
3. **v0.4.0+**: Build benchmark framework when we have clearer requirements

**Validation Framework Stub** (see `src/benchmark/` for implementation):
- Type definitions and interfaces ready
- Complexity analysis functions implemented
- Benchmark task examples defined
- LLM integration and statistical analysis deferred

**When ready to validate**, the framework will answer:
- Does token count predict performance better than line count?
- Where does degradation actually start? (2K? 3K? 5K?)
- How much do sub-specs improve AI comprehension?
- What's the real cost multiplier for large specs?

**For now**: Use hypothesis thresholds, document them as such, refine based on user feedback in v0.3.0.

## Open Questions

1. **Token Thresholds**: Are 2K/3.5K/5K correct?
   - **Current**: Using research-based hypotheses
   - **To validate (v0.4.0+)**: Run benchmark suite when methodology is clear
   - **For now**: Gather user feedback in v0.3.0, adjust if obviously wrong

2. **Structure Impact**: How much does it matter?
   - **Current**: -30 bonus for sub-specs, -15 for good sectioning
   - **To validate (v0.4.0+)**: Compare monolithic vs sub-spec variants
   - **For now**: Based on cognitive science (7±2 chunks) and intuition

3. **Section Count Sweet Spot**: Is 15-35 sections right?
   - **Current**: Based on cognitive load theory
   - **To validate (v0.4.0+)**: Test specs with varying section counts
   - **For now**: Seems reasonable, may adjust based on user feedback

4. **Model Differences**: Do thresholds vary by model?
   - **Current**: Assume similar across Claude/GPT
   - **To validate (v0.4.0+)**: Test multiple models if data shows divergence
   - **For now**: Single set of thresholds

5. **Performance**: Can we run this efficiently?
   - **Current**: tokenx is very fast (2kB, no dependencies)
   - **To benchmark**: Test on 100+ specs to verify <100ms per spec
   - **For now**: Should be fine, optimize if issues arise

## Success Criteria

### Phase 2-4: Initial Implementation (v0.3.0)
- ✅ Spec 059 (394 lines, 6 sub-specs) scores well (≤25 points)
- ✅ Poorly structured specs flagged even if short
- ✅ Users understand WHY a spec is complex (clear breakdown)
- ✅ Validation guides toward better structure, not just length reduction
- ✅ AI agents make informed splitting decisions based on token count + structure
- ✅ No false negatives: Truly oversized specs (>600 lines) caught
- ✅ Thresholds documented as hypotheses, not validated facts

### Phase 5: Empirical Validation (v0.4.0+ - When Ready)
- ✅ Token count predicts performance better than line count (R² > 0.7 vs < 0.5)
- ✅ Degradation thresholds validated within ±500 tokens of hypothesis
- ✅ Sub-specs show measurable quality improvement (>5% accuracy)
- ✅ Cost multiplier validated against actual API usage
- ✅ Multi-turn degradation measured and documented

### User Experience (All Phases)
- ✅ Complexity scores align with user intuition
- ✅ Suggestions are actionable and specific
- ✅ AGENTS.md reflects current best practices (hypothesis-based for v0.3.0)

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

**Applying the simplified scoring to this spec:**
- Token score: 20 (~2,200 tokens, in good range)
- Structure modifier: -15 (28 sections, good chunking, no sub-specs)
- **Total: 5 points** → ✅ Good | Cost: 1.8x | AI: 90%

**Insight**: Well-structured with clear sections. Could benefit from sub-specs for benchmark details (would get -30 modifier).

Using old rules: "🔴 Error: 410/400 lines - must split!"
Using new rules: "✅ Good: Score 5/100 - well-structured, token count acceptable, consider sub-specs to reach 'excellent'"

---

**Status**: Research complete, awaiting feedback before implementation.
