---
status: in-progress
created: '2025-12-18'
tags:
  - cli
  - mcp
  - validation
  - ai-agents
  - quality
  - workflow
priority: high
created_at: '2025-12-18T02:47:39.011Z'
updated_at: '2025-12-18T02:52:58.301Z'
depends_on:
  - 018-spec-validation
  - 170-cli-mcp-core-rust-migration-evaluation
transitions:
  - status: in-progress
    at: '2025-12-18T02:51:49.673Z'
---

# Completion Status Verification Hook

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-18 · **Tags**: cli, mcp, validation, ai-agents, quality, workflow

## Overview

### Problem

When AI agents complete work on a spec, they often update `status: complete` prematurely without verifying all tasks are done. This leads to:

1. **Incomplete implementations** - Spec marked complete but TODOs remain in README checkboxes
2. **Workflow friction** - Humans must manually verify completion vs. spec requirements
3. **Quality gaps** - No automated enforcement to ensure spec fulfillment before completion
4. **Lost context** - Outstanding items discovered later when context is lost

### Solution

Add a **verification checkpoint** in the `update` command/tool (CLI & MCP) that:
- Triggers when `status` changes to `complete`
- Parses spec README for unchecked checkboxes (`- [ ]`)
- Provides actionable feedback to AI agents about outstanding items
- Allows agents to self-correct before marking complete

This creates a **feedback loop** where agents learn to verify their work before declaring completion.

## Design

### Architecture

```
┌─────────────────────────────────────────────────┐
│  AI Agent: lean-spec update 174 --status complete│
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Update Command/Tool                            │
│  1. Detect status change to "complete"          │
│  2. Read spec README.md                         │
│  3. Parse checkbox items (- [ ] / - [x])        │
│  4. Check for unchecked items                   │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐   ┌─────────────────┐
│ All checked? │   │ Has unchecked?  │
│   ✓ Success  │   │   ⚠ Warning     │
└──────┬───────┘   └─────────┬───────┘
       │                     │
       ▼                     ▼
  Update status      Return detailed info:
  to complete        - Outstanding count
                     - Task locations
                     - Suggested actions
                     - Option to proceed anyway
```

### Detection Logic

**When to trigger:**
- Status transition: `planned|in-progress → complete`
- Command: `lean-spec update <spec> --status complete`
- MCP tool: `update` with status field change

**What to check:**
```typescript
function verifyCompletion(specPath: string): VerificationResult {
  const content = readSpecContent(specPath);
  const unchecked = parseUncheckedCheckboxes(content);
  
  return {
    complete: unchecked.length === 0,
    outstanding: unchecked.map(item => ({
      line: item.lineNumber,
      text: item.text.trim(),
      section: item.section // Plan, Test, etc.
    })),
    totalCheckboxes: countTotalCheckboxes(content),
    completedCount: countCheckedCheckboxes(content)
  };
}
```

### Feedback Format

**CLI Output:**
```
⚠️  Spec has 3 outstanding checklist items:

  Plan (line 42)
    • [ ] Update MCP prompts with validation step
  
  Test (line 78)
    • [ ] Test CLI verification with unchecked items
    • [ ] Test MCP verification behavior

❓ Mark complete anyway? (y/N)
```

**MCP Tool Response:**
```json
{
  "error": "INCOMPLETE_CHECKLIST",
  "message": "Cannot mark spec complete: 3 outstanding checklist items",
  "details": {
    "outstanding": [
      {
        "section": "Plan",
        "line": 42,
        "text": "Update MCP prompts with validation step"
      },
      {
        "section": "Test",
        "line": 78,
        "text": "Test CLI verification with unchecked items"
      },
      {
        "section": "Test",
        "line": 79,
        "text": "Test MCP verification behavior"
      }
    ],
    "progress": "12/15 items complete (80%)",
    "suggestions": [
      "Review outstanding items and complete them",
      "Update checkboxes: lean-spec view 174",
      "Or mark as work-in-progress: --status in-progress"
    ]
  }
}
```

### Configuration

Add optional config to allow/bypass:
```json
// .leanspec/config.json
{
  "validation": {
    "enforceCompletionChecklist": true,  // Default: true
    "allowCompletionOverride": false      // Default: false (require --force)
  }
}
```

**Override flag:**
```bash
lean-spec update 174 --status complete --force  # Skip verification
```

## Plan

### Phase 1: Core Verification Logic

- [ ] Create `src/core/completion-verification.ts`
  - [ ] `parseCheckboxes(content: string)` - Extract all checkbox items
  - [ ] `getUncheckedItems(content: string)` - Filter unchecked only
  - [ ] `getSectionContext(content: string, lineNum: number)` - Determine section (Plan/Test/etc)
  - [ ] `verifyCompletion(specPath: string)` - Main verification function

