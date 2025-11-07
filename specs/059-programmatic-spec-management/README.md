---
status: planned
created: '2025-11-07'
tags:
  - context-engineering
  - automation
  - tooling
  - ai-agents
  - performance
  - v0.3.0
priority: critical
created_at: '2025-11-07T11:28:43.206Z'
related:
  - 048-spec-complexity-analysis
  - 049-leanspec-first-principles
  - 018-spec-validation
  - 012-sub-spec-files
---

# Programmatic Spec Management & Context Engineering

> **Status**: 📅 Planned · **Priority**: Critical · **Created**: 2025-11-07 · **Tags**: context-engineering, automation, tooling, ai-agents, performance

**The Problem**: Manually splitting oversized specs with LLM text generation is painfully slow and error-prone. We need programmatic tools.

**The Solution**: Apply context engineering techniques (partitioning, compaction, compression, isolation) through automated analysis and transformation.

## Overview

### Critical Performance Issue

**Current Reality**:
- AI agents manually rewriting 1,166-line specs → 10+ minutes of slow LLM generation
- Text corruption during large multi-replace operations
- Context poisoning from accumulated editing errors
- Human time wasted babysitting AI spec splits

**Root Cause**: Relying on LLM text generation for what should be programmatic transformations.

**Impact**:
- ❌ Spec 045 (1,166 lines): ~15 min to split manually
- ❌ Context confusion from processing oversized specs
- ❌ Context clash when multiple edits accumulate
- ❌ Violation of our own Context Economy principle

### Context Engineering Foundation

