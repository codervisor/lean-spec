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

## Overview

Align Core Concepts around an AI-era model that treats specs as executable blueprints for autonomous agents. This spec reframes the docs into a layered structure (Constraints → First Principles → Patterns) and maps them cleanly to three pages: Understanding LeanSpec, The 12 Patterns for AI‑Executable Specs, and When to Use.

## Problem

The Core Concepts documentation pages (First Principles, Philosophy, Agile Principles, When to Use) feel isolated and incoherent:

1. **Circular Navigation**: Each page tells readers to start somewhere else, creating confusion about entry point
2. **Overlapping Content**: Same concepts (Context Economy, signal-to-noise, etc.) explained differently across pages without clear differentiation
3. **Inconsistent Depth**: First Principles is very detailed, Philosophy is abstract, Agile Principles is practical—no clear progression
4. **Missing Narrative**: No story arc showing how concepts build on each other
5. **Academic Taxonomy**: "First Principles" vs "Philosophy" vs "Agile Principles" distinction is unclear to readers

**Result**: Readers must mentally stitch together ideas across pages, creating cognitive overhead.

## The Real Innovation

Traditional specs assume a human-only loop: human writes → human reads → human implements. LeanSpec assumes an AI-first loop: human writes → AI reads → AI implements → human reviews. That shift changes what “good” looks like: specs must be simultaneously human-readable and machine-executable within finite context windows and real token costs.

## Solution

Restructure Core Concepts around a layered model tailored to AI-executable specs, then map that model to three concise pages:

### Layered Model
- **Layer 1 — Constraints (discovered, not chosen)**: Physics (finite context windows), Biology (working memory ~7 items), Economics (tokens/time cost money)
- **Layer 2 — First Principles (derived from constraints)**: The existing 5 principles are the core innovation and remain authoritative
- **Layer 3 — Practices (applied patterns for execution)**: Replace generic “writing specs” advice with concrete, repeatable patterns that make specs AI-executable

### Page 1: Understanding LeanSpec (Constraints + First Principles + Mindset)
**Goal**: Foundation and rationale in one place  
**Flow**: Constraints → First Principles → Mindset → Success Criteria

### Page 2: The 12 Patterns for AI‑Executable Specs (NEW)
**Goal**: Practical, concrete techniques that make specs executable by agents  
**The 12 Patterns**:
1. Structure as signal — use consistent sections (Problem/Solution/Success)
2. Examples over abstraction — show API calls and payloads
3. Explicit boundaries — state what’s out of scope
4. Success criteria first — define “done” upfront
5. Intent over steps — explain why, not how
6. Parseable metadata — use frontmatter for machine reading
7. Natural language body — write for human understanding
8. Concrete over theoretical — prefer real examples
9. Constraints as guardrails — make limits explicit
10. Iteration markers — mark TBDs and proceed
11. Learning capture — update spec from implementation
12. Single source of truth — spec reflects current reality

### Page 3: When to Use (integrated, unchanged in scope)
**Goal**: Decision framework for applying LeanSpec  
Add clear references back to Understanding and Patterns; emphasize judgment over rules.

## Design

The design is intentionally minimal to reduce cognitive and token load:
- Use a three-layer model: Constraints (immutable) → First Principles (derived) → Patterns (applied)
- Map layers to three pages to establish a clear 1→2→3 learning path
- Replace generic advice with 12 concrete patterns optimized for AI execution
- Keep cross-links directional (Understanding → Patterns → When to Use) to avoid circular navigation

## Implementation Plan

### Phase 1: Understanding LeanSpec (Merge + Reframe)
- [ ] Merge first-principles.mdx + philosophy.mdx
- [ ] Frame with Constraints → First Principles → Mindset
- [ ] Remove circular “start here” references
- [ ] Add concise success criteria section

### Phase 2: 12 Patterns (Create New Page)
- [ ] Create 12-patterns.mdx (AI-executable patterns)
- [ ] Port practical guidance from “writing specs” into patterns
- [ ] Add examples for at least patterns 1–6
- [ ] Cross-link each pattern to relevant principle(s)

### Phase 3: Navigation & Cross-links
- [ ] Update `docs-site/sidebars.ts` to order: Understanding → 12 Patterns → When to Use
- [ ] Update cross-references between pages
- [ ] Remove “start with X then come back” phrasing

### Phase 4: Clean Up & Redirects
- [ ] Remove/retire `philosophy.mdx` and `first-principles.mdx` in favor of Understanding
- [ ] Deprecate/replace “writing-specs” with `12-patterns.mdx`
- [ ] Update any internal/external links and redirects

## Success Criteria

- [ ] No circular “start here” references
- [ ] Clear 1→2→3 progression (Understanding → 12 Patterns → When to Use)
- [ ] Patterns map to principles; each pattern has at least one example
- [ ] Readers can apply patterns without jumping pages
- [ ] Docs site builds successfully and all internal links work

## Trade-offs

**Lose**: Familiar “agile-style” practices page  
**Gain**: AI-era specificity with patterns that are immediately executable by agents

**Rationale**: LeanSpec optimizes for Context Economy and AI execution. Layered structure (Constraints → Principles → Patterns) reduces cognitive load and increases machine actionability.
