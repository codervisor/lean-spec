---
status: planned
created: 2025-11-02
tags: [documentation, website, feature]
priority: high
---

# Documentation Website

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-02

## Overview

LeanSpec needs a dedicated documentation website to provide better onboarding, searchable guides, and comprehensive references for users. Currently, all documentation lives in markdown files within the repository, which makes it harder for new users to discover features and best practices.

**Goals:**
- Improve discoverability and user onboarding
- Provide searchable, well-organized documentation
- Showcase LeanSpec's visualization tools with interactive examples
- Support multiple documentation versions as the project evolves

**Why now?**
- Project has 19 specs and growing adoption
- Multiple features (board, timeline, custom fields, templates) need better explanation
- Users need a central place to explore capabilities before installing

## Design

### Technology Stack
- **Framework**: Docusaurus - React-based with rich plugin ecosystem and built-in versioning
- **Hosting**: Vercel - automatic deployments, edge network, excellent DX
- **Domain**: docs.leanspec.dev (or subdomain of main site)

### Site Structure

```
/
├── Getting Started
│   ├── Installation
│   ├── Quick Start
│   └── Your First Spec
├── Core Concepts
│   ├── The LeanSpec Mindset
│   ├── Spec Structure
│   └── Frontmatter & Metadata
├── CLI Reference
│   ├── Commands Overview
│   ├── Visualization Tools (board, stats, timeline, gantt)
│   └── Template Management
├── Customization
│   ├── Custom Fields
│   ├── Variables
│   └── Templates
├── AI Integration
│   ├── AGENTS.md Setup
│   ├── System Prompts
│   └── Best Practices
├── Examples & Recipes
│   ├── Solo Developer Setup
│   ├── Team Workflows
│   └── Enterprise Integration
└── API Reference (if applicable)
```

### Key Features
- **Search**: Full-text search across all documentation
- **Version Switcher**: Support for different LeanSpec versions
- **Interactive Demos**: Embedded examples of board view, timeline, etc.
- **Dark Mode**: Match user preference
- **Copy-Paste Friendly**: Easy code snippet copying
- **Mobile Responsive**: Works well on all devices

### Content Strategy
- Migrate existing README.md content as foundation
- Extract examples from specs/ for real-world use cases
- Add visual guides for visualization commands
- Include troubleshooting and FAQ sections
- Link to GitHub for code examples and contributions

## Plan

- [ ] Initialize Docusaurus project
- [ ] Set up documentation site structure and build config
- [ ] Configure Vercel deployment
- [ ] Migrate existing README.md content to structured pages
- [ ] Create CLI reference documentation (auto-generated from commands)
- [ ] Write customization guides (custom fields, variables, templates)
- [ ] Add interactive examples and screenshots
- [ ] Set up search functionality
- [ ] Configure deployment pipeline (GitHub Actions)
- [ ] Set up domain and DNS (if needed)
- [ ] Add analytics (optional, privacy-respecting)
- [ ] Create contribution guide for documentation updates
- [ ] Launch and announce

## Test

- [ ] All internal links resolve correctly
- [ ] Search returns relevant results for common queries
- [ ] Code examples are executable and accurate
- [ ] Site loads quickly (< 2s initial load)
- [ ] Mobile responsive on iOS and Android
- [ ] Dark/light mode toggle works
- [ ] Version switcher shows correct content per version
- [ ] Deploy pipeline successfully builds and publishes
- [ ] All CLI commands documented and up-to-date
- [ ] Examples match current LeanSpec behavior
## Notes

### Technology Decisions

**Docusaurus** ✅
- React-based, highly customizable
- Rich plugin ecosystem (search, analytics, etc.)
- Versioning built-in - crucial as project evolves
- Strong community and Meta backing
- MDX support for interactive components

**Vercel** ✅
- Automatic Git deployments
- Preview deployments for PRs
- Edge network with global CDN
- Zero-config for most frameworks
- Free tier perfect for documentation sites
- ⚠️ Slightly heavier than VitePress

### Open Questions
- Should we include video tutorials or stick to text/screenshots?
- Do we need a playground/sandbox for trying LeanSpec commands?
- Should we have a blog section for updates and best practices?
- How do we handle documentation for templates (standard, enterprise, etc.)?

### Future Enhancements
- Interactive CLI simulator (try commands in browser)
- VS Code extension documentation (if/when built)
- GitHub Action workflow examples
- Integration guides for popular project management tools