Based on research from [Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [LangChain](https://blog.langchain.com/context-engineering-for-agents/), and [Drew Breunig](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html):

**Four Core Strategies**:
1. **Partitioning** - Split into sub-specs (what we do in spec 012)
2. **Compaction** - Remove redundancy, preserve signal
3. **Compression** - Summarize without losing intent
4. **Isolation** - Move unrelated concerns to separate specs

**Four Context Failure Modes** (what LeanSpec addresses):
1. **Context Poisoning** - Hallucinations accumulate in spec history
2. **Context Distraction** - Spec length overwhelms trained knowledge
3. **Context Confusion** - Superfluous content influences decisions
4. **Context Clash** - Conflicting information within same spec

### What We're Building

**Programmatic tools that operate on spec AST (Abstract Syntax Tree)**:
- ✅ Parse markdown structure without LLM
- ✅ Analyze complexity programmatically
- ✅ Transform/split/compact algorithmically
- ✅ Validate transformations automatically
- ⚡ Orders of magnitude faster than LLM text generation

**Human-in-the-Loop**:
- AI suggests strategy, programs execute transformation
- Human reviews and confirms changes
- Best of both: AI insight + programmatic speed

## The Vision

```bash
# Current (slow, manual, error-prone):
$ # AI manually rewrites 1,166 lines of spec text
$ # 10+ minutes of LLM generation, risk of corruption

# Future (fast, programmatic, reliable):
$ lspec analyze 045 --complexity
# Analyzing spec structure...
# ⚠ Spec exceeds 400 lines (1,166 lines)
# ⚠ Detected 5 distinct concerns: overview, design, rationale, implementation, testing
# 
# Recommended strategy: PARTITION into sub-specs
# Estimated split: 5 files, largest ~380 lines
# 
# Would you like to proceed? (Y/n)

$ lspec split 045 --auto-partition
# Analyzing markdown structure... ✓
# Identifying logical boundaries... ✓
# Creating sub-spec files... ✓
# Moving content programmatically... ✓ (0.3s, not 10 min!)
# Updating cross-references... ✓
# Validating result... ✓
# 
# Split complete:
#   README.md (203 lines) - Overview + decision
#   DESIGN.md (378 lines) - Detailed design
#   RATIONALE.md (146 lines) - Trade-offs
#   IMPLEMENTATION.md (144 lines) - Implementation plan
#   TESTING.md (182 lines) - Test strategy

$ lspec compact 018 --remove-redundancy
# Analyzing for redundancy... ✓
# Found 3 duplicate sections
# Found 5 sections inferable from others
# 
# Compaction preview:
#   Before: 591 lines
#   After: 420 lines (29% reduction)
#   Preserved: All decision-making content
#   Removed: Redundant examples, obvious explanations
# 
# Apply compaction? (Y/n)
```

## Sub-Specs

This spec is organized using sub-spec files (practicing what we preach):

- **[CONTEXT-ENGINEERING.md](./CONTEXT-ENGINEERING.md)** - Deep dive: 4 strategies, 4 failure modes, research synthesis
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design: AST parser, analysis engine, transformation engine
- **[COMMANDS.md](./COMMANDS.md)** - CLI interface: analyze, split, compact, compress, isolate
- **[ALGORITHMS.md](./ALGORITHMS.md)** - Core algorithms: boundary detection, concern extraction, reference updating
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Phased plan: parser → analyzer → transformers → commands
- **[TESTING.md](./TESTING.md)** - Test strategy: unit tests, integration tests, golden tests

**Note**: Several sub-specs currently exceed 400 lines (411-799 lines). This demonstrates the exact problem we're solving - comprehensive technical documentation naturally grows beyond working memory limits. The tools we're building will make it trivial to further split these sub-specs programmatically.

## Quick Reference

### Context Engineering Strategies

| Strategy | Purpose | When to Use | Tool |
|----------|---------|-------------|------|
| **Partition** | Split into sub-specs | Spec >400 lines, multiple concerns | `lspec split` |
| **Compact** | Remove redundancy | Verbose, repetitive content | `lspec compact` |
| **Compress** | Summarize sections | Historical context, completed phases | `lspec compress` |
| **Isolate** | Move to separate spec | Unrelated concern, different lifecycle | `lspec isolate` |

### Context Failure Detection

| Failure Mode | Symptom | Detection | Mitigation |
|--------------|---------|-----------|------------|
| **Poisoning** | AI references non-existent content | Validate references | Remove corrupted sections |
| **Distraction** | AI ignores training, repeats spec | Track spec length | Split at 400 lines |
| **Confusion** | AI uses irrelevant context | Identify superfluous sections | Compact/remove noise |
| **Clash** | AI contradicts itself | Detect conflicting statements | Resolve or isolate |

### Commands Preview

```bash
# Analyze spec complexity
lspec analyze <spec> --complexity
lspec analyze <spec> --redundancy
lspec analyze <spec> --conflicts

# Transform specs
lspec split <spec> --strategy=partition|concerns|phases
lspec compact <spec> --remove-redundancy
lspec compress <spec> --section="Completed Phases"
lspec isolate <spec> --section="API Design" --new-spec="api-design"

# Validate transformations
lspec validate <spec> --after-transform
lspec diff <spec> --before-after
```

## Status

**Current Phase**: 📋 Planning & Design

**Next Steps**:
1. Complete sub-spec documentation
2. Review with team
3. Begin implementation (Phase 1: Parser)

## Key Principles

### Why Programmatic > LLM for Transformations

**LLM Strengths** (keep using):
- Understanding intent
- Suggesting strategy
- Identifying concerns
- Reviewing results

**LLM Weaknesses** (replace with code):
- Rewriting large text blocks (slow!)
- Maintaining exact structure
- Updating cross-references
- Avoiding corruption

**Hybrid Approach**:
```
AI: "This spec should be partitioned into 5 sub-specs: [analysis]"
  ↓
Code: [parses markdown, identifies boundaries, moves sections]
  ↓
Human: "Looks good" or "Adjust this split"
  ↓
Code: [applies transformation in 0.3s, not 10 min]
```

### Context Engineering as First Principle

This builds on **Context Economy** (Principle #1 from spec 049):
- Specs must fit in working memory
- <300 lines ideal, >400 lines violation
- But splitting shouldn't require 10 minutes of LLM text generation

**Evolution**:
```
v0.1.0: Manual spec writing
v0.2.0: Detection + warnings (lspec validate)
v0.3.0: Programmatic transformation (this spec)
v0.4.0: Continuous context management (auto-compaction, etc.)
```

## Plan

### Phase 1: Foundation (v0.3.0-alpha) - 2 weeks
- [ ] Markdown AST parser (unified.js ecosystem)
- [ ] Spec structure analyzer
- [ ] Boundary detection algorithms
- [ ] Core data structures

### Phase 2: Analysis Tools (v0.3.0-beta) - 1 week
- [ ] `lspec analyze --complexity`
- [ ] `lspec analyze --redundancy`
- [ ] `lspec analyze --conflicts`
- [ ] Visual reports

### Phase 3: Transformation Engine (v0.3.0-rc) - 2 weeks
- [ ] Partition transformer (split into sub-specs)
- [ ] Compaction transformer (remove redundancy)
- [ ] Compression transformer (summarize sections)
- [ ] Isolation transformer (move to new spec)

### Phase 4: CLI Commands (v0.3.0) - 1 week
- [ ] `lspec split` with strategies
- [ ] `lspec compact` with preview
- [ ] `lspec compress` with options
- [ ] `lspec isolate` with validation

### Phase 5: Polish & Launch (v0.3.0) - 1 week
- [ ] Error handling & edge cases
- [ ] Performance optimization
- [ ] Documentation & examples
- [ ] Dogfooding on our own specs

**Total Timeline**: 7 weeks for v0.3.0

## Test

### Validation Criteria

**Performance**:
- [ ] Split 1,166-line spec in <1 second (vs 10+ minutes manual)
- [ ] Parse/analyze 100 specs in <2 seconds
- [ ] Zero text corruption (programmatic = deterministic)

**Correctness**:
- [ ] Preserves all content (no information loss)
- [ ] Maintains markdown validity
- [ ] Updates all cross-references correctly
- [ ] Frontmatter remains valid

**Usability**:
- [ ] Clear analysis reports
- [ ] Interactive preview before applying
- [ ] Undo/rollback capability
- [ ] Helpful error messages

### Test Approach

**Golden Tests**:
- Snapshot known-good transformations
- Regression testing against corpus
- Compare manual vs programmatic splits

**Dogfooding**:
- Use tools on our own oversized specs
- Validate against specs 045, 046, 048 splits
- Measure time savings vs manual approach

**Edge Cases**:
- Specs with complex nested structures
- Specs with many code blocks
- Specs with tables and diagrams
- Specs with cross-references

## Success Metrics

### Quantitative

**Speed**:
- 100x faster than LLM text generation
- <1s to split any spec <2000 lines
- <2s to analyze entire project

**Quality**:
- Zero corruption incidents
- 100% markdown validity preserved
- 100% frontmatter validity preserved
- 100% cross-references updated

### Qualitative

**Developer Experience**:
- "Splitting specs is now instant"
- "No more babysitting AI rewrites"
- "Confident transformations won't corrupt"
- "Can experiment with splits freely"

**Impact**:
- Enables proactive splitting at 300 lines
- Removes friction from Context Economy
- Makes LeanSpec principles easier to follow
- Dogfooding our own methodology effectively

## Notes

### Research Synthesis

The external references identified four key insights:

1. **Context is Finite** (Anthropic): Even 1M token windows experience "context rot"—attention degrades with length
2. **Four Strategies** (LangChain): Write, Select, Compress, Isolate for managing context
3. **Four Failure Modes** (Breunig): Poisoning, Distraction, Confusion, Clash
4. **Hybrid Approach**: AI for strategy, code for execution

### Why This Matters

**For LeanSpec**:
- ✅ Practices our own principles (Context Economy)
- ✅ Removes major pain point (slow manual splitting)
- ✅ Enables proactive management (split at 300, not 600)
- ✅ Makes AI agents more effective (faster, fewer errors)

**For Users**:
- ✅ Faster workflow (seconds vs minutes)
- ✅ Higher confidence (deterministic transforms)
- ✅ Better specs (easy to maintain context limits)
- ✅ Learning tool (see how specs should be structured)

### Alternatives Considered

**1. Pure AI Approach** (current, rejected):
- ❌ Too slow (10+ minutes per spec)
- ❌ Error-prone (context corruption)
- ❌ Not deterministic (varies by run)

**2. Manual Guidelines Only** (rejected):
- ❌ Relies on discipline
- ❌ Still slow when needed
- ❌ No automation assistance

**3. Hybrid Approach** (chosen):
- ✅ AI suggests, code executes
- ✅ Fast (programmatic) + smart (AI)
- ✅ Best of both worlds

### Open Questions

1. **AST Library**: unified.js (remark) vs custom parser?
   - Leaning toward unified.js (battle-tested, ecosystem)

2. **LLM Integration**: When to use AI vs pure code?
   - AI for: Suggesting concerns, reviewing results
   - Code for: Parsing, moving content, updating refs

3. **Preview UX**: How to show transformation preview?
   - Interactive diff view? Side-by-side? Git-style?

4. **Undo Mechanism**: Git commits? Custom snapshots?
   - Probably git-based (user is already in git)

## Related Specs

- **[048-spec-complexity-analysis](../048-spec-complexity-analysis/)** - Identified the problem
- **[049-leanspec-first-principles](../049-leanspec-first-principles/)** - Context Economy principle
- **[018-spec-validation](../018-spec-validation/)** - Validation framework
- **[012-sub-spec-files](../012-sub-spec-files/)** - Sub-spec pattern we're automating

---

**Remember**: Context engineering isn't about bigger windows—it's about smarter curation. Programmatic tools make curation fast and reliable.
