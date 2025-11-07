# CLI Commands

**User interface for programmatic spec management**

## Command Overview

```bash
# Analysis
lspec analyze <spec> [options]

# Transformations  
lspec split <spec> [options]
lspec compact <spec> [options]
lspec compress <spec> [options]
lspec isolate <spec> [options]

# Utilities
lspec diff <spec> --before-after
lspec preview <spec> --transformation=<type>
lspec rollback <spec>
```

## `lspec analyze` - Analyze Spec Complexity

### Purpose
Analyze spec structure and provide recommendations without making changes.

### Usage
```bash
lspec analyze <spec> [options]

Options:
  --complexity      Show complexity metrics
  --redundancy      Detect redundant content
  --conflicts       Find contradictions
  --all            Run all analyses (default)
  --json           Output as JSON
  --verbose        Show detailed breakdown
```

### Examples

**Basic analysis**:
```bash
$ lspec analyze 045

📊 Analyzing spec 045-unified-dashboard...

Complexity Metrics:
  Lines: 1,166 (CRITICAL - 3x limit)
  Sections: 58
  Max nesting: 4 levels
  Code blocks: 23
  References: 47
  Complexity score: 87/100 (High)

Concerns Detected (5):
  1. Overview & Decision (150 lines)
  2. Design & Architecture (378 lines)
  3. Rationale & Trade-offs (146 lines)
  4. Implementation Plan (144 lines)
  5. Testing Strategy (182 lines)

Recommendations:
  ✅ PRIMARY: Partition into sub-specs (Context Economy)
     Impact: 1,166 → 5 files, largest ~380 lines
     Confidence: 95%
  
  ⚡ SECONDARY: Compact redundant sections
     Impact: Save ~120 lines across concerns
     Confidence: 78%

Would you like to see transformation preview? (Y/n)
```

**Complexity focus**:
```bash
$ lspec analyze 045 --complexity

Complexity Breakdown:
  Total lines: 1,166
  ├─ Frontmatter: 15
  ├─ Overview: 150
  ├─ Design: 378
  ├─ Implementation: 288
  ├─ Testing: 200
  └─ Notes: 135

Nesting depth: 4 levels
  H1 (1) → H2 (8) → H3 (23) → H4 (12)

Code blocks: 23
  ├─ TypeScript: 15
  ├─ Bash: 5
  └─ Markdown: 3

Thresholds:
  ✗ Exceeds 400 lines (by 766 lines, 291%)
  ✗ Approaching 600 lines (exceeds by 566)
  ! Complexity score: 87/100 (High complexity)

Suggested actions:
  1. Split into sub-specs immediately
  2. Review each section for compaction
  3. Consider if any concerns should be separate specs
```

**Redundancy focus**:
```bash
$ lspec analyze 045 --redundancy

Redundancy Analysis:

Duplicate Content (3 instances):
  1. "Dashboard layout using CSS Grid" (lines 145, 289)
     → Save 8 lines by consolidating
  
  2. "Velocity calculation algorithm" (lines 201-215, 423-437)
     → Save 14 lines by linking to canonical version
  
  3. "Chart.js vs D3.js comparison" (lines 178-192, 456-470)
     → Save 14 lines by referencing once

Similar Content (5 groups):
  1. Component prop descriptions (4 instances, ~40 lines)
     → Could use table format (save ~25 lines)
  
  2. Test case examples (3 instances, ~30 lines)
     → Move to TESTING.md, link from overview

Consolidation Opportunities:
  - Move all "Rationale" subsections to RATIONALE.md
  - Use reference links for repeated concepts
  - Create glossary for common terms

Total potential savings: ~120 lines (10%)
```

**Conflict detection**:
```bash
$ lspec analyze 045 --conflicts

Conflict Analysis:

Contradictions (2):
  1. MEDIUM: Tech stack inconsistency
     Line 89: "Using React with TypeScript"
     Line 456: "Vanilla JavaScript for charts"
     → Clarify: React for UI, vanilla JS for chart library
  
  2. LOW: Date format inconsistency
     Line 123: "ISO 8601 format (YYYY-MM-DD)"
     Line 234: "Example: 11/07/2025"
     → Standardize examples to match stated format

Outdated Decisions (1):
  1. Line 178: "Will evaluate Chart.js vs D3.js"
     Line 289: "Using Chart.js (decision made)"
     → Mark evaluation section as completed

Inconsistencies (1):
  1. Section "## Design" vs "## Detailed Design"
     Both sections cover architecture
     → Consolidate or clarify distinction

Recommendations:
  - Resolve contradictions before splitting
  - Mark superseded decisions clearly
  - Use consistent terminology throughout
```

