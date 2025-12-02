# Demo Content Production Guide

## Overview

Create high-impact demo assets that showcase LeanSpec's **killer feature**: **AI-native spec management**. The focus is showing AI agents working with specs naturally, not just CLI commands.

**Core Message:** *"Specs that AI agents can read, write, and reason about—automatically."*

**Target Duration:**
- Full demo video: 3-5 minutes (AI-assisted workflow)
- Individual GIFs: 15-30 seconds each

**Recording Tools:**
- **Video**: OBS Studio / Loom / QuickTime (split screen: AI chat + terminal)
- **GIFs**: terminalizer / asciinema + agg / LICEcap / Kap
- **Editing**: iMovie / DaVinci Resolve (free) for video, ezgif.com for GIF optimization

---

## Demo 1: AI-Assisted Workflow (3-5 min video) **[PRIMARY DEMO]**

**Goal:** Show AI agent creating, reading, and managing specs through natural conversation—with MCP doing the heavy lifting.

### Screen Layout

**Split screen recording:**
- **Left side (60%)**: AI chat interface (Claude Desktop or GitHub Copilot Chat)
- **Right side (40%)**: Terminal + VS Code editor

### Script Outline

```
═══════════════════════════════════════════════════════════
SCENE 1: SETUP (45 seconds)
═══════════════════════════════════════════════════════════

[Terminal]
# Show clean terminal
cd ~/demo-project
npm install --save-dev lean-spec
npx lean-spec init
# Choose "minimal" template

[AI Chat - GitHub Copilot or Claude]
Human: "What specs exist in this project?"

AI: [Uses MCP: lean-spec list]
    "The project currently has no specs. 
     Would you like to create one?"

═══════════════════════════════════════════════════════════
SCENE 2: CREATE SPEC THROUGH CONVERSATION (90 seconds)
═══════════════════════════════════════════════════════════

[AI Chat]
Human: "We need to add user authentication. Create a spec for JWT-based auth 
        with password hashing and rate limiting."

AI: [Uses MCP: lean-spec create user-authentication]
    [Uses MCP: view user-authentication]
    "I've created spec 001-user-authentication. Let me draft the content:
    
     Problem: No authentication system, anyone can access protected endpoints
     Solution: JWT tokens with bcrypt password hashing
     Success Criteria: 
     - Users can register and login
     - Passwords stored securely (bcrypt, 10 rounds)
     - Rate limiting: 5 login attempts/min per IP
     
     Should I add this content to the spec?"

### Key Messages to Emphasize

1. **Fast setup**: "From install to first spec in under 5 minutes"
2. **Simple CLI**: "Just a few intuitive commands"
3. **AI-friendly**: "Clean structure, machine-readable frontmatter"
4. **Validation built-in**: "Catches complexity issues before they become problems"
5. **Kanban workflow**: "Track progress at a glance"

### Voiceover Script (Optional)

```
"LeanSpec is a lightweight spec methodology designed for AI-powered development.

Let me show you how to get started.

[INSTALL]
First, install it in your project. It's just a dev dependency.

[INIT]
Run 'lean-spec init' to create your specs directory.
We'll use the minimal template for this demo.

[CREATE]
Now create your first spec. Let's say we're building user authentication.

The spec is generated with clean frontmatter and sections.
Status, priority, tags - all machine-readable for AI agents.

[EXPLORE]
Let's explore a few commands.
'lean-spec list' shows all your specs.
'lean-spec view' gives you a formatted view.
'lean-spec board' shows a Kanban layout - perfect for tracking progress.

[UPDATE]
When you start work, update the status.
The board reflects the change immediately.

[VALIDATE]
Here's where it gets interesting.
'lean-spec validate' checks for complexity issues.
It warns you when specs exceed 300 lines - keeping them in working memory.

[WRAP]
That's it. In under 5 minutes, you've:
- Created a spec
- Learned the core commands
- Understood the validation workflow

LeanSpec keeps specs lean, so AI agents and humans can collaborate effectively."
```

---

## Demo 2: Spec Creation Workflow (15-30s GIF)

**Goal:** Show the core workflow loop in action.

### Script

```bash
# Terminal recording - tight, fast, no pauses
npx lean-spec create api-redesign --priority high --tags api,backend
npx lean-spec list
npx lean-spec view api-redesign
# Quick edit in editor (show adding content)
npx lean-spec update api-redesign --status in-progress
npx lean-spec board
```

### GIF Requirements

- **Loop**: Yes (seamless loop)
- **Size**: <5MB for GitHub
- **Dimensions**: 800x600 or 1024x768
- **FPS**: 10-15 (smooth but small file)
- **Captions**: Optional text overlays for key steps

### Visual Flow

1. Create command → spec appears
2. List command → spec in table
3. View command → formatted output
4. Editor appears → add content
5. Update command → status change
6. Board command → Kanban view

---

## Demo 3: Validation Catching Issues (15-30s GIF)

**Goal:** Show validation preventing complexity creep.

### Script

```bash
# Setup: Create a test spec with complexity issues
npx lean-spec create complex-feature

# Edit: Add 350+ lines to the spec
# (Use a prepared fixture file or script to insert content)

# Validate: Show warnings
npx lean-spec validate

