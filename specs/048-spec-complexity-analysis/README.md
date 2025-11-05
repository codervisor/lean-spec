---
status: complete
created: '2025-11-04'
tags:
  - philosophy
  - quality
  - lean-principle
  - meta
priority: critical
related:
  - 018-spec-validation
  - 012-sub-spec-files
  - 043-official-launch-02
created_at: '2025-11-04T00:00:00Z'
updated_at: '2025-11-05T05:03:54.952Z'
completed_at: '2025-11-05T05:03:54.952Z'
completed: '2025-11-05'
transitions:
  - status: complete
    at: '2025-11-05T05:03:54.952Z'
---

# When Specs Become Too Complex: A Self-Reflective Analysis

> **Status**: ✅ Complete · **Priority**: Critical · **Created**: 2025-11-04 · **Tags**: philosophy, quality, lean-principle, meta

**Project**: lean-spec  
**Team**: Core Development

## Overview

**The Irony**: We're building LeanSpec to solve "specs that are too complex for AI," yet our own specs are becoming exactly what we're trying to prevent.

**The Evidence**:
- Spec 018 (spec-validation): **591 lines**, 43 sections, 13 code blocks
- Spec 045 (unified-dashboard): **1,166 lines** (largest spec in project)
- Spec 043 (official-launch): **408 lines** with 3 distinct phases
- Average spec size trend: increasing over time
- Multiple instances of spec corruption from complex editing

**Core Philosophy Conflict**:
```markdown
# From our README:
"🤦 Context overload - 30-page documents blow up the AI's context window"
"🎯 Write only what matters - Clear intent AI can act on, not 50 pages of noise"
"Keep it minimal - If it doesn't add clarity, cut it"

# Reality:
- 591-line spec with duplicate sections, complex JSON configs, 8 implementation phases
- Specs getting corrupted from failed multi-replace operations
- AI agents struggling to maintain consistency across large spec edits
```

**The Question**: Are we practicing what we preach? Or are we falling into the same trap we're helping others avoid?

## Problem Analysis

### Symptoms of Over-Complexity

**1. Corruption Issues**
- Spec 018 just had major corruption: duplicate sections, malformed code blocks, incomplete JSON
- This is the 3rd+ time we've encountered spec corruption
- Root cause: Complex multi-edit operations on large files with interleaved code/text
- **The tool struggles with its own specs**

**2. Context Window Issues**
- 591 lines = ~15,000-20,000 tokens
- AI agents must load entire spec to make any edit
- Risk of missing context or creating inconsistencies
- Exactly the problem we're solving for users!

**3. Maintenance Burden**
- Updates require careful coordination across many sections
- Easy to update one part and miss related sections
- Testing section disconnected from implementation plan
- Design decisions buried in implementation details

**4. Cognitive Overload**
- Hard to get "at a glance" understanding
- Must scroll through multiple screenfuls to find specific info
- Mixed concerns: philosophy, design, implementation, testing, configuration, examples
- Violates "clarity over documentation" principle

### Root Causes

**Why are our specs growing?**

1. **Feature Complexity**: Some features genuinely are complex (spec 018 is comprehensive checking system)
2. **Over-Documentation**: Including every possible use case, edge case, example
3. **Mixed Concerns**: Design + implementation + testing + config + examples all in one file
4. **Lack of Structure**: No clear stopping point or guideline for "too much"
5. **Completeness Bias**: Feeling like we need to document everything upfront
6. **No Enforcement**: No tooling to detect when specs get too large

**Comparison to Our Philosophy**:

| Principle | What We Say | What We Do |
|-----------|-------------|------------|
| "Write only what matters" | ✅ | ❌ 591 lines with exhaustive examples |
| "If it doesn't add clarity, cut it" | ✅ | ❌ Keep adding sections for completeness |
| "Lightweight SDD" | ✅ | ❌ 1,166-line spec is heavyweight |
| "Clear enough for AI" | ✅ | ❌ AI corrupts our own specs |
| "Lean enough to maintain" | ✅ | ❌ Maintenance is becoming painful |

