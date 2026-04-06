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

If spec 210 depends on spec 069 (independent blocker):

```bash
leanspec rel add 210 --depends-on 069
```

## Example: Umbrella with Children

If spec 250 is an umbrella "CLI UX Overhaul" with children 251, 252, 253:

```bash
# Create umbrella and children
leanspec create cli-ux-overhaul --title "CLI UX Overhaul"
leanspec create help-system --title "Improved Help System"
leanspec create error-messages --title "Better Error Messages"
leanspec create progress-indicators --title "Progress Indicators"

# Assign children to parent
leanspec rel add 251 --parent 250
leanspec rel add 252 --parent 250
leanspec rel add 253 --parent 250

# Verify structure
leanspec children 250
```

## Example: Choosing Between Parent and Depends-On

**Scenario A**: "Search UI" is part of the "Search Feature" umbrella.
→ Use **parent/child**: `leanspec rel add search-ui --parent search-feature`

**Scenario B**: "Search Feature" needs "Database Indexing" done first.
→ Use **depends_on**: `leanspec rel add search-feature --depends-on database-indexing`

**Litmus test**: Remove the other spec — does yours still make sense?
- "Search UI" without "Search Feature"? No → parent/child
- "Search Feature" without "Database Indexing"? Yes (just blocked) → depends_on

## Example: Minimal AGENTS.md (with Skill)

# AI Agent Instructions

## Project: Example

Core SDD workflow is defined in the leanspec skill.

Install: `npx skills add codervisor/skills@leanspec`

## Project-Specific Rules
- Use pnpm instead of npm
- Update both en and zh-CN locales for UI text
