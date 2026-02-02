---
status: planned
created: 2026-02-02
priority: high
tags:
- documentation
- docs-site
- positioning
- orchestration
- pivot
- i18n
depends_on:
- 168-leanspec-orchestration-platform
- 221-ai-orchestration-integration
- 250-structured-spec-hierarchy-management
created_at: 2026-02-02T05:17:36.940073469Z
updated_at: 2026-02-02T05:17:53.068476867Z
---

# Documentation Site Update: AI Orchestration Platform Pivot

## Overview

**Purpose**: Update the LeanSpec documentation website to reflect the strategic pivot from "lightweight SDD framework" to "AI agent orchestration platform" while documenting all major features added since v0.2.11.

**Problem**: The current docs-site positioning and content are outdated:
- **Outdated positioning**: Describes LeanSpec as a "spec-driven development framework"
- **Missing features**: Many features from v0.2.12-v0.2.22 are undocumented
- **Competitive context**: Comparison with vibe-kanban (16.4k stars) and new AI IDE competitors (Kiro, Cursor, Windsurf) is missing or outdated
- **Architecture docs**: Missing documentation for Rust migration, Desktop app, AI chat, session orchestration

**Solution**: Comprehensive docs-site update covering positioning, feature documentation, and architectural guides.

## The Strategic Pivot

### Before (Current Docs)
> "LeanSpec brings agile principles to SDD (Spec-Driven Development)—small, focused documents (<2,000 tokens) that keep you and your AI aligned."

### After (New Positioning)
> "LeanSpec is the AI agent orchestration platform for spec-driven development. Create specs, implement them with AI agents, validate the results, and track everything—all from one unified interface."

### Key Messaging Changes

| Aspect | Old Positioning | New Positioning |
|--------|----------------|-----------------|
| **Category** | SDD Framework | AI Orchestration Platform |
| **Primary value** | Spec management | End-to-end AI workflow |
| **Key differentiator** | Token economy | Session orchestration + quality loops |
| **Target user** | Developers wanting better docs | Teams automating AI development |
| **Competitor set** | Spec Kit, OpenSpec | vibe-kanban, Kiro, Cursor |

## Design

### Content Updates Required

#### 1. Homepage & Overview (/docs/guide/index.mdx)
- Update tagline to orchestration platform positioning
- Add "Session Orchestration" section with visual workflow diagram
- Update Features table with: AI Sessions, Spec Hierarchy, AI Chat, Desktop App
- Add comparison with vibe-kanban
- Update "What You Get" section

#### 2. Why LeanSpec (/docs/guide/why-leanspec.mdx)
- Add vibe-kanban to comparison table (primary competitor)
- Update Kiro comparison
- Add new differentiators: Session orchestration, Quality loops, Agent Skills
- Add section: "Beyond Spec Management"

#### 3. New Pages Required

| Page | Path | Description |
|------|------|-------------|
| AI Orchestration | /docs/guide/usage/ai-orchestration.mdx | Session lifecycle, quality gates, agent config |
| Spec Hierarchy | /docs/guide/usage/spec-hierarchy.mdx | Parent-child relationships, umbrella specs |
| AI Chat | /docs/guide/usage/ai-chat.mdx | Multi-provider config, conversational management |
| Desktop App | /docs/guide/usage/desktop-app.mdx | Installation, multi-project, shortcuts |
| Sessions | /docs/guide/usage/sessions.mdx | Session lifecycle, orchestration workflows |
| Architecture | /docs/advanced/architecture.mdx | Codervisor platform vision, component diagram |
| Rust Migration | /docs/advanced/rust-migration.mdx | Package structure, contributing |

#### 4. Reference Updates
- CLI: Add `rel`, `children`, `set-parent`, `orchestrate`, `chain` commands
- MCP: Add `relationships`, `list_children`, `list_umbrellas`, `set_parent` tools

#### 5. Tutorial Updates
- Create: First AI Coding Session tutorial
- Update: First Spec with AI (add implementation triggering)

### Information Architecture

```
docs/
├── guide/
│   ├── index.mdx              # Updated: Orchestration positioning
│   ├── why-leanspec.mdx       # Updated: vibe-kanban comparison
│   └── usage/
│       ├── ai-orchestration.mdx    # NEW
│       ├── spec-hierarchy.mdx      # NEW
│       ├── ai-chat.mdx             # NEW
│       ├── desktop-app.mdx         # NEW
│       └── sessions.mdx            # NEW
├── tutorials/
│   └── first-ai-session.mdx       # NEW
├── reference/
│   ├── cli.mdx                    # Updated
│   └── mcp.mdx                    # Updated
└── advanced/
    ├── architecture.mdx           # NEW
    └── rust-migration.mdx         # NEW
```

## Plan

### Phase 1: Core Positioning (Week 1)
- [ ] Update homepage (/docs/guide/index.mdx)
- [ ] Update Why LeanSpec (/docs/guide/why-leanspec.mdx)
- [ ] Update Understanding LeanSpec (/docs/guide/understanding-leanspec.mdx)
- [ ] Create architecture overview (/docs/advanced/architecture.mdx)

### Phase 2: New Feature Documentation (Week 2)
- [ ] Create AI Orchestration Guide
- [ ] Create Spec Hierarchy Guide
- [ ] Create AI Chat Guide
- [ ] Create Desktop App Guide
- [ ] Create Sessions Management Guide

### Phase 3: Reference Updates (Week 3)
- [ ] Update CLI Reference with new commands
- [ ] Update MCP Reference with new tools
- [ ] Update FAQ with orchestration questions

### Phase 4: Tutorials & i18n (Week 4)
- [ ] Create First AI Session tutorial
- [ ] Update existing tutorials
- [ ] Update Chinese translations for all pages
- [ ] Build and test docs-site

## Test

### Content Validation
- [ ] All new pages build without errors
- [ ] Links work (internal and external)
- [ ] Code samples are tested and work
- [ ] Diagrams render correctly

### Messaging Consistency
- [ ] "AI orchestration platform" used consistently
- [ ] Old "SDD framework" references removed/updated
- [ ] Feature descriptions match actual capabilities

### i18n Completeness
- [ ] All new pages have Chinese translations
- [ ] Translation quality guidelines followed

## Notes

### Related Specs
- **168-leanspec-orchestration-platform**: Defines orchestration architecture
- **221-ai-orchestration-integration**: Unified workflow spec
- **245-session-orchestration-workflows**: Session chaining
- **250-structured-spec-hierarchy-management**: Hierarchy features
- **224-ai-chat-configuration-improvements**: Chat features

### Priority Order
1. Homepage and Why LeanSpec (highest visibility)
2. Architecture overview (technical foundation)
3. New feature guides (enablement)
4. Reference updates (completeness)
5. i18n (reach)

### Out of Scope
- Video tutorials (separate effort)
- Blog posts (marketing team)
- API documentation auto-generation