### What Makes a Spec "Too Complex"?

**Quantitative Signals**:
- **>400 lines**: High risk of becoming unwieldy
- **>600 lines**: Almost certainly too complex
- **>50 sections**: Too much to navigate mentally
- **>10 code blocks**: Mixing too much code with prose
- **Multiple corruption incidents**: Clear sign of tool limitations

**Qualitative Signals**:
- Multiple concerns mixed together (design + config + testing + examples)
- Can't summarize in 1-2 paragraphs what the spec is about
- Implementation plan has >6 phases
- Reading through it takes >10 minutes
- Updates frequently cause inconsistencies
- AI agents struggle to edit it reliably

**The Context Window Math**:
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

### The Paradox: We Already Solved This!

**We have the solution but aren't using it**:

**Spec 012: Sub-Spec Files** (Status: ✅ Complete, **never actually used**)

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

**We're experiencing the exact problem we're solving**:

1. ✅ We correctly identified: "30-page documents blow up AI's context window"
2. ✅ We built tooling: Sub-spec files (spec 012) to split large docs
3. ❌ We didn't use it: All our specs are still single large files
4. ❌ We're hitting the limit: Corruption, maintenance burden, cognitive overload

## Design

### Principle: Progressive Disclosure

**Start Lean, Split When Needed**

Not every spec needs multiple files. The structure should emerge from genuine need:

**Stage 1: Single File (Most Specs - <300 lines)**
- Use standard template
- Keep under ~300 lines
- If it fits comfortably, don't split

**Stage 2: Growing Complexity (Some Specs - 300-400 lines)**
- Approaching complexity threshold
- Multiple distinct concerns emerging
- Consider splitting, but don't force it

**Stage 3: Complex Feature (Few Specs - >400 lines)**
- Over 400 lines or multiple major concerns
- Use sub-spec files (spec 012)
- Split by concern, not arbitrarily

**Stage 4: Epic/Multi-Phase (Rare - >600 lines)**
- Multi-month initiative
- Consider whether it should be multiple specs instead
- Or use sub-specs with phase-based breakdown

### When to Split: The Decision Tree

```
Is the spec over 300 lines?
├─ No → Keep as single file ✅
└─ Yes → Does it have multiple distinct concerns?
    ├─ No → Consider refactoring to be more concise
    └─ Yes → Does each concern need deep detail?
        ├─ No → Keep as single file, but trim content
        └─ Yes → Split into sub-specs
            ├── README.md (overview + decision)
            ├── DESIGN.md (detailed design)
            ├── IMPLEMENTATION.md (plan)
            ├── TESTING.md (test strategy)
            └── {CONCERN}.md (specific concerns)
```

### Distinct Concerns (Worthy of Split)

**Worthy of separate file**:
- Detailed configuration (JSON schemas, examples >50 lines)
- Extensive test strategy (beyond simple checklist)
- Multi-phase implementation (>6 phases)
- Code examples and patterns (>50 lines of code)
- Architecture decisions (ADR-style documentation)
- Migration strategy (from old to new approach)
- API specifications (endpoints, schemas, validation)

**Not worthy of separate file**:
- Simple plan with 3-4 steps
- Basic testing checklist
- Short code snippets (<20 lines)
- Overview and design that fit together naturally

### Case Study: How to Split Spec 018

**Current state**: 591 lines, 43 sections, multiple concerns mixed

**Proposed split**:

