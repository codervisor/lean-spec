# CLI Commands

**Mechanical transformation tools for AI agent orchestration**

## Design Philosophy

These commands are designed for **AI agent orchestration**:
- AI agents read specs and detect issues
- AI agents decide transformation strategies
- AI agents call tools with explicit parameters
- Tools execute transformations mechanically (no LLM calls)

**Key Principles**:
1. **Tools are executors, not deciders** - AI agents provide intelligence
2. **Deterministic operations** - Same input = same output, always
3. **Structured I/O** - JSON output for AI agent consumption
4. **No semantic analysis** - Just parse, transform, validate
5. **Fast and reliable** - Milliseconds, not minutes

## Command Overview

```bash
# Analysis (returns structured data)
lean-spec analyze <spec> [options]

# Transformations (execute AI agent decisions)
lean-spec split <spec> [options]
lean-spec compact <spec> [options]  
lean-spec compress <spec> [options]
lean-spec isolate <spec> [options]

# Utilities
lean-spec diff <spec> --before-after
lean-spec preview <spec> --transformation=<type>
lean-spec rollback <spec>
```

## `lean-spec analyze` - Analyze Spec Complexity

### Purpose
Parse spec structure and return metrics for AI agent decision-making. No semantic analysis, just structural facts.

### Usage
```bash
lean-spec analyze <spec> [options]

Options:
  --json           Output as JSON (default for AI agents)
  --concerns       Detect logical groupings by section structure
  --verbose        Include detailed breakdown
```

### Output Format

**JSON (primary format for AI agents)**:
```json
{
  "spec": "045-unified-dashboard",
  "path": "specs/045-unified-dashboard/README.md",
  "metrics": {
    "tokens": 4800,
    "lines": 1166,
    "characters": 19200,
    "sections": {
      "h1": 1,
      "h2": 8,
      "h3": 23,
      "h4": 12,
      "total": 44
    },
    "codeBlocks": 23,
    "maxNesting": 4
  },
  "threshold": {
    "status": "warning",
    "limit": 3500,
    "message": "Exceeds 3,500 token warning threshold"
  },
  "structure": [
    {
      "section": "Overview",
      "level": 2,
      "lineRange": [1, 150],
      "tokens": 600,
      "subsections": ["Background", "Decision"]
    },
    {
      "section": "Design",
      "level": 2,
      "lineRange": [151, 528],
      "tokens": 1512,
      "subsections": ["Architecture", "Components", "Data Flow"]
    }
  ],
  "recommendation": {
    "action": "split",
    "reason": "Exceeds 3,500 token threshold with multiple distinct concerns",
    "confidence": "high"
  }
}
```

### Human-Readable Format

**For human review** (optional `--verbose` flag):
```bash
$ lean-spec analyze 045 --verbose

📊 Spec Analysis: 045-unified-dashboard

Token Count: 4,800 tokens (⚠️  WARNING)
  • Threshold: 3,500 tokens
  • Status: Exceeds warning, approaching 5,000 error threshold

Structure:
  Lines: 1,166
  Sections: 44 (H1:1, H2:8, H3:23, H4:12)
  Code blocks: 23
  Max nesting: 4 levels

Top Sections by Size:
  1. Design (1,512 tokens / 378 lines, 32%)
  2. Testing (728 tokens / 182 lines, 15%)
  3. Overview (600 tokens / 150 lines, 13%)

Recommendation: Split into sub-specs
  → Multiple distinct concerns detected
  → Would reduce to 5 files under 2,000 tokens each
```

### AI Agent Usage Pattern

```typescript
// AI agent workflow
const analysis = await exec('lean-spec analyze 045 --json');
const data = JSON.parse(analysis);

if (data.threshold.status === 'warning' && data.recommendation.action === 'split') {
  // AI decides split strategy based on structure
  const outputs = data.structure
    .filter(s => s.level === 2)
    .map(s => `${s.section}.md:${s.lineRange[0]}-${s.lineRange[1]}`);
  
  // AI calls tool with explicit parameters
  await exec(`lean-spec split 045 ${outputs.map(o => `--output=${o}`).join(' ')}`);
}
```

## `lean-spec split` - Partition Spec into Files

### Purpose
Mechanically split spec into multiple files based on explicit line ranges. AI agent decides what goes where.

### Usage
```bash
lean-spec split <spec> [options]

Options:
  --output=<file>:<lines>   Output file with line range (required, repeatable)
  --update-refs            Update cross-references automatically
  --dry-run                Show what would be created
  --force                  Overwrite existing files
```

