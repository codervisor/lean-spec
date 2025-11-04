---
status: complete
created: 2025-10-31
tags: [init, cli, templates]
priority: high
completed: 2025-10-31
---

# init-system-redesign

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-10-31 · **Tags**: init, cli, templates


**Status**: ✅ Complete  
**Created**: 2025-10-31  
**Spec**: `specs/20251031/003-init-system-redesign.md`

## Overview

LeanSpec should help projects adopt Spec-Driven Development through `lspec init`. Current system only manages individual specs. We need project initialization that sets up the entire working model: spec structure, AI agent instructions, examples, and customizable conventions.

## Objectives

- `lspec init` command with one interactive question, three paths
- Templates become full project initialization bundles (not just spec formats)
- Spec structure uses folders: `specs/YYYYMMDD/NNN-name/README.md` (not flat files)
- Config system: `.lspec/config.json` for project-specific customization
- Keep it lean: Quick start is zero-friction, customization only when needed

## Non-Goals

- Over-engineering config options (start with minimal, essential settings)
- Breaking existing projects (migration path or backward compat)
- Complex template inheritance or plugin system
- Mandatory interactive prompts (quick start should be fast)

## Design

### Init Flow
```
$ lspec init

? How would you like to set up?
  > Quick start (recommended)     - solo-dev defaults, immediate
    Choose template               - Pick: solo-dev, team, enterprise, api-first
    Customize everything          - Full control over structure
```

### Template Structure
```
templates/
├── solo-dev/
│   ├── config.json           # Default config
│   ├── files/
│   │   ├── AGENTS.md
│   │   └── specs/
│   │       └── 001-example-spec/
│   │           └── README.md
│   └── README.md            # Template documentation
├── team/
├── enterprise/
└── api-first/
```

### Config System
`.lspec/config.json`:
```json
{
  "template": "solo-dev",
  "specsDir": "specs",
  "structure": {
    "pattern": "{date}/{seq}-{name}/",
    "dateFormat": "YYYYMMDD",
    "sequenceDigits": 3
  }
}
```

### Spec Structure Change
- **Before**: `specs/20251031/001-name.md` (file)
- **After**: `specs/20251031/001-name/README.md` (folder)
- Allows multiple files per spec (diagrams, supporting docs, etc.)

## Implementation Plan

1. [ ] Add prompts library (@inquirer/prompts or prompts)
2. [ ] Implement config loader/writer for .lspec/config.json
3. [ ] Redesign template structure as project bundles
4. [ ] Implement init command with three paths
5. [ ] Update create command to use folder structure + read config
6. [ ] Migrate existing specs to folder structure
7. [ ] Update archive/list commands for folders
8. [ ] Update docs (README, AGENTS.md)

## Success Criteria

- [ ] `lspec init` works with one question, three paths
- [ ] Quick start takes <2 seconds, zero additional input
- [ ] Templates include full working model (AGENTS.md, examples)
- [ ] Specs created as folders with README.md
- [ ] Config system allows customization without CLI flags
- [ ] Existing projects can migrate or continue working

## References

- Previous spec: `002-template-system-redesign.md` (superseded by this)
- Prompts libraries: @inquirer/prompts, prompts

## Notes

This redesign addresses the real need: LeanSpec as a **project initialization system** for SDD adoption, not just a spec file manager. Templates are working models, not fill-in-the-blank forms.

Key insight: Spec template is just one component of the working model. Full adoption needs AGENTS.md, examples, conventions, and structure.
