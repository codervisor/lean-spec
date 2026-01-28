# LeanSpec SDD Best Practices

## Do

- **Use MCP tools first**; fallback to CLI only when needed.
- **Keep specs short**: target <2000 tokens.
- **Write intent first**: problem, motivation, desired outcomes.
- **Update status early**: `in-progress` before coding.
- **Document decisions** as they happen.
- **Link dependencies** to show true blockers.
- **Validate before completion**.
- **Verify against reality**: Check actual code, commits, and changes when assessing progress.
- **Keep AGENTS.md minimal** and project-specific.

## Avoid

- Creating spec files manually.
- Leaving specs in `planned` after coding starts.
- Editing frontmatter by hand.
- Skipping discovery steps.
- Writing specs that are implementation-only.
- Letting specs drift from actual work.
- Trusting spec status without verifying actual implementation.
- Marking specs complete without checking commits, tests, or code changes.

## Context Economy Tactics

- Split large specs into sub-specs or references.
- Prefer bullet points over long prose.
- Remove redundant narrative.

## Status Verification

When asked "Is X done?", "What's the progress on Y?", or "Is this complete?":

### Always Check
1. **Git history**: Recent commits related to the spec
2. **File changes**: Actual code modifications in the workspace
3. **Test results**: Passing tests that verify the implementation
4. **Spec checklist**: Completion of planned tasks
5. **Documentation**: Updated docs if applicable

### Never Rely Solely On
- The spec status field (`complete`, `in-progress`, etc.)
- Outdated spec content
- Memory of previous conversations

### Red Flags
- Spec marked `complete` but no recent commits
- Spec status is `in-progress` but all code is implemented
- Checklist items unchecked but code exists
- Tests missing or failing

## Signals for New Specs

Create a new spec when:
- The change spans multiple packages or subsystems.
- You need cross-team alignment or approval.
- The implementation requires decisions with trade-offs.

Skip specs for:
- Small bug fixes.
- Typos or trivial refactors.
