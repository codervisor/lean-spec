# Context Engineering: Strategies & Failure Modes

**Research synthesis from Anthropic, LangChain, and Drew Breunig**

## The Core Problem

### Context is Finite

Even with 1M+ token windows:
- **Attention degrades** with length (context rot)
- **N² complexity** in transformer attention
- **Training bias** toward shorter sequences
- **Cost scales** linearly with tokens

**Key Insight**: Bigger windows ≠ better results. Smart curation > raw capacity.

### The LeanSpec Connection

LeanSpec exists because:
1. **Context Economy** - Specs must fit in working memory (human + AI)
2. **Signal-to-Noise** - Every word must inform decisions
3. **Context failures** happen when we violate these principles

This spec addresses: **How to maintain Context Economy programmatically**

## Four Context Engineering Strategies

Based on [LangChain's synthesis](https://blog.langchain.com/context-engineering-for-agents/):

### 1. Partitioning (Write & Select)

**What**: Split content across multiple contexts with selective loading

**LeanSpec Application**:
```markdown
# Instead of one 1,166-line spec:
specs/045/README.md          (203 lines - overview)
specs/045/DESIGN.md          (378 lines - design)
specs/045/IMPLEMENTATION.md  (144 lines - plan)
specs/045/TESTING.md         (182 lines - tests)

# AI loads only what it needs for current task
```

**Mechanisms**:
- **Sub-spec files** (spec 012 pattern)
- **Lazy loading** (read files on demand)
- **Progressive disclosure** (overview → details)

**When to Use**:
- ✅ Spec >400 lines
- ✅ Multiple distinct concerns (design + testing + config)
- ✅ Different concerns accessed independently

**Benefits**:
- ✅ Each file <400 lines (fits in working memory)
- ✅ Reduce irrelevant context (only load needed sections)
- ✅ Parallel work (edit DESIGN without affecting TESTING)

### 2. Compaction (Remove Redundancy)

**What**: Eliminate duplicate or inferable content

**LeanSpec Application**:
```markdown
# Before compaction (verbose):
## Authentication
The authentication system uses JWT tokens. JWT tokens are 
industry-standard and provide stateless authentication. The 
benefit of JWT tokens is that they don't require server-side 
session storage...

## Implementation
We'll implement JWT authentication. JWT was chosen because...
[repeats same rationale]

# After compaction (concise):
## Authentication
Uses JWT tokens (stateless, no session storage).

## Implementation
[links to Authentication section for rationale]
```

**Mechanisms**:
- **Duplicate detection** (same content in multiple places)
- **Inference removal** (obvious from context)
- **Reference consolidation** (one canonical source, others link)

**When to Use**:
- ✅ Repeated explanations across sections
- ✅ Obvious/inferable information stated explicitly
- ✅ "For completeness" sections with little decision value

**Benefits**:
- ✅ Fewer tokens = faster processing
- ✅ Less distraction = better attention
- ✅ Easier maintenance = single source of truth

### 3. Compression (Summarize)

**What**: Condense while preserving essential information

**LeanSpec Application**:
```markdown
# Before compression:
## Phase 1: Infrastructure Setup
Set up project structure:
- Create src/ directory
- Create tests/ directory
- Configure TypeScript with tsconfig.json
- Set up ESLint with .eslintrc
- Configure Prettier with .prettierrc
- Add npm scripts for build, test, lint
- Set up CI pipeline with GitHub Actions
[50 lines of detailed steps...]

# After compression (completed phase):
## ✅ Phase 1: Infrastructure Setup (Completed 2025-10-15)
Project structure established with TypeScript, testing, and CI.
See git commit abc123 for implementation details.
```

**Mechanisms**:
- **Historical summarization** (completed work → summary)
- **Phase rollup** (detailed steps → outcomes)
- **Selective detail** (keep decisions, summarize execution)

**When to Use**:
- ✅ Completed phases (outcomes matter, details don't)
- ✅ Historical context (need to know it happened, not how)
- ✅ Approaching line limits (preserve signal, reduce noise)

**Benefits**:
- ✅ Maintain project history without bloat
- ✅ Focus on active work, not past details
- ✅ Easy to expand if details needed later

### 4. Isolation (Move to Separate Context)

**What**: Split unrelated concerns into separate specs

**LeanSpec Application**:
```markdown
# Before isolation (one spec):
specs/045-unified-dashboard/README.md
  - Dashboard implementation
  - Velocity tracking algorithm
  - Health scoring system
  - Chart library evaluation
  - API design for metrics endpoint
  [1,166 lines covering 5 distinct concerns]

# After isolation (multiple specs):
specs/045-unified-dashboard/       # Dashboard UI
specs/060-velocity-algorithm/      # Velocity tracking
specs/061-health-scoring/          # Health metrics
specs/062-metrics-api/             # API endpoint
  [Each spec <400 lines, independent lifecycle]
```

**Mechanisms**:
- **Concern extraction** (identify unrelated topics)
- **Dependency analysis** (what must stay together?)
- **Spec creation** (move to new spec with cross-references)

**When to Use**:
- ✅ Multiple concerns with different lifecycles
- ✅ Sections could be standalone features
- ✅ Parts updated by different people/teams
- ✅ Spec still >400 lines after partitioning

**Benefits**:
- ✅ Independent evolution (velocity algorithm changes ≠ dashboard changes)
- ✅ Clear ownership (different concerns, different owners)
- ✅ Easier review (focused scope per spec)

## Four Context Failure Modes

Based on [Drew Breunig's research](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html):

### 1. Context Poisoning

**Definition**: Hallucinated or erroneous content makes it into context and gets repeatedly referenced

**Symptoms in LeanSpec**:
```markdown
# AI hallucinates during edit:
"The authentication module uses Redis for session storage"
  (Reality: We use JWT tokens, not Redis sessions)

# Hallucination gets saved to spec

# Later, AI reads the spec and builds on the hallucination:
"Redis configuration should use cluster mode for HA"
  (Building on the original error)

# Context is now poisoned - wrong info compounds
```

**Detection**:
- ✅ Validate references against codebase
- ✅ Check for internal contradictions
- ✅ Flag content not matching implementation

**Mitigation**:
- ✅ Programmatic validation (catch before save)
- ✅ Regular spec-code sync checks
- ✅ Remove corrupted sections immediately

### 2. Context Distraction

**Definition**: Context grows so large the model ignores training and repeats history

**Symptoms in LeanSpec**:
```markdown
# Spec grows to 800+ lines with extensive history

# AI behavior changes:
- Repeats past actions from spec history
- Ignores training knowledge
- Suggests outdated approaches documented in spec
- Fails to synthesize new solutions

# Example: Gemini Pokemon agent
At >100k tokens: Repeated past moves instead of new strategy
  (even though training knows better strategies)
```

**Detection**:
- ✅ Monitor spec line count (>400 = warning)
- ✅ Track AI repetitive behavior
- ✅ Measure task completion degradation

**Mitigation**:
- ✅ Split at 400 lines (Context Economy)
- ✅ Compress historical sections
- ✅ Partition by concern

**Research**: Databricks found degradation starts ~32k tokens for Llama 3.1 405b, earlier for smaller models

### 3. Context Confusion

**Definition**: Superfluous content influences model to make wrong decisions

**Symptoms in LeanSpec**:
```markdown
# Spec includes MCP tool definitions for 20 integrations
# (GitHub, Jira, Slack, Linear, Notion, Asana, ...)

# Task: "Update the GitHub issue status"

# AI behavior:
- Confused about which tool to use
- Sometimes calls wrong tool (Jira instead of GitHub)
- Slower processing (evaluating irrelevant options)
- Lower accuracy

# Berkeley Function-Calling Leaderboard confirms:
ALL models perform worse with >1 tool
```

**Detection**:
- ✅ Identify sections irrelevant to current task
- ✅ Track tool/reference usage patterns
- ✅ Measure decision accuracy vs context size

**Mitigation**:
- ✅ Remove irrelevant sections before AI processing
- ✅ Use selective loading (only relevant sub-specs)
- ✅ Clear separation of concerns

### 4. Context Clash

**Definition**: Conflicting information within same context

**Symptoms in LeanSpec**:
```markdown
# Early in spec:
"We'll use PostgreSQL for data storage"

# Middle of spec (after discussion):
"Actually, MongoDB is better for this use case"

# Later in spec (forgot to update):
"PostgreSQL schema design: ..."

# AI sees conflicting info:
- Both PostgreSQL AND MongoDB mentioned
- Unclear which is current decision
- May mix approaches (SQL queries against MongoDB)
```

**Detection**:
- ✅ Scan for contradictory statements
- ✅ Check for outdated decisions not marked as superseded
- ✅ Validate consistency across sections

**Mitigation**:
- ✅ Single source of truth per decision
- ✅ Mark superseded decisions clearly
- ✅ Use compaction to remove outdated info

**Research**: Microsoft/Salesforce paper showed 39% performance drop when information gathered across multiple turns (early wrong answers remain in context)

## Strategy Selection Framework

### Decision Matrix

| Situation | Primary Strategy | Secondary | Why |
|-----------|-----------------|-----------|-----|
| Spec >400 lines, multiple concerns | Partition | Compaction | Separate concerns, remove redundancy in each |
| Spec verbose but single concern | Compaction | Compression | Remove redundancy, summarize if still too long |
| Historical phases bloating spec | Compression | - | Keep outcomes, drop details |
| Unrelated concerns in same spec | Isolation | Partition | Move to separate spec, then partition if needed |
| Spec approaching 400 lines | Compaction | - | Proactive cleanup before hitting limit |

### Combining Strategies

Often multiple strategies apply:

**Example: Spec 045 (1,166 lines)**:
1. **Partition**: Split into README + DESIGN + IMPLEMENTATION + TESTING (primary)
2. **Compaction**: Remove redundancy within each file (secondary)
3. **Compression**: Summarize research phase (already complete)
4. **Isolation**: Consider moving velocity algorithm to separate spec (future)

**Result**: 
- Before: 1,166 lines (3x limit)
- After: Largest file 378 lines (within limit)

## Implementation Priorities

### High Priority (v0.3.0)
- ✅ Partition (most common need)
- ✅ Compaction (easy wins)
- ✅ Failure detection (prevent problems)

### Medium Priority (v0.4.0)
- ✅ Compression (useful but more nuanced)
- ✅ Isolation (requires deeper analysis)

### Low Priority (v0.5.0)
- ✅ Automatic strategy selection
- ✅ Continuous monitoring/auto-compaction
- ✅ AI-powered conflict resolution

## Measuring Success

### Quantitative Metrics

**Partition effectiveness**:
- Spec count with >400 lines: Target 0
- Average spec size: Target <250 lines
- Largest sub-spec file: Target <400 lines

**Compaction effectiveness**:
- Redundancy ratio: Lines removed / lines total
- Target: 20-30% reduction for verbose specs

**Failure prevention**:
- Context poisoning incidents: Target 0/month
- Context distraction reports: Target 0/month
- Context confusion: AI wrong tool selection <1%
- Context clash: Contradictions detected before commit

### Qualitative Measures

**Developer experience**:
- "Splitting specs is now instant"
- "No more AI corruption during edits"
- "Specs stay clean automatically"

**AI agent effectiveness**:
- Fewer errors on large specs
- Faster task completion
- Better decision quality

## Related Research

### Key Papers & Articles

1. **Anthropic**: [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
   - Context as finite resource
   - Compaction, structured note-taking, sub-agents
   - Claude Code auto-compact at 95% window

2. **LangChain**: [Context Engineering for Agents](https://blog.langchain.com/context-engineering-for-agents/)
   - Four strategies: Write, Select, Compress, Isolate
   - LangGraph state management patterns
   - Tool selection via RAG

3. **Drew Breunig**: [How Contexts Fail and How to Fix Them](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html)
   - Four failure modes with evidence
   - Berkeley Function-Calling Leaderboard insights
   - Microsoft/Salesforce sharded prompts research

### Application to LeanSpec

**Core insight**: LeanSpec is a context engineering methodology for human-AI collaboration on software specs.

**Evolution**:
- v0.1.0: Manual context management (write good specs)
- v0.2.0: Detection (validate specs, warn at limits)
- v0.3.0: Programmatic transformation (this spec)
- v0.4.0: Continuous management (auto-optimization)

---

**Remember**: Context engineering is the #1 job when building with AI. These aren't just optimization techniques—they're fundamental to making AI-assisted spec management work.
