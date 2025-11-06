# Guidelines: When to Split Specs

> Part of spec: [048-spec-complexity-analysis](README.md)

## Line Count Thresholds

- **<300 lines**: ✅ Ideal, keep as single file
- **300-400 lines**: ⚠️ Warning zone, consider simplifying or splitting
- **>400 lines**: 🔴 Strong candidate for splitting
- **>600 lines**: 🔴 Almost certainly should be split

## Complexity Signals

- **>6 implementation phases**: Consider IMPLEMENTATION.md
- **>10 code blocks**: Consider EXAMPLES.md or CONFIGURATION.md
- **>40 sections**: Too much cognitive load
- **Multiple corruption incidents**: Technical debt signal

## Decision Tree: When to Split

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

## Distinct Concerns (Worthy of Split)

### Worthy of separate file:
- Detailed configuration (JSON schemas, examples >50 lines)
- Extensive test strategy (beyond simple checklist)
- Multi-phase implementation (>6 phases)
- Code examples and patterns (>50 lines of code)
- Architecture decisions (ADR-style documentation)
- Migration strategy (from old to new approach)
- API specifications (endpoints, schemas, validation)

### Not worthy of separate file:
- Simple plan with 3-4 steps
- Basic testing checklist
- Short code snippets (<20 lines)
- Overview and design that fit together naturally

## Progressive Disclosure Stages

### Stage 1: Single File (Most Specs - <300 lines)
- Use standard template
- Keep under ~300 lines
- If it fits comfortably, don't split

### Stage 2: Growing Complexity (Some Specs - 300-400 lines)
- Approaching complexity threshold
- Multiple distinct concerns emerging
- Consider splitting, but don't force it

### Stage 3: Complex Feature (Few Specs - >400 lines)
- Over 400 lines or multiple major concerns
- Use sub-spec files (spec 012)
- Split by concern, not arbitrarily

### Stage 4: Epic/Multi-Phase (Rare - >600 lines)
- Multi-month initiative
- Consider whether it should be multiple specs instead
- Or use sub-specs with phase-based breakdown

## Case Study: How to Split Spec 018

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

## Future Tooling

### Detection: `lspec check --complexity`

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

### Guided Splitting (v0.3.0+)

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

## Warning Signs

Your spec might be too complex if:
- ⚠️ It takes >10 minutes to read through
- ⚠️ You can't summarize it in 2 paragraphs
- ⚠️ Recent edits caused corruption
- ⚠️ You're scrolling endlessly to find information
- ⚠️ Implementation plan has >8 phases

**Action**: Split using sub-specs, don't just keep growing the file.

## Documentation Updates

### AGENTS.md Template

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
```

### Template Hints

```markdown
## Plan

<!-- Break down implementation into steps -->

<!-- 💡 TIP: If your plan has >6 phases or this spec approaches 
     400 lines, consider using sub-spec files:
     - IMPLEMENTATION.md for detailed implementation
     - See spec 012 for guidance on splitting -->
```