### Examples

**AI agent orchestrated split**:
```bash
# AI agent analyzed spec and decided on split points
$ lean-spec split 045 \
  --output=README.md:1-150 \
  --output=DESIGN.md:151-528 \
  --output=TESTING.md:529-710 \
  --update-refs

✓ Created specs/045-unified-dashboard/README.md (812 tokens / 150 lines)
✓ Created specs/045-unified-dashboard/DESIGN.md (1,512 tokens / 378 lines)
✓ Created specs/045-unified-dashboard/TESTING.md (728 tokens / 182 lines)
✓ Updated 47 cross-references
✓ Validated all files

Split complete: 3 files, 3,052 tokens total
```

**Dry run preview**:
```bash
$ lean-spec split 045 --output=README.md:1-150 --dry-run

Would create:
  specs/045-unified-dashboard/README.md
    Lines: 1-150 (150 lines)
    Estimated tokens: 812
    Sections: Overview, Background, Decision

No files modified (dry run)
```

**Conflict detection**:
```bash
**AI agent orchestrated split**:
```bash
# AI agent analyzed spec and decided on split points
$ lean-spec split 045 \
  --output=README.md:1-150 \
  --output=DESIGN.md:151-528 \
  --output=TESTING.md:529-710 \
  --update-refs

✓ Created specs/045-unified-dashboard/README.md (812 tokens / 150 lines)
✓ Created specs/045-unified-dashboard/DESIGN.md (1,512 tokens / 378 lines)
✓ Created specs/045-unified-dashboard/TESTING.md (728 tokens / 182 lines)
✓ Updated 47 cross-references
✓ Validated all files

Split complete: 3 files, 3,052 tokens total
```

**Dry run preview**:
```bash
$ lean-spec split 045 --output=README.md:1-150 --dry-run

Would create:
  specs/045-unified-dashboard/README.md
    Lines: 1-150 (150 lines)
    Estimated tokens: 812
    Sections: Overview, Background, Decision

No files modified (dry run)
```

### Tool Behavior

**What it does**:
1. Parses spec structure (frontmatter, sections, line ranges)
2. Extracts specified line ranges to new files
3. Copies frontmatter to README.md only
4. Updates internal cross-references if `--update-refs`
5. Validates all created files

**What it doesn't do**:
- ❌ No semantic analysis of content
- ❌ No decisions about what should go where
- ❌ No content rewriting or summarization
- ✅ Just mechanical extraction and file creation

## `lean-spec compact` - Remove Specified Content

### Purpose
Mechanically remove specified line ranges. AI agent identifies redundancy, tool executes removal.

### Usage
```bash
lean-spec compact <spec> [options]

Options:
  --remove=<lines>         Line range to remove (required, repeatable)
  --dry-run               Show what would be removed
  --force                 Skip confirmation
```

### Examples

**AI agent orchestrated compaction**:
```bash
# AI agent detected redundancy at specific lines
$ lean-spec compact 045 \
  --remove=145-153 \
  --remove=234-256 \
  --remove=401-415

✓ Removed lines 145-153 (9 lines, ~36 tokens)
✓ Removed lines 234-256 (23 lines, ~92 tokens)
✓ Removed lines 401-415 (15 lines, ~60 tokens)
✓ Updated line references

Compaction complete: Removed 47 lines, saved ~188 tokens
```

**Dry run**:
```bash
$ lean-spec compact 045 --remove=145-153 --dry-run

Would remove:
  Lines 145-153 (9 lines):
    "Dashboard layout using CSS Grid..."
    [duplicate of content at lines 289-297]
  
  Estimated savings: ~36 tokens

No files modified (dry run)
```

### Tool Behavior

**What it does**:
1. Removes specified line ranges
2. Updates internal line number references
3. Validates markdown structure after removal
4. Reports token/line savings

**What it doesn't do**:
- ❌ No detection of redundancy
- ❌ No semantic understanding of what's safe to remove
- ✅ Just mechanical deletion of specified lines

## `lean-spec compress` - Replace Content with Summary

### Purpose
Replace specified content with AI-provided summary. AI agent generates summary, tool executes replacement.

### Usage
```bash
lean-spec compress <spec> [options]

Options:
  --replace=<lines>:<text>  Replace line range with text (required)
  --dry-run                Show preview
