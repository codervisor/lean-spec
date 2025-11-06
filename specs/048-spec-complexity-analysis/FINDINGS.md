# Problem Analysis: Spec Complexity

> Part of spec: [048-spec-complexity-analysis](README.md)

## Symptoms of Over-Complexity

### 1. Corruption Issues
- Spec 018 had major corruption: duplicate sections, malformed code blocks, incomplete JSON
- This is the 3rd+ time we've encountered spec corruption
- Root cause: Complex multi-edit operations on large files with interleaved code/text
- **The tool struggles with its own specs**

### 2. Context Window Issues
- 591 lines = ~15,000-20,000 tokens
- AI agents must load entire spec to make any edit
- Risk of missing context or creating inconsistencies
- Exactly the problem we're solving for users!

### 3. Maintenance Burden
- Updates require careful coordination across many sections
- Easy to update one part and miss related sections
- Testing section disconnected from implementation plan
- Design decisions buried in implementation details

### 4. Cognitive Overload
- Hard to get "at a glance" understanding
- Must scroll through multiple screenfuls to find specific info
- Mixed concerns: philosophy, design, implementation, testing, configuration, examples
- Violates "clarity over documentation" principle

## Root Causes

### Why are our specs growing?

1. **Feature Complexity**: Some features genuinely are complex (spec 018 is comprehensive checking system)
2. **Over-Documentation**: Including every possible use case, edge case, example
3. **Mixed Concerns**: Design + implementation + testing + config + examples all in one file
4. **Lack of Structure**: No clear stopping point or guideline for "too much"
5. **Completeness Bias**: Feeling like we need to document everything upfront
6. **No Enforcement**: No tooling to detect when specs get too large

### Comparison to Our Philosophy

| Principle | What We Say | What We Do |
|-----------|-------------|------------|
| "Write only what matters" | ✅ | ❌ 591 lines with exhaustive examples |
| "If it doesn't add clarity, cut it" | ✅ | ❌ Keep adding sections for completeness |
| "Lightweight SDD" | ✅ | ❌ 1,166-line spec is heavyweight |
| "Clear enough for AI" | ✅ | ❌ AI corrupts our own specs |
| "Lean enough to maintain" | ✅ | ❌ Maintenance is becoming painful |

## What Makes a Spec "Too Complex"?

### Quantitative Signals
- **>400 lines**: High risk of becoming unwieldy
- **>600 lines**: Almost certainly too complex
- **>50 sections**: Too much to navigate mentally
- **>10 code blocks**: Mixing too much code with prose
- **Multiple corruption incidents**: Clear sign of tool limitations

### Qualitative Signals
- Multiple concerns mixed together (design + config + testing + examples)
- Can't summarize in 1-2 paragraphs what the spec is about
- Implementation plan has >6 phases
- Reading through it takes >10 minutes
- Updates frequently cause inconsistencies
- AI agents struggle to edit it reliably

### The Context Window Math

```
Average spec size:
- Spec 018: 591 lines ≈ 15,000 tokens
- Spec 045: 1,166 lines ≈ 30,000 tokens
- Spec 043: 408 lines ≈ 10,000 tokens

Claude Sonnet context: 200K tokens
  - But loses quality after ~50K tokens of active context
  - Working memory effectively ~20K-30K tokens

Spec 045 = 30K tokens = entire working memory for ONE spec
  - No room for code context, other specs, codebase understanding
```

## The Paradox: We Already Solved This!

**We have the solution but aren't using it**:

### Spec 012: Sub-Spec Files (Status: ✅ Complete, **never actually used**)

We built this exact feature:
```
specs/048-spec-complexity-analysis/
├── README.md           # Main spec (overview, decision)
├── DESIGN.md          # Detailed design
├── IMPLEMENTATION.md  # Implementation plan
├── TESTING.md         # Test strategy
└── EXAMPLES.md        # Code examples and configs
```

Why didn't we use it?
- Forgot it exists?
- Doesn't feel necessary until it's too late?
- No tooling reminder when specs get large?
- Cultural inertia toward single-file specs?
- **Not dogfooding our own solution**

### We're experiencing the exact problem we're solving

1. ✅ We correctly identified: "30-page documents blow up AI's context window"
2. ✅ We built tooling: Sub-spec files (spec 012) to split large docs
3. ❌ We didn't use it: All our specs are still single large files
4. ❌ We're hitting the limit: Corruption, maintenance burden, cognitive overload
