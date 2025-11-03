---
status: planned
created: '2025-11-03'
tags: ["docs","dogfooding","web"]
priority: medium
---

# Live Specs Showcase on Documentation Site

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-03

**Project**: lean-spec  
**Team**: Core Development

## Overview

Embed LeanSpec's own specs directly into the documentation website (docs-site) to showcase real-world usage and demonstrate dogfooding. This creates transparency, builds trust, and serves as a living example of LeanSpec in action.

**Why now?** We're actively using LeanSpec to build LeanSpec. Showing this process publicly demonstrates the methodology, proves it works at scale, and gives potential users a realistic example to learn from.

## Design

**Implementation Approach:**

**Option A: Build-Time Static Generation** (Recommended)
- Generate static pages from specs during Docusaurus build
- Parse spec markdown files and render as docs pages
- Fast, no runtime dependencies, SEO-friendly

**Option B: Runtime Loading**
- Fetch specs dynamically via API or static files
- More interactive but slower, requires client-side parsing

**Features:**
- **Live Specs Browser**: Browse all LeanSpec specs by date/status/tag
- **Kanban Board View**: Visual board showing current project state
- **Stats Dashboard**: Real-time statistics (status distribution, priorities, tags)
- **Spec Detail Pages**: Full spec content with navigation
- **Search Integration**: Search within LeanSpec's specs
- **Timeline View**: Chronological view of spec evolution

**Architecture:**
- Docusaurus plugin or custom build script
- Reads from `/specs` directory
- Generates pages under `/docs/dogfooding/` or `/specs/` route
- Reuses existing CLI parsers for consistency
- Auto-updates on docs deployment

**Design Elements:**
- Tag specs as "dogfooding" or "example" in navigation
- Add commentary explaining design decisions
- Link from docs to related specs (e.g., "Feature X - see spec")
- Highlight key specs as case studies

## Plan

- [ ] Design URL structure for specs on docs-site
- [ ] Create Docusaurus plugin or build script to parse specs
- [ ] Generate static pages from spec markdown
- [ ] Add Kanban board visualization page
- [ ] Add stats dashboard page
- [ ] Implement search across specs
- [ ] Add navigation/sidebar for specs section
- [ ] Style spec pages consistently with docs theme
- [ ] Add "About This Showcase" explainer page
- [ ] Link relevant docs pages to related specs
- [ ] Test build and deployment on Vercel
- [ ] Add to main docs navigation

## Test

- [ ] All specs render correctly as pages
- [ ] Frontmatter is parsed and displayed properly
- [ ] Kanban board shows accurate status
- [ ] Stats dashboard reflects current state
- [ ] Navigation between specs works smoothly
- [ ] Search finds relevant specs
- [ ] Build time is acceptable (<30s for docs)
- [ ] Deployed site shows latest specs
- [ ] Links from docs to specs work
- [ ] Mobile responsive

## Notes

**Content Strategy:**
- Lead with a narrative: "How we built LeanSpec with LeanSpec"
- Highlight interesting specs as examples
- Show progression: draft → planned → complete
- Add timestamps to show velocity

**Technical Considerations:**
- Use existing spec-loader.ts for consistency
- Consider caching parsed specs during development
- Update on every docs deployment (Vercel builds)
- Could extend to RSS feed for spec updates

**Related:**
- Documentation website (spec 010) - base infrastructure
- README improvement (spec 009) - ensure README references showcase

**Inspiration:**
- Linear's public roadmap
- Stripe's API changelog
- Tailwind's development process blog

**Open Questions:**
- Should we hide "planned" specs or show everything?
- Do we need write access (create/update from web) or read-only?
- Should archived specs be visible or hidden by default?
