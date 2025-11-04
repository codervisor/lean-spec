# The Five First Principles of LeanSpec

> Part of spec: [049-leanspec-first-principles](README.md)

These are the crystal stone rules—the fundamental, unchanging principles that define what LeanSpec is and guide all design decisions.

## The 5 First Principles

### 1. Context Economy
**Specs must fit in working memory—both human and AI.**

**Why This is Fundamental:**
- Physics: Context windows are bounded (200K tokens, ~20-30K effective)
- Biology: Human working memory is 7±2 items
- Economics: Large contexts cost more in time and money
- Psychology: Attention is the scarce resource, not storage

**Quantified Thresholds:**
- ✅ Target: <300 lines per spec file
- ⚠️ Warning: 300-400 lines (approaching limit)
- 🚨 Problem: >400 lines (must split)
- 🔴 Crisis: >600 lines (definitely split now)

**Operationalization:**
- Use sub-specs for complex features
- Split proactively, not reactively
- Automated checking: `lspec validate --max-lines 400`
- CI/CD gates for spec complexity

**How Everything Derives:**
- Sub-spec files (spec 012) → enables splitting
- Complexity warnings (spec 048) → enforces limits
- Flat folder structure → reduces navigation overhead
- Global sequence numbers → enables easy references

---

### 2. Signal-to-Noise Maximization
**Every word must inform decisions or be cut.**

**Why This is Fundamental:**
- Token costs penalize verbosity
- Cognitive load penalizes noise
- Maintenance costs penalize stale content
- Clarity enables action

**The Test:**
Each sentence must pass: **"What decision does this inform?"**

If the answer is "none," remove it.

**What to Cut:**
- Obvious statements ("software should work correctly")
- Inferable content (can be derived from context)
- "Maybe in the future" unless it affects today's design
- Exhaustive examples when 1-2 would suffice
- Duplicated information across sections

**What to Keep:**
- Decision rationale ("chose X over Y because...")
- Non-obvious constraints or requirements
- Success criteria and test conditions
- Clear problem statements
- Intent and goals

**Operationalization:**
- Review checklist: "Can I remove this without losing clarity?"
- Peer review focus on unnecessary content
- AI-assisted verbosity detection
- Regular pruning of specs

**How Everything Derives:**
- "Write only what matters" (README principle)
- "If it doesn't add clarity, cut it" (AGENTS.md)
- Skip specs for trivial changes
- Minimal vs. enterprise templates

---

### 3. Progressive Disclosure
**Start simple, add structure only when pain is felt.**

**Why This is Fundamental:**
- Teams evolve (solo → small → large)
- Requirements emerge through building
- Premature abstraction causes rigidity
- Conway's Law: Structure mirrors team communication

**The Evolution Path:**

**Day 1: Solo Developer**
```yaml
status: planned
created: 2025-11-01
```

**Week 2: Small Team**
```yaml
status: in-progress
created: 2025-11-01
tags: [api, feature]
priority: high
```

**Month 3: Enterprise Needs**
```yaml
status: in-progress
created: 2025-11-01
tags: [api, feature]
priority: high
assignee: alice
epic: PROJ-123
reviewer: bob
sprint: 2025-Q4-S3
```

**The Rule:**
Only add fields/structure when you actively feel pain without them.

**Pain Indicators:**
- Can't find relevant specs → Add tags
- Don't know what to work on next → Add priority/status
- Unclear ownership → Add assignee
- Team-specific needs → Add custom fields

**Anti-Pattern:**
Adding fields "just in case" or because "enterprise teams might need it."

**Operationalization:**
- Templates range from minimal to enterprise
- Custom fields support team-specific needs
- No required fields beyond essential metadata
- "Add complexity only when you feel the pain"

**How Everything Derives:**
- Flexible frontmatter system
- Custom fields
- Template options (minimal → enterprise)
- Adaptive structure (README example)

---

### 4. Intent Over Implementation
**Capture "why" and "what," let "how" emerge.**

**Why This is Fundamental:**
- AI needs intent to make good decisions
- Implementation details change frequently
- Unknown unknowns emerge during building
- Code shows "how," specs should show "why"

**The Hierarchy:**

**Must Have (Required):**
1. **Problem statement** - What are we solving?
2. **Solution intent** - What's the approach? (high-level)
3. **Success criteria** - How do we know it works?

**Should Have (Recommended):**
1. Design rationale - Why this approach?
2. Trade-offs considered - What alternatives did we reject?
3. Key constraints - What limits our options?

**Could Have (Optional):**
1. Implementation details - Specific steps
2. Code examples - Concrete illustrations
3. Edge cases - Detailed scenarios

**The Test:**
- If the spec captures **why** → good
- If the spec only captures **how** → questionable
- If the spec captures both **why** and **how** → ideal

**Living Documentation:**
- Intent stays relatively stable
- Implementation evolves as we learn
- Update specs when understanding changes
- Incomplete spec > outdated spec

**Operationalization:**
- Spec structure: Overview → Design → Plan → Test
- Overview section must answer "why?"
- Implementation can be sketchy initially
- Refine as understanding emerges

**How Everything Derives:**
- Standard spec sections (Overview, Design, Plan)
- Living documentation philosophy
- Specs evolve with code
- Focus on outcomes, not prescriptive steps

---

### 5. Bridge the Gap
**Specs exist to align human intent with machine execution.**

