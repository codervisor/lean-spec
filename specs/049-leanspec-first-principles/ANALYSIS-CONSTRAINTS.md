# LeanSpec First Principles - Deep Analysis

> Part of spec: [049-leanspec-first-principles](README.md)

This document contains the comprehensive analysis that led to the identification of LeanSpec's five first principles.

## Part 1: Hard Constraints Analysis

### 1. Physics of AI-Powered Development

**Unchangeable Technical Constraints:**

#### Context Window Limits (Hard Technical Constraint)
- Claude Sonnet: 200K tokens total, ~20-30K effective working memory
- GPT-4: 128K tokens total, ~8-16K effective working memory
- Context degradation: Quality degrades significantly beyond 50K tokens
- Multi-file projects: Context must be shared (specs + code + conversation)
- 600-line spec ≈ 15-20K tokens = entire working memory for ONE spec

**Implication:** Specs MUST be bounded in size. This is physics, not preference.

#### Token Economics (Economic Constraint)
- Cost per token: $0.003-0.015 per 1K tokens (varies by model)
- Large specs = repeated token costs on every interaction
- 1000-line spec read 10 times = 250K-500K tokens = $0.75-$7.50

**Implication:** Brevity has real economic value.

#### AI Reasoning Quality Degradation
- Lost in the middle: AI performs worse with information in middle of long contexts
- Recency bias: Recent context weighted more heavily than earlier context
- Attention diffusion: More context = less attention per item

**Implication:** Focused, structured content > exhaustive documentation.

#### Need for Unambiguous Instructions
- AI requires clear, specific guidance
- Vague principles → inconsistent implementation
- Ambiguity → hallucination or incorrect assumptions

**Implication:** Clarity is not optional—it's a functional requirement.

#### Async Nature of Human-AI Collaboration
- No real-time clarification loop
- Must anticipate questions in the spec
- Context must persist across sessions

**Implication:** Specs must be self-contained and anticipatory.

### 2. Human Cognitive Limits

**Unchangeable Human Constraints:**

#### Working Memory: 7±2 Items
- Can hold ~7 concepts simultaneously
- Beyond that, cognitive overload
- Deep nesting reduces effective capacity

**Implication:** Specs should have ≤7 major sections.

#### Reading Speed and Comprehension
- Average: 200-300 words/minute (English)
- Technical docs: 100-150 words/minute (slower)
- 600 lines ≈ 3000 words ≈ 20-30 minutes reading time
- Comprehension drops after 10 minutes without breaks

**Implication:** If spec takes >10 minutes to read, it's too long.

#### Fatigue from Context Switching
- Each switch has cognitive cost (~23 minutes to regain focus)
- Multiple files = multiple switches
- BUT: Well-organized splits reduce fatigue (progressive disclosure)

**Implication:** Organization matters more than file count.

#### Need for Progressive Disclosure
- Humans learn top-down (overview → details)
- Can't process all details upfront
- Need "executive summary" → "details on demand"

**Implication:** Specs should start broad, link to depth.

#### Pattern Recognition vs Detailed Analysis
- Humans excel at patterns, struggle with details
- Good structure creates recognizable patterns
- Consistency reduces cognitive load

**Implication:** Templates and conventions have cognitive value.

### 3. Evolution and Emergence Patterns

**How Software Projects Naturally Evolve:**

#### Complexity Increases Over Time (Entropy Law)
- Every project trends toward complexity
- Features accumulate, interactions multiply
- "Simple" designs become complex through accretion

**Implication:** Must actively resist complexity creep.

#### Documentation Decay (Second System Effect)
- Docs fall out of sync with code
- Updates to code >> updates to docs
- Longer docs = faster decay rate

**Implication:** Minimal docs are more maintainable.

#### Conway's Law (Organizational Constraint)
- System structure mirrors communication structure
- Team size affects optimal spec organization
- Solo dev ≠ 5-person team ≠ 50-person team

**Implication:** Structure must scale with team.

#### Emergence of New Requirements
- Unknown unknowns emerge during implementation
- Initial specs are always incomplete
- Over-specification wastes effort on wrong details

