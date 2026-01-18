# LeanSpec SDD Best Practices

## Do

- **Use MCP tools first**; fallback to CLI only when needed.
- **Keep specs short**: target <2000 tokens.
- **Write intent first**: problem, motivation, desired outcomes.
- **Update status early**: `in-progress` before coding.
- **Document decisions** as they happen.
- **Link dependencies** to show true blockers.
- **Validate before completion**.
- **Keep AGENTS.md minimal** and project-specific.

## Avoid

- Creating spec files manually.
- Leaving specs in `planned` after coding starts.
- Editing frontmatter by hand.
- Skipping discovery steps.
- Writing specs that are implementation-only.
- Letting specs drift from actual work.

## Context Economy Tactics

- Split large specs into sub-specs or references.
- Prefer bullet points over long prose.
- Remove redundant narrative.

## Signals for New Specs

Create a new spec when:
- The change spans multiple packages or subsystems.
- You need cross-team alignment or approval.
- The implementation requires decisions with trade-offs.

Skip specs for:
- Small bug fixes.
- Typos or trivial refactors.