```
specs/018-spec-validation/
├── README.md              # Overview, decision, summary (150 lines)
│   ├─ Overview: Problem statement, goals
│   ├─ Design: High-level approach (unified `check` command)
│   ├─ Decision: Why expand `check` vs new `validate`
│   └─ Links to sub-specs for details
│
├── VALIDATION-RULES.md   # What gets validated (150 lines)
│   ├─ Frontmatter rules
│   ├─ Structure rules
│   ├─ Content rules
│   ├─ Corruption detection rules
│   └─ Staleness rules
│
├── CLI-DESIGN.md         # Command interface (100 lines)
│   ├─ Command syntax
│   ├─ Flags and options
│   ├─ Output formats
│   └─ Backwards compatibility
│
├── CONFIGURATION.md      # Config with examples (100 lines)
│   ├─ Config schema
│   ├─ JSON examples
│   └─ Rule customization
│
├── IMPLEMENTATION.md     # 8-phase plan (150 lines)
│   ├─ Phase 1: Refactor
│   ├─ Phase 2: Frontmatter
│   ├─ Phase 3: Structure
│   └─ ... (all 8 phases)
│
└── TESTING.md            # Test strategy (80 lines)
    ├─ Test categories
    ├─ Test cases
    └─ Integration tests

Total: ~730 lines, but chunked for comprehension
Largest file: 150 lines (manageable)
README.md: Entry point, links to details
```

**Benefits**:
- Each file fits in <1 screen
- Can edit one concern without touching others
- Reduces corruption risk (smaller, focused edits)
- AI agents can load just what they need
- Easier to review and maintain
- Better separation of concerns

## Solution

### 1. Establish Clear Guidelines

**Line Count Thresholds**:
- **<300 lines**: ✅ Ideal, keep as single file
- **300-400 lines**: ⚠️ Warning zone, consider simplifying or splitting
- **>400 lines**: 🔴 Strong candidate for splitting
- **>600 lines**: 🔴 Almost certainly should be split

**Complexity Signals**:
- **>6 implementation phases**: Consider IMPLEMENTATION.md
- **>10 code blocks**: Consider EXAMPLES.md or CONFIGURATION.md
- **>40 sections**: Too much cognitive load
- **Multiple corruption incidents**: Technical debt signal

### 2. Add Detection to `lspec check`

Add `--complexity` analysis:

```bash
$ lspec check --complexity

Complexity Analysis:
  ⚠ 3 specs may be too complex:
  
    018-spec-validation (591 lines, 43 sections)
      → High complexity
      → Suggest: Split into sub-specs
      → Files: VALIDATION-RULES.md, CLI-DESIGN.md, IMPLEMENTATION.md, TESTING.md
  
    045-unified-dashboard (1,166 lines, 58 sections)
      → Very high complexity
      → Suggest: Consider if this should be multiple specs
      → Or split into: DESIGN.md, VELOCITY.md, DASHBOARD.md
  
    043-official-launch (408 lines, 3 phases)
      → Moderate complexity
      → Consider: Use PHASES.md for multi-phase breakdown

Recommendations:
  - Review specs over 400 lines
  - Use sub-spec files (spec 012) to split concerns
  - See: lspec view 012 for guidance
```

Include in default check (as warnings, not errors).

### 3. Update Documentation

**AGENTS.md additions**:
```markdown
## Spec Complexity Guidelines

### Single File vs Sub-Specs

**Keep as single file when**:
- Under 300 lines
- Can be read/understood in 5-10 minutes
- Single, focused concern
- Implementation plan <6 phases

**Consider splitting when**:
- Over 400 lines
- Multiple distinct concerns (design + config + testing + examples)
- AI tools corrupt the spec during edits
- Updates frequently cause inconsistencies
- Implementation has >6 phases

**How to split** (see spec 012):
- README.md: Overview, decision, high-level design
- DESIGN.md: Detailed design and architecture
- IMPLEMENTATION.md: Implementation plan with phases
- TESTING.md: Test strategy and cases
- CONFIGURATION.md: Config examples and schemas
- {CONCERN}.md: Other specific concerns (API, MIGRATION, etc.)

### Warning Signs

Your spec might be too complex if:
- ⚠️ It takes >10 minutes to read through
- ⚠️ You can't summarize it in 2 paragraphs
- ⚠️ Recent edits caused corruption
- ⚠️ You're scrolling endlessly to find information
- ⚠️ Implementation plan has >8 phases

**Action**: Split using sub-specs, don't just keep growing the file.
```

