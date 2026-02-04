---
name: progress
description: Check spec completion progress against codebase and update spec status
---

# Spec Progress Check

Verify spec completion by checking actual implementation against spec requirements.

## Workflow

### 1. Identify the Spec
- Use `board` or `list` to see current specs and their status
- Use `view <spec>` to read the full spec content

### 2. Analyze Spec Requirements
Extract from the spec:
- **Checklist items**: All `- [ ]` and `- [x]` items
- **Acceptance criteria**: Success conditions defined in the spec
- **Scope boundaries**: What's explicitly in/out of scope
- **Technical requirements**: Architecture, APIs, patterns specified

### 3. Verify Against Codebase

**Check git history:**
```bash
git log --oneline --since="<spec-created-date>" -- <relevant-paths>
git diff <base-commit>..HEAD -- <relevant-paths>
```

**Check file changes:**
- Verify new files/modules mentioned in spec exist
- Confirm deleted/refactored code matches spec intent
- Check test files for coverage of spec requirements

**Check implementation:**
- Read actual code to verify it matches spec design
- Verify API signatures, types, and interfaces
- Check error handling and edge cases mentioned in spec

**Check tests:**
- Run tests: `pnpm test` or relevant test command
- Verify test coverage for spec requirements
- Check that acceptance criteria have corresponding tests

### 4. Compare Checklist Items

For each spec checklist item:
1. Determine if it's verifiable via code, tests, or manual check
2. Search codebase for evidence of completion
3. Mark as complete only if implementation is verified

### 5. Update Spec Status

**Status definitions:**
- `planned` - Spec planned, work not started
- `in-progress` - Active development
- `complete` - All requirements verified in codebase

**Update commands:**
```bash
lean-spec update <spec> --status <status>
```
Or use MCP tool: `update`

### 6. Document Findings

Add a progress note to the spec with:
- Date of verification
- Items verified complete
- Items still pending
- Blockers or issues found

## Quick Commands

| Check | Command |
|-------|---------|
| View spec | `lean-spec view <spec>` |
| Check status | `lean-spec board` |
| Update status | `lean-spec update <spec> --status <status>` |
| Validate all | `lean-spec validate` |

## Important Reminders

- **Never trust status alone** - Always verify against actual code
- **Check tests pass** - Don't mark complete if tests fail
- **Verify all checklist items** - Incomplete checklists = incomplete spec
- **Update incrementally** - Move through statuses as work progresses
- **Document blockers** - If blocked, note why in the spec