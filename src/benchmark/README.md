# Complexity Benchmark Framework

Framework for empirically validating complexity thresholds against real AI performance.

## Purpose

Validates that our complexity scoring (token count, structure, etc.) actually predicts AI agent performance:
- **Accuracy**: Does the AI answer questions correctly?
- **Cost**: How many tokens are consumed?
- **Quality**: Are responses relevant, complete, and precise?

## Quick Start

```bash
# Install dependencies
npm install

# Run benchmark suite (when LLM integration is added)
npm run benchmark:complexity

# Test specific specs
npm run benchmark:complexity -- --specs 059,016,051

# Compare structure variants
npm run benchmark:complexity -- --variants spec-059-*
```

## Architecture

### 1. Benchmark Tasks (`BenchmarkTask`)

Define questions to ask about specs:

```typescript
{
  name: "Summarize Intent",
  spec: "059-programmatic-spec-management",
  prompts: [
    "What is the main problem this spec solves?",
    "What are the key design decisions?"
  ],
  expectedAnswers: [
    "Enable AI agents to programmatically manage specs",
    "MCP server protocol with JSON output"
  ]
}
```

### 2. Metrics Collection (`BenchmarkResult`)

Measures performance across multiple dimensions:
- **Performance**: Accuracy, latency, token cost
- **Quality**: Relevance, completeness, precision (1-5 scale)
- **Complexity**: Lines, tokens, sections, structure

### 3. Analysis (`analyzeBenchmarkResults`)

Statistical analysis to validate hypotheses:
- Token count vs accuracy correlation (R²)
- Line count vs accuracy correlation (R²)
- Sub-spec impact on quality
- Degradation threshold identification

### 4. Reporting (`generateBenchmarkReport`)

Markdown output with findings and revised thresholds.

## Validation Questions

The framework tests these hypotheses:

1. **Token count predicts performance better than line count**
   - Measure: Correlation coefficients (R²)
   - Success: Token R² > 0.7, Line R² < 0.5

2. **Degradation starts at specific thresholds**
   - Measure: Accuracy drop at 2K, 3.5K, 5K tokens
   - Success: Identify threshold within ±500 tokens

3. **Structure compensates for length**
   - Measure: Sub-spec variants vs monolithic
   - Success: >5% accuracy improvement

4. **Cost scales predictably**
   - Measure: Actual token consumption
   - Success: Validate 6x multiplier for 2000-line specs

5. **Multi-turn degradation occurs**
   - Measure: Accuracy across 5-turn conversations
   - Success: Measure actual degradation percentage

## Implementation Status

### ✅ Phase 1: Framework Structure
- [x] Type definitions
- [x] Complexity analysis functions
- [x] Benchmark task definitions
- [x] Report generation

### 🔄 Phase 2: LLM Integration (TODO)
- [ ] Claude API integration
- [ ] GPT-4 API integration (optional)
- [ ] Response evaluation logic
- [ ] Token usage tracking
- [ ] Multi-turn conversation handling

### 🔄 Phase 3: Statistical Analysis (TODO)
- [ ] Correlation calculation (R²)
- [ ] Degradation threshold detection
- [ ] Sub-spec impact measurement
- [ ] Cost multiplier validation

### 📋 Phase 4: CLI & Automation (TODO)
- [ ] Command-line interface
- [ ] Spec variant generation (monolithic, compressed, expanded)
- [ ] Automated report generation
- [ ] CI integration

## Example Output

```markdown
# Complexity Benchmark Results

## Performance by Token Count

| Spec | Lines | Tokens | Structure | Accuracy | Cost | Quality |
|------|-------|--------|-----------|----------|---------|----------|
| 051  | 339   | 1,600  | 28 sections | 94% | $0.12 | 4.2/5 |
| 059  | 394   | 2,100  | 6 sub-specs | 91% | $0.18 | 4.0/5 |
| 016  | 315   | 2,400  | 20 sections | 87% | $0.22 | 3.7/5 |

## Validated Findings

✅ Token count correlation: R² = 0.82
✅ Line count correlation: R² = 0.34
✅ Sub-specs impact: +8% accuracy
⚠️ Degradation threshold: 2,500 tokens (not 5K as hypothesized)

## Revised Thresholds (Data-Driven)

- <1,500 tokens: Excellent (95%+ accuracy)
- 1,500-2,500: Good (90-95% accuracy)
- 2,500-4,000: Warning (85-90% accuracy)
- >4,000: Split (>10% accuracy drop)
```

## Next Steps

1. **Add LLM integration**: Implement Claude API calls
2. **Create test variants**: Generate monolithic/compressed versions of specs
3. **Run initial benchmarks**: Test on 5-10 specs
4. **Analyze results**: Calculate correlations and thresholds
5. **Update validation logic**: Use empirical thresholds in complexity scoring

## Related

- **Spec 066**: Context Economy Thresholds Refinement (this framework validates it)
- **Spec 018**: Spec Validation (uses complexity scoring)
- **Spec 059**: Programmatic Spec Management (enables automated testing)
