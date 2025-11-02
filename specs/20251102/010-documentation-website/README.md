---
status: in-progress
created: 2025-11-02
tags: [documentation, website, vitepress]
priority: high
---

# Documentation Website

> **Status**: 🔨 In progress · **Priority**: High · **Created**: 2025-11-02 · **Tags**: documentation, website, vitepress

## Overview

Create a modern, user-friendly documentation website for LeanSpec using VitePress. The current README.md is comprehensive but difficult to navigate for new users. A dedicated documentation site will improve discoverability, provide better navigation, and create a professional presence for the project.

**Why Now:**
- Project is ready for external users (v0.1.0)
- README.md has grown too long (~400 lines)
- Need better organization for growing documentation
- Preparing for npm publication
- Better SEO and discoverability

**What Success Looks Like:**
- Clean, modern documentation site hosted on GitHub Pages
- Clear navigation and structure
- Mobile-friendly responsive design
- Fast page loads
- Easy to maintain and update
- Searchable content
- All existing documentation content migrated

## Design

### Technology Choice: VitePress

**Why VitePress:**
- Modern, fast, Vue-powered static site generator
- Designed specifically for documentation
- Minimal configuration
- Built-in search
- Mobile responsive out of the box
- Easy deployment to GitHub Pages
- Markdown-based (matches our existing content)
- Active development and community support

**Alternatives Considered:**
- Docusaurus: Too heavy for our needs
- GitBook: Requires external hosting
- MkDocs: Python dependency
- Jekyll: Older technology

### Site Structure

```
docs/
├── .vitepress/
│   ├── config.ts          # VitePress configuration
│   └── theme/             # Custom theme (if needed)
├── index.md               # Homepage
├── guide/
│   ├── index.md          # Getting Started
│   ├── installation.md   # Installation guide
│   ├── quick-start.md    # Quick start tutorial
│   ├── concepts.md       # Core concepts
│   └── templates.md      # Template system
├── reference/
│   ├── cli.md            # CLI commands
│   ├── frontmatter.md    # Frontmatter fields
│   ├── config.md         # Configuration
│   └── api.md            # API (if applicable)
├── ai-integration/
│   ├── index.md          # AI agent integration
│   ├── setup.md          # Setup guide
│   └── best-practices.md # Best practices
└── examples/
    ├── solo-dev.md       # Solo developer examples
    ├── team.md           # Team examples
    └── enterprise.md     # Enterprise examples
```

### Content Migration Plan

1. **Homepage** (from README intro)
   - Hero section with tagline
   - Key features
   - Quick links to major sections
   - Visual appeal

2. **Getting Started** (from README Quick Start)
   - Installation instructions
   - First spec creation
   - Basic commands

3. **Core Concepts** (from README Philosophy)
   - LeanSpec principles
   - When to use
   - Spec structure

4. **CLI Reference** (from README commands)
   - All commands documented
   - Examples for each
   - Options and flags

5. **AI Integration** (from README AI section)
   - AGENTS.md integration
   - System prompts
   - Workflow setup

6. **Templates** (from README templates)
   - Template overview
   - Customization
   - Variables

7. **API/Development** (from docs/)
   - Testing guide
   - Contributing
   - Architecture

### GitHub Pages Deployment

- Build site to `docs/.vitepress/dist/`
- Configure GitHub Actions for automatic deployment
- Use `gh-pages` branch or GitHub Actions artifact
- Custom domain support (future)

## Implementation Plan

### Phase 1: Setup (Day 1)
- [x] Create spec
- [x] Install VitePress as dev dependency
- [x] Initialize VitePress in `docs/` directory
- [x] Configure basic VitePress settings
- [x] Set up local development workflow

### Phase 2: Content Migration (Day 1-2)
- [x] Create homepage with hero section
- [x] Migrate getting started content
- [x] Migrate CLI reference
- [x] Migrate AI integration guide
- [x] Migrate template documentation
- [x] Add code examples

### Phase 3: Polish & Enhancement (Day 2)
- [x] Configure search
- [x] Add navigation menu
- [x] Add sidebar for each section
- [x] Responsive design testing
- [x] Add favicon and branding

### Phase 4: Deployment (Day 2)
- [x] Configure GitHub Pages
- [x] Set up deployment workflow
- [x] Test production build
- [x] Update main README with docs link
- [x] Verify all links work

## Technical Details

### VitePress Configuration

Key configuration options:
```typescript
// docs/.vitepress/config.ts
export default {
  title: 'LeanSpec',
  description: 'Lightweight spec methodology for AI-powered development',
  themeConfig: {
    nav: [...],
    sidebar: {...},
    socialLinks: [
      { icon: 'github', link: 'https://github.com/codervisor/lean-spec' }
    ],
    search: {
      provider: 'local'
    }
  }
}
```

### Build Commands

```json
// package.json additions
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

### GitHub Actions Workflow

Create `.github/workflows/docs.yml`:
```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run docs:build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs/.vitepress/dist
```

## Non-Goals

- Custom design system (use VitePress defaults)
- Complex interactive features
- Backend/API documentation (CLI tool only)
- Versioned documentation (single version for now)
- Multiple language support

## Success Metrics

- Documentation site live on GitHub Pages
- All README content accessible via site
- Search functionality working
- Mobile responsive
- Build time < 30 seconds
- Page load time < 2 seconds

## Open Questions

- [ ] Should we keep detailed README.md or make it minimal with link to docs?
  - **Decision**: Keep README comprehensive but add prominent docs link at top
- [ ] Custom domain needed?
  - **Decision**: Not initially, use github.io domain
- [ ] Dark mode preference?
  - **Decision**: VitePress default (auto-detect system preference)

## References

- [VitePress Documentation](https://vitepress.dev/)
- [VitePress GitHub](https://github.com/vuejs/vitepress)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