**Why This is Fundamental:**
- Humans think in goals and intent
- Machines execute in steps and logic
- Gap must be bridged explicitly
- Both audiences (human + AI) must understand

**The Two Audiences:**

**For Humans:**
- High-level overview
- Problem context
- Design rationale
- Success criteria

**For AI:**
- Unambiguous requirements
- Clear structure
- Concrete examples
- Testable conditions

**The Bridge:**
- Overview → provides human context
- Design → shows the approach
- Plan → gives machine-readable steps
- Test → defines objective success
- Examples → connect abstract to concrete

**Quality Check:**
Ask two questions:
1. **Can a human understand the intent?**
2. **Can an AI execute the plan?**

If either answer is "no," the spec needs work.

**Operationalization:**
- AI-native from day one (README promise)
- Works with Cursor, Copilot, Aider
- MCP server integration
- AGENTS.md for AI guidance
- Structured metadata for tooling
- Examples bridge abstraction gap

**How Everything Derives:**
- Structured frontmatter (machine-readable)
- Clear Overview section (human-readable)
- CLI tooling (enables automation)
- MCP server (AI integration)
- Templates balance both audiences

---

## Why These 5?

### Test 1: Never Change ✅
These principles are derived from immutable constraints:
- Physics: Context windows are bounded
- Biology: Human cognition has limits
- Economics: Time and tokens cost money
- Reality: Human-AI gap exists

These constraints won't change (or won't change significantly).

### Test 2: Everything Derives ✅
All LeanSpec practices trace back to these principles:
- Sub-spec files → Context Economy
- "Write only what matters" → Signal-to-Noise
- Flexible frontmatter → Progressive Disclosure
- Overview + Design sections → Intent Over Implementation
- AI-native design → Bridge the Gap

### Test 3: Resolve Conflicts ✅
When two practices conflict, apply principles in priority order:
1. Context Economy (physics can't be violated)
2. Signal-to-Noise (every word must earn its keep)
3. Intent Over Implementation (why before how)
4. Bridge the Gap (both audiences must understand)
5. Progressive Disclosure (add structure when needed)

### Test 4: Define Identity ✅
A specification is LeanSpec if and only if it:
- ✅ Fits in working memory (<400 lines per file)
- ✅ Contains only decision-informing content
- ✅ Captures intent and success criteria clearly
- ✅ Can be understood by both humans and AI
- ✅ Evolves as understanding grows

### Test 5: Operationalizable ✅
Each principle can be enforced with concrete mechanisms:
- Tooling: `lspec validate`, `lspec health`, `lspec split`
- Culture: Review checklists, team norms, examples
- Metrics: Track spec length, complexity, update frequency

---

## Conflict Resolution Framework

When two practices conflict, apply first principles in order:

### Priority Order

1. **Context Economy** - If it doesn't fit in working memory, split it
2. **Signal-to-Noise** - If it doesn't inform decisions, remove it  
3. **Intent Over Implementation** - Capture why, not just how
4. **Bridge the Gap** - Both human and AI must understand
5. **Progressive Disclosure** - Add structure when pain is felt

### Example Conflicts

**Conflict 1: "Should I document every edge case?"**
- Apply: Signal-to-Noise
- Question: "Does this edge case inform current decisions?"
- If yes: Document it
- If no: Skip it (can add later if needed)

**Conflict 2: "My spec is 450 lines. Should I split it?"**
- Apply: Context Economy
- Threshold: >400 lines → split
- Action: Use sub-specs or simplify

**Conflict 3: "Should I use custom fields?"**
- Apply: Progressive Disclosure
- Question: "Do you feel pain without them?"
- If no pain yet: Use standard fields
- If pain: Add custom fields

**Conflict 4: "Should spec include implementation details?"**
- Apply: Intent Over Implementation
- Question: "Does it capture why or just how?"
- If why: Include it
- If just how: Make it optional or omit

**Conflict 5: "Should we create sub-specs upfront for complex feature?"**
- Apply: Progressive Disclosure + Context Economy
- Question: "Do you feel the pain yet? Will it exceed 300 lines?"
- If not yet: Start with single file
- If yes (or >300 lines expected): Split proactively

---

## What Makes Something "LeanSpec"?

### Essential Characteristics

A specification is LeanSpec if it:

✅ **Fits in working memory** (<400 lines per file)  
✅ **Contains only decision-informing content** (high signal-to-noise)  
✅ **Captures intent and success criteria clearly** (why + what)  
✅ **Can be understood by both humans and AI** (bridges the gap)  
✅ **Evolves as understanding grows** (living documentation)

### What LeanSpec Is NOT

❌ A comprehensive documentation system  
❌ A blueprint that specifies every detail upfront  
❌ A fixed format that all specs must follow  
❌ A replacement for code comments or API docs  
❌ Optimized for humans alone (it's for human + AI)

### When to Use LeanSpec

**Use LeanSpec when:**
- Working with AI coding agents
- Features span multiple components
- Design decisions need alignment
- Context needs to persist across sessions
- You want lightweight structure that scales

**Skip LeanSpec when:**
- Trivial changes (just fix it)
- Self-explanatory refactors
- Pure API reference (use code comments + auto-gen)

---

## Related Documents

- [Main Spec](README.md) - Overview and complete findings
- [Analysis](ANALYSIS.md) - Deep dive into constraints and thought experiments
- [Operationalization](OPERATIONALIZATION.md) - How to enforce these principles
