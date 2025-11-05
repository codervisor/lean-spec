---
status: planned
created: '2025-11-05'
tags:
  - philosophy
  - documentation
  - guidelines
priority: low
---

# Spec Assets and Artifact Management Philosophy

> **Status**: 📅 Planned · **Priority**: Low · **Created**: 2025-11-05

**Project**: lean-spec  
**Related**: Spec 012 (sub-spec files), Spec 049 (first principles)

## Overview

Define clear philosophy for what files/assets belong in spec folders vs elsewhere. Spec 012 covers markdown sub-specs, but doesn't address images, mockups, diagrams, data files, or other artifacts.

**Problem Identified**: During logo design (spec 052), we created HTML mockups for exploration. Question arose: "Do these belong in the spec folder?" Current guidance is unclear.

**Gap**: No clear principle for:
- Exploratory artifacts (mockups, prototypes, scratch work)
- Supporting assets (diagrams, screenshots, data samples)
- Production assets (final logos, configs, code)
- Lifecycle management (when to keep, move, or delete)

## Design

### Core Principle

Apply **Signal-to-Noise** test to every file in spec folder:
- **Question**: "Does this file help someone understand the **why** behind decisions?"
- **Keep**: Files that document rationale, trade-offs, chosen approach
- **Remove**: Exploration artifacts, production assets, obvious content

### Categories

**Keep in Spec Folder:**
- Diagrams explaining architecture/flow/design decisions
- Screenshots showing UI/UX decisions referenced in spec
- Small data files (<100KB) as examples (schemas, configs)
- Design artifacts showing the **chosen** approach and **why**
- Comparison images explaining trade-offs

**Keep Outside Spec Folder:**
- Interactive prototypes/mockups (HTML) - exploration tools, not documentation
- Final production assets (logos, icons) - belong in project assets
- Large files (videos, datasets) - use external links
- Multiple design iterations - only final decision needs documenting

**Lifecycle Management:**
- During work: Exploration at project root
- After decision: Move chosen artifacts to spec (if they add clarity)
- After completion: Audit and remove noise

### Example Use Case

Logo design process (spec 052):
- Exploration: HTML mockups at project root (temporary)
- Decision: Add comparison PNG showing why brackets were chosen
- Final assets: SVG files move to `docs-site/static/img/`
- Cleanup: Delete exploration HTML files

## Plan

- [ ] Document asset philosophy in AGENTS.md or new guide
- [ ] Update spec 012 to include non-markdown asset guidelines
- [ ] Add `lspec validate` checks for oversized assets
- [ ] Create examples showing good asset management
- [ ] Add to spec creation templates/guidance

## Related

- Spec 012: Sub-spec files (covers markdown, not assets)
- Spec 049: First principles (Signal-to-Noise applies here)
- Spec 052: Branding assets (real-world case that exposed this gap)

## Notes

**Why This Matters:**
- Prevents spec folders from becoming dumping grounds
- Keeps specs lean (Context Economy)
- Clarifies where production assets live
- Helps with cleanup/maintenance

**Not Urgent Because:**
- Current practice works reasonably well
- Can be addressed when spec complexity grows
- Progressive Disclosure: add guidance when pain is felt

**Future Considerations:**
- CLI warnings for large assets in spec folders
- Auto-cleanup tools for exploration artifacts
- Template guidance for asset organization
