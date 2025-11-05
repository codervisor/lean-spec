# LeanSpec Brand Assets

Brand identity and logo usage guidelines for LeanSpec.

## Logo

**Concept:** Version 3 of Concept D - "The Bracket"

**Design Rationale:**
- Brackets represent "bounded context" (Context Economy principle)
- Minimalist, technical aesthetic aligns with first-principles philosophy
- LS monogram is simple and memorable
- Scales perfectly from 16px favicons to full-size headers
- Code-like aesthetic resonates with developer audience

## Logo Variants

### Primary Logo with Background (Light Mode)
- **File:** `logo-with-bg.svg`
- **Style:** Dark logo (#1a1a2e) on white background (#ffffff)
- **Use:** Default logo for README, light themes, documentation
- **Why:** Ensures visibility on both light and dark backgrounds (GitHub dark mode)

### Dark Background Logo (Dark Mode)
- **File:** `logo-dark-bg.svg`
- **Style:** Cyan logo (#00d9ff) on dark background (#1a1a2e)
- **Use:** Dark mode UI, docs site dark theme
- **Why:** High contrast, uses brand accent color

### Transparent Variants (Advanced Use)
- **File:** `logo.svg` - Dark logo, no background
- **File:** `logo-light.svg` - White logo, no background
- **Use:** Only when background color is controlled (e.g., specific colored sections)
- **Warning:** Will not be visible on matching backgrounds

## Color Palette

### Primary Colors
- **Dark Navy:** `#1a1a2e` - Main brand color, text, logo
- **Cyan:** `#00d9ff` - Accent, links, highlights (represents "signal")
- **White:** `#ffffff` - Light backgrounds, light logo variant

### Grayscale
- **Dark Gray:** `#666666` - Secondary text
- **Medium Gray:** `#999999` - Tertiary text, disabled states
- **Light Gray:** `#f5f5f5` - Backgrounds, subtle borders

## Typography

**Primary Font:** System UI Stack
- macOS: San Francisco
- Windows: Segoe UI
- Linux: -apple-system, BlinkMacSystemFont, system-ui

**Monospace Font:** 
- JetBrains Mono, Fira Code, or system monospace for code

**Weight:**
- Regular (400) - Body text
- Semibold (600) - Subheadings
- Bold (700) - Headings, logo text

## Logo Usage Guidelines

### ✅ Do's
- **Default choice:** Use `logo-with-bg.svg` for README, GitHub, general use
- Use adequate white space around logo (minimum 20px padding)
- Maintain aspect ratio when scaling
- Use theme-aware variants in docs/web (light mode → with-bg, dark mode → dark-bg)
- Keep logo clear and legible at all sizes

### ❌ Don'ts
- **Don't use transparent logos** (`logo.svg`, `logo-light.svg`) unless background is controlled
- Don't rotate or skew the logo
- Don't change colors outside the defined palette
- Don't add effects (shadows, gradients, outlines beyond built-in background)
- Don't place on busy backgrounds that reduce legibility
- Don't use logo smaller than 16px (use favicon instead)

## File Formats

### Vector (SVG)
- `logo.svg` - Primary dark logo
- `logo-light.svg` - Light/white logo
- Use for web, documentation, scalable assets

### Raster (PNG)
Sizes: 16px, 32px, 64px, 128px, 256px, 512px
- Use for social media, app icons, GitHub avatars

### Favicon
- 16x16, 32x32 ICO format
- Use for browser tabs, bookmarks

## Social Media Assets

### GitHub Social Preview
- **Size:** 1280x640px
- **Format:** PNG
- **Content:** Logo + "LeanSpec" wordmark + tagline

### Twitter/X Card
- **Size:** 1200x630px
- **Format:** PNG
- **Content:** Logo + key message

### Open Graph Image
- **Size:** 1200x630px
- **Format:** PNG
- **Use:** Website meta tags, link previews

## Brand Voice

**Tone:** Technical, principled, pragmatic

**Key Traits:**
- **Direct** - No fluff, get to the point
- **Principled** - Explain the "why" behind decisions
- **Pragmatic** - Balance theory with practice
- **Respectful** - Acknowledge trade-offs, never dismissive

**Examples:**
- ✅ "Specs must fit in working memory—both human and AI"
- ✅ "We operationalize first principles through tooling"
- ❌ "Revolutionary new paradigm for documentation"
- ❌ "The only tool you'll ever need"

## Taglines

**Primary:** "First-Principles Spec-Driven Development for AI-powered teams"

**Alternatives:**
- "Clarity without overhead. Structure that adapts."
- "Specs that fit in context windows"
- "SDD for the AI era"
- "Context Economy by design"

## Questions?

For brand asset questions or usage permissions, open an issue on GitHub.