**Template updates**:
Add hints in templates:
```markdown
## Plan

<!-- Break down implementation into steps -->

<!-- 💡 TIP: If your plan has >6 phases or this spec approaches 
     400 lines, consider using sub-spec files:
     - IMPLEMENTATION.md for detailed implementation
     - See spec 012 for guidance on splitting -->
```

### 4. Refactor Problematic Specs

**Priority order**:
1. **Spec 018** (spec-validation): Split to demonstrate sub-specs
2. **Spec 045** (unified-dashboard): Review if it should be multiple specs
3. **Spec 043** (official-launch): Consider PHASES.md for phase breakdown

### 5. Build Tooling Support

**Future enhancements** (post-v0.2.0):

```bash
# Analyze spec complexity
lspec check --complexity

# Guided splitting
lspec split 018 --interactive
  → Analyzes structure
  → Suggests split strategy
  → Creates sub-spec files
  → Moves content appropriately

# View sub-specs
lspec view 018            # Shows README.md
lspec view 018 --all      # Lists all sub-specs
lspec view 018/DESIGN     # Views specific sub-spec

# Open in editor
lspec open 018            # Opens README.md
lspec open 018 --files    # Opens all sub-specs
```

## Plan

### Phase 1: Establish Guidelines (This Spec)
- [x] Analyze current state and identify problems
- [x] Define complexity thresholds (300/400/600 lines)
- [x] Create decision tree for when to split
- [x] Document in AGENTS.md
- [x] Update templates with splitting hints
- [ ] Share with team for feedback

**Status**: Complete (Phase 1 tasks finished)

### Phase 2: Add Basic Detection
- [ ] Add line count detection to `lspec check`
- [ ] Add `--complexity` flag for detailed analysis
- [ ] Count sections and code blocks
- [ ] Suggest splitting when >400 lines
- [ ] Include in comprehensive check as warnings

**Scope**: v0.3.0 (after launch)

### Phase 3: Refactor Spec 018
- [x] Create sub-spec files structure
- [x] Move validation rules to VALIDATION-RULES.md
- [x] Move CLI design to CLI-DESIGN.md
- [x] Move configuration to CONFIGURATION.md
- [x] Move implementation to IMPLEMENTATION.md
- [x] Move testing to TESTING.md
- [x] Update README.md as entry point with links
- [x] Verify all cross-references work
- [x] Test that AI can navigate split structure

**Scope**: Before v0.2.0 launch (demonstrates dogfooding)
**Status**: ✅ Complete - Spec 018 successfully split into focused sub-specs

### Phase 4: Review Other Large Specs
- [ ] Spec 045 (unified-dashboard): Should it be multiple specs?
- [ ] Spec 043 (official-launch): Consider PHASES.md
- [ ] Document decisions (split vs simplify vs accept)

**Scope**: v0.2.0 or v0.3.0

### Phase 5: Build Advanced Tooling
- [ ] `lspec split` command (guided splitting)
- [ ] `lspec view <spec> --all` (list sub-specs)
- [ ] `lspec view <spec>/SUBSPEC` (view specific sub-spec)
- [ ] `lspec open <spec> --files` (open all sub-specs)
- [ ] Update MCP server to expose sub-specs

**Scope**: v0.3.0+ (post-launch feature)

### Phase 6: Cultural Change
- [ ] Dogfood: Use sub-specs for new complex features
- [ ] Review process: Check complexity in new specs
- [ ] Retrospective: Did splitting help?
- [ ] Share learnings in blog post/docs

**Scope**: Ongoing

## Test

### Guideline Clarity
- [ ] Team understands when to split
- [ ] Decision tree is actionable
- [ ] Thresholds feel right (300/400/600)
- [ ] Examples are clear

