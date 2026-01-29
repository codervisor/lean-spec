---
status: planned
created: 2026-01-29
created_at: 2026-01-29T14:15:50.066725Z
updated_at: 2026-01-29T14:15:50.066725Z
---

# Spec Edit History Review via Git Integration

## Context

Users want to review the edit history of specs to understand how they evolved over time. Since specs are stored as markdown files in git repositories, we can leverage git history to show changes.

## Problem

Currently there's no way to view the edit history of a spec within the LeanSpec UI. Users must manually run git commands to see how a spec has changed.

## Solution

Integrate git history viewing for individual specs in the UI, showing:
- Timeline of commits that modified the spec
- Diff view for each change
- Author and date information
- Commit messages

## Implementation Approach

### Backend (Rust)

1. Add git history API endpoint in `leanspec-http`:
   - `GET /api/specs/{path}/history` - returns list of commits
   - `GET /api/specs/{path}/history/{commit}` - returns spec content at commit
   - `GET /api/specs/{path}/diff/{from}/{to}` - returns diff between commits

2. Use `git2` crate for git operations (already in project)

### Frontend (UI)

1. Add "History" tab or button on SpecDetailPage
2. Create SpecHistoryPanel component showing:
   - Commit timeline/list
   - Diff viewer (using Monaco editor or react-diff-viewer)
3. Allow comparing any two versions

## Acceptance Criteria

- [ ] Backend: API endpoint returns spec git history
- [ ] Backend: API endpoint returns spec content at specific commit
- [ ] Backend: API endpoint returns diff between commits
- [ ] UI: History panel shows commit timeline
- [ ] UI: Can view spec at any historical commit
- [ ] UI: Can view diff between versions
- [ ] Works for both spec.md and sub-specs

## Technical Notes

- Handle specs that don't exist in git (new uncommitted specs)
- Consider pagination for specs with long history
- Cache git history for performance

## Dependencies

None - this is standalone feature enhancement
