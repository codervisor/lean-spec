# LeanSpec SDD Examples

## Example: Feature Spec Outline

Title: "Add cached search for large spec repositories"

Sections:
- Overview (problem + motivation)
- Design (data flow, storage, API changes)
- Plan (checklist of implementation steps)
- Tests (what to verify)
- Notes (open questions)

## Example: Dependency Link

If spec 210 depends on spec 069:
- MCP: `link` with depends_on
- CLI: `lean-spec link 210 --depends-on 069`

## Example: Minimal AGENTS.md (with Skill)

# AI Agent Instructions

## Project: Example

Core SDD workflow is defined in .lean-spec/skills/leanspec-sdd/SKILL.md.

## Project-Specific Rules
- Use pnpm instead of npm
- Update both en and zh-CN locales for UI text