### Complexity Detection
- [ ] Correctly identifies specs >400 lines
- [ ] Counts sections accurately
- [ ] Suggests appropriate splitting strategy
- [ ] Doesn't flag appropriately sized specs
- [ ] Works with different spec patterns

### Split Spec 018 Success
- [ ] All information preserved after split
- [ ] README.md is effective entry point
- [ ] Sub-specs are focused and clear
- [ ] Cross-references work correctly
- [ ] AI agents can navigate structure
- [ ] Easier to maintain than before
- [ ] No corruption in subsequent edits

### Dogfooding
- [ ] Next complex feature uses sub-specs proactively
- [ ] Team comfortable with workflow
- [ ] Corruption incidents decrease
- [ ] Maintenance becomes easier
- [ ] Can confidently say "we practice what we preach"

## Notes

### Why This Matters for v0.2.0 Launch

**Credibility**: 
- Can't preach "lightweight SDD" while shipping 1,166-line specs
- Users will notice the hypocrisy
- Dogfooding story is a selling point IF done well
- Shows we're reflective and improving

**Quality**:
- Splitting reduces corruption risk
- More maintainable specs
- Better example for users
- Prevents future over-engineering

**Best Practices**:
- Model good SDD for users
- Splitting guidance helps teams avoid our mistakes
- Demonstrates progressive complexity approach

### The Meta-Learning

**What this teaches us about LeanSpec**:

1. **Dogfooding is essential**: Must use our own tools to discover limitations
2. **Principles need enforcement**: "Keep it minimal" needs tooling, not just culture
3. **Progressive complexity works**: Start simple, add structure when pain felt
4. **Context windows matter**: Even for humans, 600-line specs are too much
5. **Corruption is a signal**: When the tool breaks, it's telling us something
6. **Built features must be used**: Sub-specs (012) was built but never used - waste!

### Open Questions

1. **Should complexity checking be default in v0.2.0?**
   - Pro: Prevents problem early, shows we care about quality
   - Con: Adds scope to already full launch
   - **Decision**: Add to v0.3.0, document guidelines in v0.2.0

2. **What's the right threshold?**
   - Current: 300 = warning, 400 = strong suggestion, 600 = problem
   - Should these be configurable?
   - **Decision**: Start with these, make configurable in v0.3.0

3. **Should we auto-split?**
   - Too opinionated for lean philosophy?
   - Or helpful for adoption?
   - **Decision**: Guided tool, not automatic

4. **When to split vs when to simplify?**
   - Sometimes the answer is "delete content," not "add files"
   - How to guide this decision?
   - **Decision**: Decision tree + human judgment

### Success Criteria

**We've solved this when**:
1. ✅ All specs under 400 lines (or deliberately split with sub-specs)
2. ✅ Zero spec corruption incidents for 30 days
3. ✅ Team consistently splits complex specs proactively
4. ✅ New contributors understand when/how to split
5. ✅ AI agents maintain specs without errors
6. ✅ Can confidently say "we practice what we preach"

### The Deeper Lesson

This isn't just about line counts. It's about:

**Resisting Complexity Creep**
- Every project trends toward complexity over time
- Need active resistance (tooling + culture)
- Regular reflection and refactoring required

**Living Your Principles**
- Easy to preach, hard to practice
- Dogfooding reveals gaps between values and reality
- Authenticity requires constant alignment

**Tool-Assisted Discipline**
- Human judgment alone insufficient
- Automation makes principles actionable
- "The tool should guide, not just enable"

**This spec is itself a test**: 
- Current length: ~480 lines
- Demonstrates the problem it describes
- Should it be split? 
  - Possibly: GUIDELINES.md + CASE-STUDY-018.md
  - But: As meta-analysis, keeping together has value
  - Decision: Keep together, but watch for further growth

**Reflection**: If this spec grows past 600 lines, we've proven our own point and must split it.