```

### Examples

**AI agent orchestrated compression**:
```bash
# AI agent read completed phase, generated summary
$ lean-spec compress 043 \
  --replace='142-284:## ✅ Phase 1: Foundation (Completed 2025-11-05)

Established first principles through comprehensive analysis.
See: specs/049-leanspec-first-principles/'

✓ Replaced lines 142-284 (143 lines) with 4 lines
✓ Saved ~572 tokens

Compression complete: 143 → 4 lines
```

### Tool Behavior

**What it does**:
1. Replaces specified line range with provided text
2. Validates markdown structure
3. Reports compression ratio

**What it doesn't do**:
- ❌ No summarization of content
- ❌ No decision about what to keep/remove
- ✅ Just mechanical text replacement

## `lean-spec isolate` - Move Content to New Spec

### Purpose
Move specified content to a new spec file. AI agent decides what to isolate, tool executes move.

### Usage
```bash
lean-spec isolate <source-spec> [options]

Options:
  --lines=<range>          Lines to move (required)
  --to=<new-spec>         New spec name (required)
  --add-reference         Add cross-reference in source
```

### Examples

**AI agent orchestrated isolation**:
```bash
# AI agent determined section is independent concern
$ lean-spec isolate 045 \
  --lines=401-542 \
  --to=060-velocity-algorithm \
  --add-reference

✓ Created specs/060-velocity-algorithm/README.md (142 lines, ~568 tokens)
✓ Removed lines 401-542 from spec 045
✓ Added reference: "See [spec 060](../060-velocity-algorithm/)"
✓ Updated frontmatter (related fields)

Isolation complete: New spec 060 created
```

### Tool Behavior

**What it does**:
1. Creates new spec directory and README.md
2. Moves specified lines to new spec
3. Removes lines from source spec
4. Updates cross-references if requested
5. Initializes frontmatter for new spec

**What it doesn't do**:
- ❌ No decision about what constitutes a separate concern
- ❌ No analysis of dependencies
- ✅ Just mechanical file operations

**auto (default)**: AI-suggested strategy based on analysis
**concerns**: Split by logical concerns (design, testing, etc.)
**phases**: Split by implementation phases
**custom**: Interactive selection of sections

### Examples

**Auto split** (recommended):
```bash
$ lean-spec split 045

🔍 Analyzing spec structure...
✓ Detected 5 concerns
✓ Generated split plan

Split Preview:
  045-unified-dashboard/
  ├── README.md (812 tokens / 203 lines)
  │   └── Overview, decision, quick reference
  ├── DESIGN.md (1,512 tokens / 378 lines)
  │   └── Architecture, components, data flow
  ├── RATIONALE.md (584 tokens / 146 lines)
  │   └── Trade-offs, alternatives, decisions
  ├── IMPLEMENTATION.md (576 tokens / 144 lines)
  │   └── Phased plan with milestones
  └── TESTING.md (728 tokens / 182 lines)
      └── Test strategy, cases, criteria

Changes:
  ✓ 5 files created (4,212 tokens total, ~588 tokens saved via compaction)
  ✓ 47 cross-references updated
  ✓ All files under 2,000 token optimal threshold
  ✓ No content lost

Apply this split? (Y/n) █
```

**Preview mode**:
```bash
$ lean-spec split 045 --preview

Split Plan:

