---
status: complete
created: '2025-11-20'
tags:
  - mcp
  - ux
  - prompts
  - ai-agents
priority: medium
created_at: '2025-11-20T07:11:55.891Z'
updated_at: '2025-11-20T07:16:00.005Z'
completed_at: '2025-11-20T07:16:00.005Z'
completed: '2025-11-20'
transitions:
  - status: complete
    at: '2025-11-20T07:16:00.005Z'
---

# MCP Prompts Refinement

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-20 · **Tags**: mcp, ux, prompts, ai-agents

**Project**: lean-spec  
**Team**: Core Development

## Overview

Refine MCP prompts based on actual usage patterns. Add commonly used prompts for project progress overview and roadmap planning. Revise existing prompts that are rarely used.

**Problem**: Current MCP prompts don't align with actual workflow needs. Missing key prompts for common tasks like project overview and roadmap planning. Existing prompts rarely used.

**Solution**: Add two new high-value prompts (project progress, roadmap planning) and revise/remove underused prompts.

## Design

### Current Prompts Analysis

**Existing prompts:**
1. `create-feature-spec` - Guided feature spec creation
2. `find-related-specs` - Discover related specs by topic
3. `update-spec-status` - Quick status update workflow

**Usage assessment:**
- `create-feature-spec`: Redundant - agents can use `create` tool directly
- `find-related-specs`: Partially useful but too narrow - agents already search with `search`/`list` tools
- `update-spec-status`: Good for quick updates, keep but simplify

### New Prompts to Add

#### 1. Project Progress Overview
**Name**: `project-progress-overview`  
**Purpose**: Generate comprehensive project status report combining specs, git history, and metrics

**Args**: None (zero arguments for simplicity)

**Prompt template**:
```
Analyze project progress and provide a comprehensive overview:

1. **Spec Analysis**: Review all specs, group by status, highlight blockers
2. **Recent Activity**: Check git commits (last 2 weeks), identify key changes
3. **Velocity Metrics**: Calculate completion rate, avg time in each status
4. **Risk Assessment**: Identify stalled specs, missing dependencies
5. **Next Steps**: Recommend priority actions based on current state
```

#### 2. Project Roadmap Planning
**Name**: `plan-project-roadmap`  
**Purpose**: Interactive roadmap planning with phases, tasks, and dependencies

**Args**:
- `goal` (string, required) - High-level project goal or milestone

**Prompt template**:
```
Plan project roadmap for: {goal}

1. Review existing specs and current project state
2. Break down goal into phases/milestones
3. Identify key tasks and dependencies for each phase
4. Create specs for major work items
5. Establish realistic timeline based on project velocity
6. Set up dependency relationships between specs
7. Identify risks and mitigation strategies

Provide actionable next steps to implement this roadmap.
```

### Prompts to Revise/Remove

**Remove**:
- `create-feature-spec` - Too narrow, agents should use tools directly

**Revise**:
- `find-related-specs` → Remove (redundant with tools)
- `update-spec-status` → Simplified to only required args (specPath, status)

**Keep as-is**: None need to remain exactly as-is

## Plan

- [x] Analyze current prompt usage patterns
- [x] Create `project-progress-overview` prompt file
- [x] Create `plan-project-roadmap` prompt file  
- [x] Remove `create-feature-spec` prompt
- [x] Simplify `update-spec-status` prompt (removed optional args)
- [x] Remove `find-related-specs` (redundant with tools)
- [x] Update prompt registry
- [x] Build and test changes
- [x] Validate with real usage scenarios

## Test

**Manual Testing**:
- [ ] Invoke `project-progress-overview` in Copilot/Claude
- [ ] Invoke `plan-project-roadmap` with sample goal
- [ ] Verify removed prompts don't appear in MCP prompt list
- [ ] Verify revised prompts work as expected

**Validation Criteria**:
- [ ] New prompts generate useful, actionable output
- [ ] Prompts leverage existing MCP tools effectively
- [ ] Prompt templates are clear and guide AI behavior
- [ ] No regression in existing MCP functionality

## Notes

**Design Rationale**:
- Focus on high-level workflow prompts, not micro-tasks
- Prompts should orchestrate tool usage, not replace tools
- Keep prompts minimal - signal-to-noise principle applies here too
- Prompts are for common patterns, not one-off tasks

**Changes Summary**:

**Added:**
1. `project-progress-overview` - Comprehensive project status report combining specs, git history, and metrics
2. `plan-project-roadmap` - Interactive roadmap planning with phases, tasks, and dependencies

**Removed:**
1. `create-feature-spec` - Too narrow, agents use `create` tool directly
2. `find-related-specs` - Redundant with `search`/`list` tools

**Modified:**
1. `update-spec-status` - Simplified to only required arguments (specPath, status)

**Simplification Rationale:**
- Too many optional arguments cause confusion
- `project-progress-overview` now has zero arguments (always includes metrics, uses 2-week timeframe)
- `plan-project-roadmap` has one required argument (goal), always reviews existing work
- `update-spec-status` keeps only required args, agents can call `update` tool directly for other fields

**Implementation Notes**:
- All prompts include explicit tool usage guidance
- Prompts generate actionable workflows, not just instructions
- New prompts leverage multiple tools in sequence (board, stats, list, deps, git commands)
- Simplified prompt registry to focus on high-value workflows
