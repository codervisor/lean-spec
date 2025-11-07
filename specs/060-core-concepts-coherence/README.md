---
status: complete
created: '2025-11-07'
tags:
  - docs
  - ux
  - information-architecture
priority: high
created_at: '2025-11-07T12:20:31.352Z'
updated_at: '2025-11-07T12:25:39.409Z'
transitions:
  - status: in-progress
    at: '2025-11-07T12:21:12.082Z'
  - status: complete
    at: '2025-11-07T12:25:39.409Z'
completed_at: '2025-11-07T12:25:39.409Z'
completed: '2025-11-07'
---

# Core Concepts Documentation Coherence

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-07 · **Tags**: docs, ux, information-architecture

**Project**: lean-spec  
**Team**: Core Development

## Problem

The Core Concepts documentation pages (First Principles, Philosophy, Agile Principles, When to Use) feel isolated and incoherent:

1. **Circular Navigation**: Each page tells readers to start somewhere else, creating confusion about entry point
2. **Overlapping Content**: Same concepts (Context Economy, signal-to-noise, etc.) explained differently across pages without clear differentiation
3. **Inconsistent Depth**: First Principles is very detailed, Philosophy is abstract, Agile Principles is practical—no clear progression
4. **Missing Narrative**: No story arc showing how concepts build on each other
5. **Academic Taxonomy**: "First Principles" vs "Philosophy" vs "Agile Principles" distinction is unclear to readers

**Result**: Readers must mentally stitch together ideas across pages, creating cognitive overhead.

## Solution

Restructure Core Concepts into a coherent 3-page progression:

### Page 1: Understanding LeanSpec (merge first-principles + philosophy)
**Goal**: Foundation + mindset in one place  
**Flow**: Constraints → Principles → Philosophy → Mindset

**Structure**:
- **Why LeanSpec Exists** (the constraints we discovered)
- **5 First Principles** (with examples, tests, conflict resolution)
- **The LeanSpec Mindset** (how to think, not just what to follow)
- **Success Criteria** (how to know if you're doing it right)

**Rationale**: First principles and philosophy are two sides of same coin—constraints + how to apply them. Combining eliminates circular navigation.

### Page 2: Writing Specs (agile principles → practical guide)
**Goal**: Day-to-day practices for writing good specs  
**Flow**: From understanding → to action

**Structure**:
- **6 Core Practices** (rename from "agile principles"):
  1. Clarity over Documentation
  2. Essential Scenarios over Exhaustive Lists
  3. Living Guide over Frozen Contract
  4. Reduced Mind Burden over Comprehensive Coverage
  5. Speed over Perfection
  6. Collaboration over Specification
- **Applying the Practices** (workflow guidance)
- **Common Patterns** (templates, examples)

**Rationale**: Practical how-to guide that assumes reader understands Page 1. Clear progression from theory to practice.

### Page 3: When to Use (unchanged, but better integrated)
**Goal**: Decision framework for applying LeanSpec  
**Flow**: From practices → to judgment

Keep current structure but add:
- Clear references back to Understanding page
- Frame as "applying what you learned"
- Make it clear this is about judgment, not rules

## Implementation Plan

### Phase 1: Create New "Understanding LeanSpec" Page
- [ ] Merge first-principles.mdx + philosophy.mdx content
- [ ] Reorganize into coherent flow (constraints → principles → mindset)
- [ ] Remove circular "start here" references
- [ ] Ensure examples flow naturally

### Phase 2: Refactor "Writing Specs" Page
- [ ] Rename principles.mdx → writing-specs.mdx
- [ ] Update "Agile Principles" → "Core Practices"
- [ ] Add intro referencing Understanding page
- [ ] Streamline examples (remove overlap with Understanding)

### Phase 3: Update Navigation & Cross-links
- [ ] Update sidebars.ts
- [ ] Update cross-references between pages
- [ ] Ensure clear 1→2→3 progression
- [ ] Remove "start with X then come back" language

### Phase 4: Clean Up & Archive Old Files
- [ ] Delete philosophy.mdx and first-principles.mdx
- [ ] Rename principles.mdx → writing-specs.mdx
- [ ] Update any external links pointing to old URLs

## Success Criteria

- [ ] No circular "start here" references between pages
- [ ] Clear 1→2→3 progression (Understanding → Writing → When to Use)
- [ ] Each page has distinct purpose without overlap
- [ ] Readers can understand concepts without jumping between pages
- [ ] Docs site builds successfully
- [ ] All internal links work correctly

## Trade-offs

**Lose**: Academic precision of separating "first principles" from "philosophy"  
**Gain**: Reader clarity and coherent learning path

**Rationale**: LeanSpec values Signal-to-Noise. The academic taxonomy serves the writer more than the reader.