README.md (812 tokens / 203 lines):
  # Unified Dashboard
  
  > **Status**: 📅 Planned · **Priority**: Critical
  
  ## Overview
  [600 tokens / 150 lines of overview content...]
  
  ## Sub-Specs
  - [DESIGN.md](./DESIGN.md) - Architecture details
  - [RATIONALE.md](./RATIONALE.md) - Design decisions
  - [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Phased plan
  - [TESTING.md](./TESTING.md) - Test strategy

DESIGN.md (1,512 tokens / 378 lines):
  # Design & Architecture
  
  Detailed design for unified dashboard...
  
  ## Component Structure
  [architecture content...]

[continue for other files...]

Preview only - no files created.
Run without --preview to apply.
```

**Split by phases**:
```bash
$ lean-spec split 043 --strategy=phases

Phase-based split for multi-phase spec:

043-official-launch-02/
├── README.md (720 tokens / 180 lines)
│   └── Overview, vision, success criteria
├── PHASE-1-FOUNDATION.md (568 tokens / 142 lines)
│   └── First principles, guidelines
├── PHASE-2-OPERATIONALIZATION.md (632 tokens / 158 lines)
│   └── Validation, tooling, dogfooding
└── PHASE-3-LAUNCH.md (500 tokens / 125 lines)
    └── Marketing, docs, announcement

Apply? (Y/n)
```

**Custom/interactive split**:
```bash
$ lean-spec split 045 --strategy=custom

Interactive Split Wizard:

Current sections (select to group):
  [x] 1. Overview
  [x] 2. Background  
  [x] 3. Decision
  [ ] 4. Design
  [ ] 5. Architecture
  [ ] 6. Components
  ...

Create file: README.md ✓
Selected sections: 1, 2, 3

Continue with next file? (Y/n) y

Select sections for next file:
  [ ] 4. Design
  [ ] 5. Architecture
  [ ] 6. Components
  ...
```

### Post-Split Validation

After splitting, automatically validates:
- ✓ All files under 3,500 tokens
- ✓ No broken cross-references
- ✓ Valid markdown syntax
- ✓ Valid frontmatter in README.md
- ✓ Sub-spec links in README.md
- ✓ Git-trackable (files committed together)

## `lean-spec compact` - Remove Redundancy

### Purpose
Remove duplicate and redundant content while preserving decisions.

### Usage
```bash
lean-spec compact <spec> [options]

Options:
  --preview              Show changes before applying
  --aggressive           More aggressive compaction
  --preserve=<sections>  Don't compact these sections
  --threshold=<percent>  Similarity threshold (0-100, default: 85)
```

### Examples

**Basic compaction**:
```bash
$ lean-spec compact 018

🔍 Analyzing redundancy...
✓ Found 3 duplicate sections
✓ Found 5 consolidation opportunities

Compaction Preview:

Duplicates to remove:
  1. "Validation rules" (lines 145-158)
     → Consolidate with lines 278-291
     Savings: 13 lines
  
  2. "Config schema example" (lines 234-256)
     → Already shown in lines 89-111
     Savings: 22 lines

Consolidations:
  3. Repeated prop descriptions (4 instances)
     → Convert to reference table
     Savings: 38 lines

Before: 591 lines
After:  518 lines
Savings: 73 lines (12%)

Apply compaction? (Y/n)
```

**Aggressive mode**:
```bash
$ lean-spec compact 018 --aggressive

🔍 Aggressive compaction analysis...

Additional opportunities:
  - Remove obvious inferences (e.g., "ESLint lints code")
  - Shorten verbose explanations
  - Convert examples to references
  - Merge similar subsections

Before: 591 lines
After:  445 lines (conservative) or 389 lines (aggressive)

Choose mode:
  1. Conservative (keep more context)
  2. Aggressive (maximum reduction)
  3. Custom (you choose each)

Selection: █
```

## `lean-spec compress` - Summarize Sections

### Purpose
Compress completed phases or verbose sections into summaries.

### Usage
```bash
lean-spec compress <spec> [options]

Options:
  --section=<name>       Section to compress
  --phases               Compress completed phases
  --history              Compress historical sections
  --ai                   Use AI for summarization
  --preserve-decisions   Keep decision rationale (default: true)
```

### Examples

**Compress completed phases**:
```bash
$ lean-spec compress 043 --phases

🔍 Identifying completed phases...
✓ Found 2 completed phases

Compression Preview:

Phase 1: Foundation (COMPLETE - 2025-11-05)
  Before (142 lines):
    ## Phase 1: Foundation
    
    Establish first principles...
    
    ### Task 1.1: Conduct Analysis
    - Research context engineering
    - Identify constraints
    - [138 lines of detailed steps...]
  
  After (8 lines):
    ## ✅ Phase 1: Foundation (Completed 2025-11-05)
    
    Established first principles through comprehensive analysis
    of constraints, comparisons, and thought experiments.
    
    Deliverables: specs/049-leanspec-first-principles/
    Key decisions: [link to FIRST-PRINCIPLES.md]

Phase 2: Operationalization (COMPLETE - 2025-11-06)
  Before (158 lines):
    ## Phase 2: Operationalization
    [detailed implementation steps...]
  
  After (10 lines):
    ## ✅ Phase 2: Operationalization (Completed 2025-11-06)
    
    Implemented validation tools and dogfooded on our own specs.
    Split specs 018, 045, 048 using sub-spec pattern.
    
    Result: All specs now under 400 lines or properly split.

Total savings: 282 lines (69% reduction for completed phases)

Apply compression? (Y/n)
```

**Compress specific section**:
```bash
$ lean-spec compress 045 --section="Research Notes"

Section: Research Notes (85 lines)
Status: Supporting information, not critical to decisions

Compression options:
  1. Summarize to 10-15 lines
  2. Move to separate file (RESEARCH.md)
  3. Link to external doc and remove
  4. Keep as-is

Selection: 1

Preview:
  Before (85 lines): [full research notes]
  After (12 lines): Key findings and links to sources

Apply? (Y/n)
```

**AI-powered compression**:
```bash
$ lean-spec compress 018 --history --ai

🤖 Using AI to summarize historical sections...

Found 3 historical sections:
  1. "Initial Implementation Notes" (45 lines)
  2. "Migration Path" (38 lines) 
  3. "Archived Approaches" (52 lines)

AI Summary Preview:

## Implementation History

Initial implementation focused on...
[AI-generated summary preserving key decisions]

Total: 15 lines (from 135 lines, 89% reduction)

Preserved:
  ✓ Key decisions and rationale
  ✓ Links to commits/PRs
  ✓ Lessons learned

Lost:
  ✗ Step-by-step details (available in git history)
  ✗ Intermediate explorations
  ✗ Debugging notes

Apply? (Y/n)
```

## `lean-spec isolate` - Extract to New Spec

### Purpose
Move unrelated concern to separate spec.

### Usage
```bash
lean-spec isolate <spec> [options]

Options:
  --section=<name>       Section to isolate
  --new-spec=<name>      Name for new spec
  --interactive          Interactive section selection
  --keep-reference       Add cross-reference in original
```

### Examples

**Isolate section**:
```bash
$ lean-spec isolate 045 --section="Velocity Algorithm" --new-spec=velocity-algorithm

🔍 Analyzing section "Velocity Algorithm"...
✓ Can be isolated (minimal dependencies)

Isolation Plan:

Create new spec:
  060-velocity-algorithm/README.md (142 lines)
    - Extract "Velocity Algorithm" section
    - Add context from parent spec
    - Update frontmatter (tags, related)

Update original spec:
  045-unified-dashboard/README.md
    - Remove "Velocity Algorithm" section (-142 lines)
    - Add reference: "See [spec 060](../060-velocity-algorithm/)"
    - Update line count: 1,166 → 1,024 lines

Cross-references:
  ✓ Update 3 internal links
  ✓ Add bidirectional relationship (related field)

Apply isolation? (Y/n)
```

**Interactive mode**:
```bash
$ lean-spec isolate 045 --interactive

Select sections to isolate:
  [ ] 1. Overview
  [ ] 2. Background
  [ ] 3. Design
  [x] 4. Velocity Algorithm
  [ ] 5. Health Scoring
  [x] 6. Chart Library Evaluation
  [ ] 7. Implementation
  [ ] 8. Testing

Selected: Velocity Algorithm, Chart Library Evaluation

These sections can be isolated together (related concerns).

Create new spec:
  1. Single spec for both sections
  2. Two separate specs

Selection: 2 █

New spec names:
  1. 060-velocity-algorithm
  2. 061-chart-library-eval

Proceed? (Y/n)
```

## Utility Commands

### `lean-spec diff` - Show Transformation Diff

```bash
$ lean-spec diff 045 --before-after

Comparing before/after split:

Before:
  045-unified-dashboard/README.md (4,800 tokens / 1,166 lines)

After:
  045-unified-dashboard/
  ├── README.md (812 tokens / 203 lines)
  ├── DESIGN.md (1,512 tokens / 378 lines)
  └── TESTING.md (728 tokens / 182 lines)

Total: 3,052 tokens / 763 lines
Savings: 1,748 tokens / 403 lines (via compaction)
```

### `lean-spec preview` - Preview Transformation

```bash
$ lean-spec preview 045 \
  --split=README.md:1-150,DESIGN.md:151-528

Preview:
  Would create 2 files from spec 045
  README.md: 812 tokens / 150 lines
  DESIGN.md: 1,512 tokens / 378 lines

Use --apply to execute transformation
```

### `lean-spec rollback` - Undo Transformation

```bash
$ lean-spec rollback 045

Found git history:
  1. Split into sub-specs (2 hours ago) - commit abc123
  2. Compact README.md (5 hours ago) - commit def456

Select rollback point: 1

✓ Git reset to commit xyz789
✓ Spec 045 restored to pre-split state
```

## AI Agent Usage Patterns

### Pattern 1: Detect and Split Oversized Spec

```typescript
// AI agent detects large spec during review
const analysis = await exec('lean-spec analyze 045 --json');
const data = JSON.parse(analysis);

if (data.metrics.tokens > 3500) {
  // AI analyzes structure and decides split points
  const h2Sections = data.structure.filter(s => s.level === 2);
  
  // Group related sections
  const groups = [
    { file: 'README.md', sections: h2Sections.slice(0, 2) },
    { file: 'DESIGN.md', sections: h2Sections.slice(2, 5) },
    { file: 'TESTING.md', sections: h2Sections.slice(5) }
  ];
  
  // Build command
  const outputs = groups.map(g => {
    const start = g.sections[0].lineRange[0];
    const end = g.sections[g.sections.length - 1].lineRange[1];
    return `--output=${g.file}:${start}-${end}`;
  });
  
  // Execute split
  await exec(`lean-spec split 045 ${outputs.join(' ')} --update-refs`);
  
  // Verify
  const newTokens = await exec('lean-spec tokens 045/*');
  // Confirm all files under 2,000 tokens
}
```

### Pattern 2: Detect and Remove Redundancy

```typescript
// AI agent reads spec and detects duplicate content
const content = await readFile('specs/045-unified-dashboard/README.md');
const lines = content.split('\n');

// AI identifies duplicate sections by semantic similarity
const duplicates = [
  { original: [145, 153], duplicate: [289, 297] },
  { original: [201, 215], duplicate: [423, 437] }
];

// Remove duplicates (keep original, remove duplicate)
const removes = duplicates
  .map(d => `--remove=${d.duplicate[0]}-${d.duplicate[1]}`)
  .join(' ');

await exec(`lean-spec compact 045 ${removes}`);
```

### Pattern 3: Compress Completed Phases

```typescript
// AI agent detects completed phase in implementation spec
const content = await readFile('specs/043-official-launch-02/README.md');
const analysis = await exec('lean-spec analyze 043 --json');

// AI reads phase 1 section (lines 142-284)
const phase1Content = lines.slice(141, 284).join('\n');

// AI generates summary
const summary = `## ✅ Phase 1: Foundation (Completed 2025-11-05)

Established first principles through comprehensive analysis.
Key deliverable: specs/049-leanspec-first-principles/`;

// Execute compression
await exec(`lean-spec compress 043 --replace='142-284:${summary}'`);
```

### Pattern 4: Isolate Independent Concern

```typescript
// AI agent identifies section that should be separate spec
const analysis = await exec('lean-spec analyze 045 --json');

// AI finds "Velocity Algorithm" section is self-contained
const velocitySection = analysis.structure.find(
  s => s.section === 'Velocity Algorithm'
);

// Check dependencies (AI reads content and determines it's independent)
const hasExternalDeps = false; // AI determined this

if (!hasExternalDeps) {
  // Execute isolation
  await exec(`lean-spec isolate 045 \
    --lines=${velocitySection.lineRange.join('-')} \
    --to=060-velocity-algorithm \
    --add-reference`);
}
```

### Pattern 5: Full Transformation Pipeline

```typescript
// AI agent performs complete spec optimization
async function optimizeSpec(specId: string) {
  // 1. Analyze
  const analysis = JSON.parse(
    await exec(`lean-spec analyze ${specId} --json`)
  );
  
  // 2. Decide strategy based on metrics
  if (analysis.metrics.tokens > 5000) {
    // Critical: Must split immediately
    await splitSpec(specId, analysis);
  } else if (analysis.metrics.tokens > 3500) {
    // Try compaction first, then split if still too large
    await compactSpec(specId, analysis);
    
    const recheck = JSON.parse(
      await exec(`lean-spec analyze ${specId} --json`)
    );
    
    if (recheck.metrics.tokens > 3500) {
      await splitSpec(specId, recheck);
    }
  }
  
  // 3. Verify all files are healthy
  const finalCheck = await exec(`lean-spec validate ${specId}`);
  return finalCheck;
}
```

## Global Options

Available for all commands:

```bash
--json             JSON output (default for AI agents)
--dry-run          Simulate without making changes
--force            Skip confirmations (use with caution)
--verbose, -v      Show detailed output (for human review)
--quiet, -q        Minimal output
--help, -h         Show command help
```

## Exit Codes

```
0   Success
1   General error
2   Invalid arguments
3   Validation failed
4   File operation failed
```

---

**Key Takeaway**: These tools are building blocks for AI agents. The agent provides the intelligence (what to split, where to split, what to remove), tools provide reliable execution.
