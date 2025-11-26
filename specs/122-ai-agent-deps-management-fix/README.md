---
status: complete
created: '2025-11-26'
tags:
  - ai-agents
  - dx
  - quality
  - frontmatter
  - process
priority: high
created_at: '2025-11-26T02:34:58.957Z'
updated_at: '2025-11-26T02:36:46.160Z'
transitions:
  - status: in-progress
    at: '2025-11-26T02:35:02.351Z'
  - status: complete
    at: '2025-11-26T02:36:46.160Z'
completed_at: '2025-11-26T02:36:46.160Z'
completed: '2025-11-26'
---

# Fix AI Agents Not Following Dependency Management

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-26 · **Tags**: ai-agents, dx, quality, frontmatter, process

**Project**: lean-spec  
**Team**: Core Development

## Overview

AI agents are creating specs that mention dependencies in content but fail to add them to frontmatter `depends_on` and `related` fields. This causes broken dependency graphs and inconsistent spec metadata.

## Problem

When AI agents create or edit specs, they often:
1. Reference other specs in the content (e.g., "depends on spec 045", "related to spec 072")
2. Fail to add these references to the frontmatter `depends_on` or `related` fields
3. Result in specs with inconsistent metadata vs content

## Root Cause

The AGENTS.md instructions mention dependency management but:
1. Don't emphasize it strongly enough
2. Don't include it in the spec creation checklist
3. Don't remind agents to use `lean-spec link` command after creating specs

## Solution

1. Update AGENTS.md with clearer dependency management instructions
2. Add a pre-completion checklist that includes dependency verification
3. Run one-time fix to align existing specs' frontmatter with their content references

## Affected Specs (Found)

19 specs with missing frontmatter dependencies:
- 090-leanspec-sdd-case-studies: missing related [071, 082, 067, 043]
- 114-example-projects-scaffold: missing related [113]
- 121-mcp-first-agent-experience: missing depends_on [073], related [072, 110]
- 110-project-aware-agents-generation: missing depends_on [073, 086], related [072]
- 091-chinese-localization-strategy: missing depends_on [064], related [089]
- 053-spec-assets-philosophy: missing related [049, 052]
- 024-pattern-aware-list-grouping: missing related [026]
- 096-docs-beginner-first-reorg: missing related [088, 089, 090, 091, 092]
- 071-simplified-token-validation: missing related [049]
- 058-docs-overview-polish: missing related [043]
- 025-template-config-updates: missing related [024]
- Plus several archived specs

## Success Criteria

- [ ] AGENTS.md updated with clearer dependency management rules
- [ ] All active specs have frontmatter deps aligned with content references
- [ ] Future AI agents consistently link dependencies when creating specs

## Design

<!-- Technical approach, architecture decisions -->

## Plan

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Test

<!-- How will we verify this works? -->

- [ ] Test criteria 1
- [ ] Test criteria 2

## Notes

<!-- Optional: Research findings, alternatives considered, open questions -->
