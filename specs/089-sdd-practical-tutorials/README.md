---
status: complete
created: '2025-11-17'
tags: []
priority: high
created_at: '2025-11-17T02:10:56.366Z'
updated_at: '2025-11-17T09:14:41.790Z'
transitions:
  - status: in-progress
    at: '2025-11-17T02:11:45.474Z'
  - status: complete
    at: '2025-11-17T02:11:45.698Z'
  - status: planned
    at: '2025-11-17T02:58:35.617Z'
  - status: complete
    at: '2025-11-17T09:14:41.790Z'
completed_at: '2025-11-17T02:11:45.698Z'
completed: '2025-11-17'
---

# Step-by-Step SDD Tutorials for Real Practice

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-17

**Project**: lean-spec  
**Team**: Core Development

## Overview

Users struggle to understand how to use SDD in real practice. Current docs explain concepts but lack concrete, step-by-step tutorials showing actual workflow.

**Problem**: 
- Docs are concept-heavy, practice-light
- No clear "getting started" path for new users
- Users don't know when to write specs, what to include, how to maintain them
- Missing examples of real development workflow with AI agents

**Goal**: Create practical, hands-on tutorials covering:

1. **Your First Spec** (15 min)
   - Install LeanSpec
   - Create your first spec for a simple feature
   - Update status as you work
   - See the spec through completion

2. **SDD Workflow: Feature Development** (30 min)
   - Plan a feature with spec
   - Work with AI agent using the spec
   - Keep spec in sync during implementation
   - Handle changes and iterations

3. **Managing Multiple Specs** (20 min)
   - Create related specs
   - Use dependencies and relationships
   - Track progress with `lean-spec board`
   - Archive completed work

4. **Working with Teams** (15 min)
   - Assign specs to team members
   - Use tags and priorities
   - Review others' specs
   - Coordinate work across specs

**Target audience**: Developers new to SDD, familiar with AI coding tools

## Design

**Tutorial structure**: Each tutorial follows same format:

1. **Goal**: What you'll learn (2-3 bullets)
2. **Prerequisites**: What you need to know/have
3. **Step-by-step instructions**: Clear, numbered steps with commands
4. **Checkpoints**: Verify progress at key points
5. **What you learned**: Summary of key takeaways
6. **Next steps**: Link to next tutorial or related content

**Tutorial progression**:
- Start simple (single spec, solo dev)
- Build complexity gradually
- Each tutorial builds on previous knowledge
- Can be followed independently if user has prerequisites

**Content principles**:
- Show, don't tell: Real commands, real examples
- Include expected output for every command
- Use realistic scenarios (not toy examples)
- Show common mistakes and how to fix them
- Keep tutorials under 30 minutes each

**Format**:
- Each tutorial = separate doc page
- Include video walkthrough (future enhancement)
- Provide downloadable example project (future enhancement)
- Interactive playground (future enhancement)

## Plan

**Phase 1: Tutorial content**
- [ ] Write "Your First Spec" tutorial
- [ ] Write "SDD Workflow: Feature Development" tutorial
- [ ] Write "Managing Multiple Specs" tutorial
- [ ] Write "Working with Teams" tutorial
- [ ] Review tutorials with test users for clarity

**Phase 2: Integration**
- [ ] Add "Tutorials" section to docs-site
- [ ] Create tutorial navigation/progression
- [ ] Add "Quick Start" link to homepage pointing to first tutorial
- [ ] Update README.md to mention tutorials

**Phase 3: Enhancements (future)**
- [ ] Record video walkthroughs
- [ ] Create downloadable example projects
- [ ] Add interactive playground/sandbox

## Test

- [ ] New user can complete "Your First Spec" tutorial in under 20 minutes
- [ ] All commands in tutorials execute successfully
- [ ] Test users report understanding SDD workflow after tutorials
- [ ] Users can apply SDD to their own projects after completing tutorials
- [ ] No confusion or stuck points in tutorial flow (test with 3+ new users)

## Notes

<!-- Optional: Research findings, alternatives considered, open questions -->
