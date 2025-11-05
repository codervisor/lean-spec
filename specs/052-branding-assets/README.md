---
status: in-progress
created: '2025-11-05'
tags:
  - design
  - launch
  - v0.2.0
priority: high
---

# Export and Deploy Brand Assets

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-11-05

**Project**: lean-spec  
**Dependencies**: Spec 043 (Official Launch v0.2.0)

## Overview

Export LeanSpec brand assets in all required formats and deploy across documentation, repository, and marketing channels for the v0.2.0 launch.

**Logo Selected:** Version 3 of Concept D - "The Bracket"
- Minimalist bracket frame with "LS" monogram
- Represents bounded context (Context Economy principle)
- Code-like aesthetic, scales perfectly 16px-512px
- Colors: Dark (#1a1a2e), Light (#ffffff), Accent (#00d9ff)

## Design

### Asset Requirements

**Logo Formats:**
- [x] SVG (vector, primary)
  - [x] `logo-with-bg.svg` (dark on white, theme-safe) - ✅ Created
  - [x] `logo-dark-bg.svg` (cyan on dark, for dark mode) - ✅ Created
  - [x] `logo.svg` (dark, transparent - advanced use only) - ✅ Created
  - [x] `logo-light.svg` (white, transparent - advanced use only) - ✅ Created
- [ ] PNG exports (16px, 32px, 64px, 128px, 256px, 512px)
- [ ] Favicon (ICO format, 16x16, 32x32)

**Social Media Assets:**
- [ ] GitHub social preview (1280x640px PNG)
- [ ] Twitter/X card (1200x630px PNG)
- [ ] Open Graph image (1200x630px PNG)
- [ ] LinkedIn banner (1584x396px PNG)

**Documentation:**
- [x] Logo in README.md header - ✅ Added (theme-safe version)
- [x] Branding guidelines document - ✅ Created (`docs-site/static/BRANDING.md`)
- [x] Logo in docs site navbar with dark mode support - ✅ Configured
- [ ] Favicon for docs site
- [ ] Update docusaurus social card

### Design Rationale

**Why the bracket logo?**
1. **Context Economy** - Brackets visually represent "bounded context"
2. **Developer-friendly** - Brackets are familiar to developers (code syntax)
3. **Scalable** - Simple geometric shapes scale perfectly at any size
4. **Memorable** - "LS" monogram is direct and easy to recall
5. **First Principles** - Minimalist design reflects signal-to-noise principle

## Plan

**Phase 1: Export Core Assets** ✅ COMPLETE
- [x] Create SVG variants (with-bg, dark-bg, transparent) - ✅ DONE
- [x] Update README with theme-safe logo - ✅ DONE
- [x] Update docs site with theme-aware logos - ✅ DONE
- [x] Document branding guidelines - ✅ DONE
- [ ] Export PNG sizes using design tool or CLI
- [ ] Generate favicon files

**Phase 2: Deploy to Docs Site**
- [ ] Verify logo rendering in navbar
- [ ] Replace favicon files
- [ ] Update social card image reference
- [ ] Test dark/light mode logo switching

**Phase 3: Marketing Assets**
- [ ] Create GitHub social preview image
- [ ] Create Twitter/X card design
- [ ] Create Open Graph image
- [ ] Add meta tags to docs site

**Phase 4: Repository Updates**
- [ ] Add logo to npm package metadata
- [ ] Update GitHub repository settings
- [ ] Add to CHANGELOG for v0.2.0

## Test

- [ ] Logo renders correctly in README (GitHub)
- [ ] Logo renders correctly in docs site navbar
- [ ] Favicon appears in browser tabs
- [ ] Social media previews display correctly (test with link preview tools)
- [ ] Logo scales properly at all sizes (16px to 512px)
- [ ] Brand colors match specification (#1a1a2e, #ffffff, #00d9ff)

## Notes

### Tools for Export

**SVG to PNG conversion:**
```bash
# Using rsvg-convert (install via homebrew)
brew install librsvg

# Export different sizes
rsvg-convert -w 512 -h 512 logo.svg > logo-512.png
rsvg-convert -w 256 -h 256 logo.svg > logo-256.png
# ... repeat for all sizes
```

**Favicon generation:**
```bash
# Using ImageMagick
brew install imagemagick
convert logo-32.png logo-16.png favicon.ico
```

### Links to Spec 043

This spec supports the branding checklist in spec 043 (MARKETING.md):
- Export logo in all formats
- Create favicon files
- Update docs site
- Create social media assets