### Output Formats

**JSON output** (for programmatic use):
```bash
$ lspec analyze 045 --json

{
  "spec": "045-unified-dashboard",
  "complexity": {
    "lineCount": 1166,
    "exceedsLimit": true,
    "score": 87,
    "thresholds": {
      "ideal": 300,
      "warning": 400,
      "error": 400,
      "current": 1166
    }
  },
  "concerns": [
    {
      "id": "overview",
      "name": "Overview & Decision",
      "lineCount": 150,
      "sections": ["Overview", "Background", "Decision"]
    },
    // ...
  ],
  "recommendations": [
    {
      "strategy": "partition",
      "rationale": "Spec exceeds 400 lines with 5 distinct concerns",
      "confidence": 0.95,
      "estimatedImpact": {
        "filesCreated": 5,
        "largestFile": 378,
        "linesSaved": 0
      }
    },
    {
      "strategy": "compact",
      "rationale": "Redundant content detected",
      "confidence": 0.78,
      "estimatedImpact": {
        "linesSaved": 120
      }
    }
  ]
}
```

## `lspec split` - Partition into Sub-Specs

### Purpose
Split oversized spec into focused sub-spec files.

### Usage
```bash
lspec split <spec> [options]

Options:
  --strategy=<type>        Splitting strategy (default: auto)
                          auto | concerns | phases | custom
  --preview               Show preview without applying
  --dry-run               Simulate without writing files
  --force                 Skip confirmations
  --no-compaction         Don't compact during split
```

### Strategies

**auto (default)**: AI-suggested strategy based on analysis
**concerns**: Split by logical concerns (design, testing, etc.)
**phases**: Split by implementation phases
**custom**: Interactive selection of sections

### Examples

**Auto split** (recommended):
```bash
$ lspec split 045

🔍 Analyzing spec structure...
✓ Detected 5 concerns
✓ Generated split plan

Split Preview:
  045-unified-dashboard/
  ├── README.md (203 lines)
  │   └── Overview, decision, quick reference
  ├── DESIGN.md (378 lines)
  │   └── Architecture, components, data flow
  ├── RATIONALE.md (146 lines)
  │   └── Trade-offs, alternatives, decisions
  ├── IMPLEMENTATION.md (144 lines)
  │   └── Phased plan with milestones
  └── TESTING.md (182 lines)
      └── Test strategy, cases, criteria

Changes:
  ✓ 5 files created
  ✓ 47 cross-references updated
  ✓ All files under 400 lines
  ✓ No content lost

Apply this split? (Y/n) █
```

**Preview mode**:
```bash
$ lspec split 045 --preview

Split Plan:

README.md (203 lines):
  # Unified Dashboard
  
  > **Status**: 📅 Planned · **Priority**: Critical
  
  ## Overview
  [150 lines of overview content...]
  
  ## Sub-Specs
  - [DESIGN.md](./DESIGN.md) - Architecture details
  - [RATIONALE.md](./RATIONALE.md) - Design decisions
  - [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Phased plan
  - [TESTING.md](./TESTING.md) - Test strategy

DESIGN.md (378 lines):
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
$ lspec split 043 --strategy=phases

Phase-based split for multi-phase spec:

043-official-launch-02/
├── README.md (180 lines)
│   └── Overview, vision, success criteria
├── PHASE-1-FOUNDATION.md (142 lines)
│   └── First principles, guidelines
├── PHASE-2-OPERATIONALIZATION.md (158 lines)
│   └── Validation, tooling, dogfooding
└── PHASE-3-LAUNCH.md (125 lines)
    └── Marketing, docs, announcement

Apply? (Y/n)
```

**Custom/interactive split**:
```bash
$ lspec split 045 --strategy=custom

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
- ✓ All files under 400 lines
- ✓ No broken cross-references
- ✓ Valid markdown syntax
- ✓ Valid frontmatter in README.md
- ✓ Sub-spec links in README.md
- ✓ Git-trackable (files committed together)

## `lspec compact` - Remove Redundancy

### Purpose
Remove duplicate and redundant content while preserving decisions.

### Usage
```bash
lspec compact <spec> [options]