**Implication:** Specs should be living documents, not blueprints.

#### Network Effects of Dependencies
- Changes cascade through dependencies
- Coupling increases maintenance burden
- Tight coupling = brittle system

**Implication:** Loose coupling in specs → easier evolution.

### 4. Economic Constraints

**Business Realities:**

#### Time is Money
- Developer time is expensive ($50-200/hour)
- Spec-writing time has opportunity cost
- Reading time multiplied by team size

**Implication:** Every word must justify its cost.

#### Maintenance is More Expensive than Creation
- Maintenance = 60-80% of software lifecycle cost
- Complex specs = higher maintenance burden
- Outdated specs are worse than no specs

**Implication:** Optimize for maintainability, not initial completeness.

#### Coordination Costs Scale Quadratically
- N people = N(N-1)/2 communication paths
- Larger specs = more coordination needed
- More coordination = slower development

**Implication:** Smaller, focused specs reduce coordination overhead.

## Part 2: What MUST Be True Given These Constraints?

Given the above constraints, what principles are **forced** to be true?

### Forced Principle 1: Context Economy
**Specs must fit in working memory—both human and AI.**

- Can't violate context window limits (physics)
- Can't exceed human working memory (biology)
- Can't afford repeated large context loads (economics)

**Quantified:** 
- Target: <300 lines (fits in one screen, <10 min read, <10K tokens)
- Warning: 300-400 lines (borderline)
- Problem: >400 lines (requires splitting)
- Crisis: >600 lines (definitely split)

### Forced Principle 2: Signal-to-Noise Maximization
**Every word must carry weight; noise is expensive.**

- Token costs penalize verbosity
- Cognitive load penalizes noise
- Maintenance cost penalizes outdated content

**Quantified:**
- Every sentence should answer: "What decision does this inform?"
- Remove anything that doesn't change behavior
- If AI/human can infer it, don't state it

### Forced Principle 3: Progressive Complexity
**Start minimal, add structure only when pain is felt.**

- Early over-specification wastes effort (emergence)
- Premature abstraction causes rigidity
- Team needs evolve over time (Conway's Law)

**Quantified:**
- Solo dev: Just intent + plan
- Small team: Add status, tags, priority
- Scaling team: Add custom fields as needed
- Never require upfront what might be needed later

### Forced Principle 4: Living Documentation
**Specs evolve with understanding; they're not upfront contracts.**

- Requirements emerge during implementation
- Over-specification on unknowns is waste
- Sync between spec and reality is critical

**Quantified:**
- Update spec when understanding changes
- Incomplete spec > outdated spec
- Ship code and spec together

### Forced Principle 5: Intent Over Implementation
**Clear intent > exhaustive details.**

- AI needs "why" to make good decisions
- Humans need "what" to understand goals
- Details can be discovered/inferred/added later

**Quantified:**
- Must have: Problem, solution intent, success criteria
- Nice to have: Implementation details, examples, edge cases
- Don't include: Obvious things, inferable things, "maybe" futures

### Forced Principle 6: Structural Consistency
**Predictable patterns reduce cognitive load.**

- Pattern recognition is cheap for humans
- Consistent structure helps AI navigate
- Convention reduces decision fatigue

**Quantified:**
- Use templates for common patterns
- Standard naming (TESTING.md, API.md)
- Consistent frontmatter structure

### Forced Principle 7: Bridge the Gap
**Specs exist to align human intent with machine execution.**

- Humans think in goals and intent
- Machines execute in steps and logic
- Gap must be bridged explicitly
- Both audiences (human + AI) must understand

**Quantified:**
- Clear problem statement (human context)
- Unambiguous requirements (machine clarity)
- Examples bridge abstract to concrete
- Test criteria define success objectively

## Part 3: Comparison to Alternatives

### Traditional SDD (RFCs, ADRs, PRDs)

**Traditional Approach:**
- Comprehensive upfront documentation
- Fixed formats (RFC template, ADR template)
- Heavy review processes

