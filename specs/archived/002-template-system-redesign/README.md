---
status: complete
created: 2025-10-31
tags: [templates, templates-system]
priority: high
completed: 2025-10-31
---

# template-system-redesign

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-10-31 · **Tags**: templates, templates-system


**Created**: 2025-10-31  
**Status**: Complete

## Goal

Expand LeanSpec template system to support multiple working styles, team sizes, and domains. Current single template is too limiting - teams need options without sacrificing lean principles.

## Key Points

- Template bundles: Each template is a directory containing spec.md + supporting files (AGENTS.md, checklists, etc.)
- Core templates: default (new structured), minimal (current simple), team, enterprise, api
- CLI support: `--template` flag for selection, `lean-spec templates` to list available
- New default template: Hybrid structure with Overview, Objectives, Design, Implementation Plan, Success Criteria, Non-Goals, Notes, References

## Non-Goals

What we're explicitly NOT doing:
- Creating dozens of domain-specific templates (start with 5 core ones)
- Making templates mandatory or rigid (still adaptable)
- Losing the lean philosophy (every template stays focused)
- Complex template inheritance system (keep it simple)

## Notes

Current template (to become "minimal"):
- Simple: Goal, Key Points, Non-Goals, Notes
- Works but feels like a form

New default template structure:
- Status with emoji, spec location link
- Overview, Objectives, Non-Goals
- Design, Implementation Plan (numbered)
- Success Criteria (checkboxes)
- References, Notes
- More actionable and structured while staying lean

Template directory structure:
```
templates/
├── default/
├── minimal/
├── team/
├── enterprise/
└── api/
```

Each can contain multiple files - not just spec.md.