- [ ] Add unit tests for parser
  - [ ] Parse mixed checked/unchecked items
  - [ ] Handle nested checkboxes (indented)
  - [ ] Extract line numbers and text correctly
  - [ ] Identify section headers (Plan, Test, etc.)

### Phase 2: CLI Integration

- [ ] Update `src/commands/update.ts`
  - [ ] Detect status change to `complete`
  - [ ] Call `verifyCompletion()` before applying change
  - [ ] Format and display warning with outstanding items
  - [ ] Add interactive prompt (Y/n) for override
  - [ ] Support `--force` flag to bypass

- [ ] Add CLI tests
  - [ ] Test verification triggers on status change
  - [ ] Test warning display format
  - [ ] Test interactive prompt behavior
  - [ ] Test `--force` flag bypass

### Phase 3: MCP Integration

- [ ] Update `packages/mcp/src/tools/update.ts`
  - [ ] Call `verifyCompletion()` before status change
  - [ ] Return structured error with outstanding items
  - [ ] Include progress metrics (X/Y complete)
  - [ ] Provide actionable suggestions in response

- [ ] Update MCP schema
  - [ ] Add `force` parameter to update tool
  - [ ] Document verification behavior in tool description

- [ ] Update MCP prompts (`packages/mcp/src/prompts/`)
  - [ ] Add checkpoint guidance before marking complete
  - [ ] Teach pattern: verify → fix outstanding → mark complete

### Phase 4: Configuration & Docs

- [ ] Add config options to `ConfigSchema`
  - [ ] `validation.enforceCompletionChecklist`
  - [ ] `validation.allowCompletionOverride`

- [ ] Update documentation
  - [ ] Add to CLI reference (update command)
  - [ ] Add to MCP tools reference
  - [ ] Add to AGENTS.md workflow guidance
  - [ ] Add to best practices

- [ ] Update both locales
  - [ ] `packages/ui/src/locales/en/common.json`
  - [ ] `packages/ui/src/locales/zh-CN/common.json`
  - [ ] `packages/mcp/src/locales/en/common.json` (if needed)
  - [ ] `packages/mcp/src/locales/zh-CN/common.json` (if needed)

## Test

### Unit Tests

- [ ] Parser correctly identifies unchecked items
- [ ] Section detection works for all heading levels
- [ ] Line numbers are accurate
- [ ] Nested checkboxes handled properly
- [ ] Edge cases: no checkboxes, all checked, mixed

### Integration Tests

- [ ] CLI: Verification triggers on status→complete
- [ ] CLI: Warning displays with correct formatting
- [ ] CLI: Interactive prompt works correctly
- [ ] CLI: `--force` flag bypasses verification
- [ ] MCP: Returns structured error with details
- [ ] MCP: `force` parameter bypasses verification

### E2E Workflow Tests

- [ ] AI agent completes spec with outstanding items → receives feedback
- [ ] Agent reviews feedback, completes items, marks complete → success
- [ ] Human uses `--force` to override → succeeds with warning
- [ ] Spec with no checkboxes → completes without verification

### Real-World Validation

- [ ] Test with actual spec during implementation
- [ ] Verify feedback is actionable for AI agents
- [ ] Confirm workflow feels natural, not burdensome
- [ ] Validate performance impact is negligible (<50ms)

## Notes

### Design Decisions

**Why checkboxes only?**
- Structured, unambiguous signal of completion criteria
- Already widely used in specs (Plan, Test sections)
- Easy to parse reliably without AI/NLP

**Why warning instead of hard block?**
- Humans may have valid reasons to mark complete (e.g., deferred items)
- Flexibility reduces friction while maintaining awareness
- `--force` flag provides escape hatch

**Why not validate during status update in any direction?**
- Only `→ complete` transition matters for quality gate
- Other transitions (planned→in-progress) don't require verification
- Keeps feedback focused and actionable

### Future Enhancements

- [ ] **Codebase verification**: Check if files mentioned in checkboxes exist
- [ ] **Test execution**: Run tests before allowing completion
- [ ] **Dependency checks**: Verify `depends_on` specs are complete
- [ ] **Quality metrics**: Token count, validation pass before complete
- [ ] **Sub-spec coordination**: Check sub-specs completion status

### Related Specs

- [018-spec-validation](../018-spec-validation/README.md) - Existing validation infrastructure
- [122-ai-agent-deps-management-fix](../122-ai-agent-deps-management-fix/README.md) - Workflow validation patterns
