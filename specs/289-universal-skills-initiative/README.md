---
status: planned
created: 2026-02-03
priority: high
tags:
- agent-skills
- umbrella
- cross-platform
- skills
created_at: 2026-02-03T07:54:30.806474499Z
updated_at: 2026-02-03T07:54:30.806474499Z
---

# Universal Agent Skills Initiative

## Overview

Umbrella spec for the Agent Skills ecosystem initiative. This groups all work related to making LeanSpec skills universally compatible, easier to install, and properly maintained.

### Strategic Goals

1. **Universal Compatibility**: Skills work across all mainstream AI coding tools
2. **Public Repository**: Host skills in dedicated `codervisor/leanspec-skills` repo
3. **Smooth Installation**: `lean-spec init` correctly references installed skill paths
4. **Community Contribution**: Enable external contributions to skills

### Child Specs

| Spec | Focus | Status |
|------|-------|--------|
| 222 - Cross-Tool Compatibility | Detection, installation, platform support | planned |
| 282 - AGENTS.md Path References | Template substitution for skill paths | planned |
| 290 - Skills Repository Migration | Move public skills to dedicated repo | planned |

## Design

### Architecture

```
codervisor/leanspec-skills (new repo)
├── skills/
│   └── leanspec-sdd/
│       ├── SKILL.md
│       └── references/
├── .github/
│   └── workflows/
│       └── validate.yml    # skills-ref validate
└── README.md

codervisor/lean-spec (this repo)
├── packages/cli/
│   └── templates/          # skills installed from leanspec-skills
└── .github/skills/
    └── leanspec-sdd/       # dev copy, synced from leanspec-skills
```

### Benefits

- **Separation of Concerns**: Skills maintained independently from CLI
- **Versioning**: Skills can be versioned separately
- **Community**: Lower barrier to contribute skills
- **Distribution**: CLI fetches skills from published repo

## Plan

- [ ] Complete 222: Cross-tool compatibility strategy
- [ ] Complete 282: AGENTS.md skill path references  
- [ ] Complete 283: Skills repository migration
- [ ] Update documentation for new skills workflow
- [ ] Announce universal skills support

## Test

- [ ] Skills work in Claude, Cursor, Copilot, and CLI-based tools
- [ ] `lean-spec init` generates correct AGENTS.md paths
- [ ] leanspec-skills repo contains validated skills
- [ ] Skills can be installed from public repo

## Notes

This is an **umbrella spec** - it tracks overall progress but delegates implementation to child specs.