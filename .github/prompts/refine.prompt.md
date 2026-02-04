---
name: refine
description: Research codebase to ensure spec is implementation-ready
---

# Refine Spec

Research the codebase to ensure spec alignment and implementation readiness.

## When to Use

Use `refine` when the spec is drafted and ready for implementation preparation:
- Spec content is stable (use `/update` if still drafting)
- Need to validate technical approach against actual code
- Want to identify implementation details before coding
- Preparing to move from `planned` to `in-progress`

## Workflow

### 1. Load Spec Context
- Use `view <spec>` to read the full spec content
- Understand requirements, scope, and technical approach
- Note any assumptions that need validation

### 2. Research Codebase

**Identify relevant code areas:**
- Search for files/modules mentioned in the spec
- Find existing patterns the spec should follow
- Locate integration points and touch points

**Semantic search for context:**
```bash
# Find related functionality
lean-spec search "relevant feature keywords"
```

**Code exploration:**
- Read existing implementations for patterns
- Check API signatures and interfaces
- Review test patterns for the area
- Identify shared utilities to reuse

### 3. Validate Technical Approach

**Check assumptions:**
- Do referenced files/APIs exist?
- Are proposed interfaces compatible?
- Does the architecture match current patterns?
- Are there existing solutions to leverage?

**Identify gaps:**
- Missing details in the spec
- Unclear implementation steps
- Undocumented dependencies
- Conflicting patterns

### 4. Update Spec with Findings

**Add concrete details:**
- Specific file paths to modify
- Exact function/class names
- API signatures to implement
- Test files to update

**Document discoveries:**
- Existing code to reuse
- Patterns to follow
- Edge cases found
- Potential blockers

**Refine requirements:**
- Break vague items into specific tasks
- Add technical sub-tasks
- Clarify acceptance criteria
- Update estimates if needed

### 5. Verify Implementation Readiness

**Checklist for readiness:**
- [ ] All referenced code paths verified
- [ ] Technical approach validated against codebase
- [ ] Dependencies confirmed available
- [ ] No blocking unknowns remain
- [ ] Checklist items are specific and actionable

**Final validation:**
```bash
lean-spec validate
lean-spec tokens <spec>
```

### 6. Prepare for Implementation

Once refined:
- Spec should be self-contained for implementation
- Any agent should be able to implement without additional research
- Move to `in-progress` when ready to start

## Research Techniques

| Goal | Approach |
|------|----------|
| Find patterns | Search for similar features in codebase |
| Validate APIs | Read interface/type definitions |
| Check compatibility | Review imports and dependencies |
| Find test patterns | Look at existing test files |
| Identify utilities | Search for helper functions |

## Quick Reference

| Action | MCP Tool | CLI Command |
|--------|----------|-------------|
| View spec | `view` | `lean-spec view <spec>` |
| Search specs | `search` | `lean-spec search "query"` |
| Check dependencies | `deps` | `lean-spec deps <spec>` |
| Check tokens | `tokens` | `lean-spec tokens <spec>` |
| Validate | `validate` | `lean-spec validate` |
| Update status | `update` | `lean-spec update <spec> --status <status>` |

## Important Reminders

- **Research before implementing** - Avoid surprises during coding
- **Be specific** - Vague specs lead to wrong implementations
- **Document paths** - Include exact file locations
- **Follow patterns** - Match existing code conventions
- **Update the spec** - Refinements go into the spec file
- **Check tokens** - Keep under 2000 even with added details
- **Ready = actionable** - Implementation should be straightforward