Options:
  --preview              Show changes before applying
  --aggressive           More aggressive compaction
  --preserve=<sections>  Don't compact these sections
  --threshold=<percent>  Similarity threshold (0-100, default: 85)
```

### Examples

**Basic compaction**:
```bash
$ lspec compact 018

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
$ lspec compact 018 --aggressive

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

## `lspec compress` - Summarize Sections

### Purpose
Compress completed phases or verbose sections into summaries.

### Usage
```bash
lspec compress <spec> [options]

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
$ lspec compress 043 --phases

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
$ lspec compress 045 --section="Research Notes"

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
$ lspec compress 018 --history --ai

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

## `lspec isolate` - Extract to New Spec

### Purpose
Move unrelated concern to separate spec.

### Usage
```bash
lspec isolate <spec> [options]

Options:
  --section=<name>       Section to isolate
  --new-spec=<name>      Name for new spec
  --interactive          Interactive section selection
  --keep-reference       Add cross-reference in original
```

### Examples

**Isolate section**:
```bash
$ lspec isolate 045 --section="Velocity Algorithm" --new-spec=velocity-algorithm

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
$ lspec isolate 045 --interactive

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

### `lspec diff` - Show Transformation Diff

```bash
$ lspec diff 045 --before-after

Comparing before/after split:

Before:
  045-unified-dashboard/README.md (1,166 lines)

After:
  045-unified-dashboard/
  ├── README.md (203 lines, -963)
  ├── DESIGN.md (378 lines, +378)
  ├── RATIONALE.md (146 lines, +146)
  ├── IMPLEMENTATION.md (144 lines, +144)
  └── TESTING.md (182 lines, +182)

Total line count: 1,053 lines (-113 from compaction)

Detailed diff:
[Git-style diff showing moved/modified content]
```

### `lspec preview` - Preview Transformation

```bash
$ lspec preview 045 --transformation=partition

Transformation: Partition into sub-specs

[Shows same preview as `lspec split --preview`]
```

### `lspec rollback` - Undo Transformation

```bash
$ lspec rollback 045

Available rollback points:
  1. Split into sub-specs (2 hours ago)
  2. Compact README.md (5 hours ago)
  3. Compress Phase 1 (2 days ago)

Select rollback point: 1

⚠️  This will:
  - Delete 4 sub-spec files
  - Restore original README.md
  - Update git history

Continue? (Y/n)

Rolling back...
✓ Files restored
✓ Git commit created: "Rollback: Split into sub-specs"

Spec 045 rolled back to pre-split state.
```

## Global Options

Available for all commands:

```bash
--verbose, -v      Show detailed output
--quiet, -q        Minimal output
--json             JSON output (for programmatic use)
--dry-run          Simulate without making changes
--force            Skip confirmations
--help, -h         Show command help
```

## Exit Codes

```
0   Success
1   General error
2   Invalid arguments
3   Validation failed
4   User cancelled
5   File operation failed
10  Analysis failed
20  Transformation failed
30  Rollback failed
```

## Examples: Complete Workflows

### Workflow 1: Split Oversized Spec

```bash
# 1. Analyze first
$ lspec analyze 045
# Shows: 1,166 lines, 5 concerns, recommend partition

# 2. Preview split
$ lspec split 045 --preview
# Review the plan

# 3. Apply split
$ lspec split 045
# Creates 5 files, validates

# 4. Verify
$ lspec validate 045
# All files pass validation
```

### Workflow 2: Compact Verbose Spec

```bash
# 1. Check redundancy
$ lspec analyze 018 --redundancy
# Shows: 73 lines of redundancy

# 2. Preview compaction
$ lspec compact 018 --preview
# Review changes

# 3. Apply compaction
$ lspec compact 018
# Removes redundancy

# 4. Still too large? Split
$ lspec analyze 018
# Now 518 lines, still >400

$ lspec split 018
# Split into sub-specs
```

### Workflow 3: Clean Up Completed Spec

```bash
# Spec with many completed phases

# 1. Compress completed phases
$ lspec compress 043 --phases
# Reduces completed phases to summaries

# 2. Check if compaction needed
$ lspec analyze 043 --redundancy
# Some redundancy in active phases

# 3. Compact active content
$ lspec compact 043 --preserve="Phase 3"
# Don't compact active phase

# 4. Final validation
$ lspec validate 043
# All good!
```

---

**Design Philosophy**: Interactive by default, scriptable when needed. Always preview before applying, always validate after.