# Output shows:
# ⚠ complex-feature: 352 lines (warning: 300-400 lines)
# Recommendation: Consider simplifying or splitting

# Fix: Split into sub-specs
mkdir specs/XXX-complex-feature
mv specs/XXX-complex-feature/README.md specs/XXX-complex-feature/
# Create DESIGN.md, IMPLEMENTATION.md

# Validate again: Green check
npx lean-spec validate --verbose
```

### GIF Requirements

- **Loop**: No (tell a story)
- **Annotations**: Highlight warning messages
- **Focus**: Show before/after of validation
- **Message**: "Validation prevents complexity creep"

---

## Demo 4 (Bonus): MCP Integration (30s GIF)

**Goal:** Show LeanSpec working with Claude Desktop.

### Script (Screen Recording)

```
1. Open Claude Desktop
2. Ask: "What specs exist in this project?"
3. Claude uses MCP → shows lean-spec list output
4. Ask: "Show me the user-authentication spec"
5. Claude uses MCP → shows spec content
6. Ask: "Create a spec for password reset"
7. Claude uses MCP → creates spec, shows confirmation
8. Verify in terminal: npx lean-spec list
```

### Requirements

- **Recording**: Screen capture (Loom/OBS)
- **Show both**: Claude interface + terminal verification
- **Highlight**: Seamless integration (no manual commands)
- **Message**: "AI agents can read and write specs directly"

---

## Production Checklist

### Before Recording
- [ ] Clean terminal setup (no history, clear prompt)
- [ ] Optimal terminal size (80x24 or 100x30)
- [ ] Color scheme readable on light/dark backgrounds
- [ ] Remove personal info from terminal prompt
- [ ] Prepare fixture files if needed
- [ ] Test full script without recording

### Recording
- [ ] Use high contrast theme
- [ ] Slow down typing (150-200ms between chars for visibility)
- [ ] Pause 2-3 seconds between commands (viewer comprehension)
- [ ] Use consistent directory structure
- [ ] Record at 1920x1080, export at smaller size

### Post-Production
- [ ] Trim dead space at start/end
- [ ] Speed up slow sections (2x) if needed
- [ ] Add captions/annotations for key points
- [ ] Optimize GIF size (<5MB for GitHub)
- [ ] Test playback on GitHub (auto-play, loop)
- [ ] Add alt text for accessibility

### Distribution
- [ ] Upload video to YouTube (unlisted or public)
- [ ] Host GIFs in docs-site/static/img/demos/
- [ ] Embed in README.md
- [ ] Add to docs-site homepage
- [ ] Use in Product Hunt submission
- [ ] Share on social media

---

## Technical Setup

### Tools Installation

```bash
# For terminal recording (choose one)
npm install -g terminalizer  # Best for GIFs
npm install -g asciinema     # Best for playback flexibility

# For GIF creation
npm install -g @charmbracelet/vhs  # Modern, scriptable

# For video editing
# OBS Studio (free): https://obsproject.com/
# Loom (easy): https://loom.com/
```

### Terminalizer Config

```yaml
# .terminalizer/config.yml
cols: 100
rows: 30
repeat: 0  # Loop indefinitely for demos 2-3
quality: 100
frameDelay: auto
maxIdleTime: 1000  # Cut long pauses
```

### VHS Script Example

```vhs
# demo.tape (VHS script)
Set Shell "zsh"
Set FontSize 16
Set Width 1200
Set Height 800
Set Theme "Dracula"

Type "npx lean-spec create my-feature"
Sleep 500ms
Enter
Sleep 2s

Type "npx lean-spec list"
Sleep 500ms
Enter
Sleep 2s

Output demo.gif
```

---

## File Organization

```
docs-site/static/img/demos/
├── install-to-first-spec.mp4       # Full demo video
├── install-to-first-spec.gif       # Short version for GitHub
├── create-workflow.gif             # Demo 2
├── validation-workflow.gif         # Demo 3
└── mcp-integration.gif             # Demo 4 (bonus)

docs-site/blog/
└── 2025-11-15-demo-walkthrough.mdx # Blog post embedding demos

README.md                           # Embed GIFs in Getting Started
```

---

## Success Metrics

**Demo video is successful if:**
- [ ] Clearly shows 0 → first spec in <5 minutes
- [ ] Highlights 3-5 core commands (create, list, view, board, validate)
- [ ] Demonstrates validation catching complexity
- [ ] Total runtime: 3-5 minutes
- [ ] Viewable on mobile (legible font size)

**GIFs are successful if:**
- [ ] File size <5MB each
- [ ] Loop smoothly (where applicable)
- [ ] Text is readable at GitHub's default size
- [ ] Load quickly on slow connections
- [ ] Tell story without audio

---

## Next Steps

1. **Choose recording tool** (terminalizer recommended for GIFs)
2. **Set up clean terminal environment**
3. **Practice script 2-3 times** (smooth demo)
4. **Record Demo 1** (full video first)
5. **Extract key moments** → create GIFs for Demos 2-3
6. **Optimize and test** (file size, readability)
7. **Distribute** (README, docs site, social media)

**Timeline Estimate:**
- Setup: 30 minutes
- Recording: 1-2 hours (with retakes)
- Editing: 1-2 hours
- Distribution: 30 minutes
- **Total: Half-day to full-day project**
