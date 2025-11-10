# Full Lifecycle Demo: Implementing Spec 035 (Live Specs Showcase)

## Overview

Show the **complete LeanSpec workflow** by implementing a real feature from the roadmap: the Live Specs Showcase on the docs site.

**Duration:** 5-8 minutes  
**Format:** Split-screen (AI chat + VS Code with terminal)  
**Outcome:** Working feature deployed and visible

**Core Message:** *"From spec to production: How LeanSpec guides real development"*

---

## Why Spec 035 is Perfect for Demo

✅ **Real feature** from actual roadmap (spec 035-live-specs-showcase)  
✅ **Visual outcome** - Can show the working result in browser  
✅ **Meaningful** - Demonstrates dogfooding (LeanSpec's specs on LeanSpec site)  
✅ **Already spec'd** - Has clear success criteria and plan  
✅ **Implementable in 5-10 minutes** - Simple enough for demo  
✅ **Shows full cycle** - Read spec → Implement → Validate → Ship

---

## Full Script

### SCENE 1: Project Discovery (45 seconds)

**[AI Chat]**
```
Human: "What features are planned for the v0.2.0 launch?"

AI: [Uses MCP: list(status="planned", tags=["v0.2.0-launch"])]
    
    "Found 2 planned specs for v0.2.0 launch:
    
    - 034-copilot-slash-commands (optional)
    - 035-live-specs-showcase (medium priority)
    
    The live specs showcase looks interesting - it would embed 
    LeanSpec's own specs into the docs site. Want to work on this?"
```

**[Terminal]**
```bash
# Verify in terminal
npx lean-spec list --status planned --tags v0.2.0-launch
```

---

### SCENE 2: Review Existing Spec (60 seconds)

**[AI Chat]**
```
Human: "Show me spec 035"

AI: [Uses MCP: view("035-live-specs-showcase")]
    
    "Spec 035: Live Specs Showcase on Documentation Site
    
    **Overview**: Embed LeanSpec's own specs into the docs site
    to showcase dogfooding and provide real examples.
    
    **Key Features**:
    - Browse all specs by status/date/tag
    - Kanban board visualization
    - Stats dashboard
    - Individual spec detail pages
    
    **Implementation Plan** (from spec):
    - Create Docusaurus plugin or build script
    - Parse specs from /specs directory
    - Generate static pages under /docs/dogfooding/
    - Add navigation and search
    
    **Success Criteria**:
    - All specs render as pages
    - Kanban board shows accurate status
    - Stats dashboard reflects current state
    - Build time under 30 seconds
    
    The spec is well-structured. Should I update its status 
    to 'in-progress' and start implementation?"
```

**[VS Code - Right side]**
- Show spec file: `specs/035-live-specs-showcase/README.md`
- Highlight frontmatter, success criteria section

---

### SCENE 3: Update Status & Start Work (30 seconds)

**[AI Chat]**
```
Human: "Yes, let's start. Update the status."

AI: [Uses MCP: update("035", status="in-progress")]
    
    "Spec 035 status updated to 'in-progress'.
    Transition logged at 2025-11-10T19:00:00Z
    
    Let me start by checking the docs-site structure..."
    
    [AI reads relevant files]
    [Shows: docs-site/docusaurus.config.ts, sidebars.ts]
```

**[Terminal]**
```bash
npx lean-spec board
# Shows 035 now in "In Progress" column
```

---

### SCENE 4: Implementation (2-3 minutes)

**[AI Chat & Code Editor working together]**

```
AI: "I'll implement this in phases:

Phase 1: Create the specs showcase section

1. First, let me create a new page to list all specs..."
```

**[VS Code shows AI creating/editing files]**

1. **Create**: `docs-site/docs/dogfooding/index.mdx`
   ```mdx
   ---
   title: LeanSpec's Specs (Dogfooding)
   ---
   
   # How We Build LeanSpec with LeanSpec
   
   This is transparency in action. Below are all the specs 
   we've written to build and evolve LeanSpec itself.
   ```

2. **Create**: `docs-site/src/components/SpecsList.tsx`
   ```tsx
   // Component that loads and displays specs
   // Uses spec-loader.ts from main package
   ```

3. **Update**: `docs-site/sidebars.ts`
   ```ts
   // Add "Dogfooding" section to sidebar
   dogfooding: [
     'dogfooding/index',
     'dogfooding/board',
     'dogfooding/stats'
   ]
   ```

**[Terminal running in background]**
```bash
cd docs-site
npm run build
# Shows build progress
```

---

### SCENE 5: Validation (45 seconds)

**[Terminal]**
```bash
# Build succeeds
npm run build
# ✓ Built in 18.2s

# Start local server
npm run serve
# Serving at http://localhost:3000
```

**[Browser]**
- Navigate to `http://localhost:3000/docs/dogfooding`
- Show **live specs list** rendering
- Click into a spec (like 042 or 043)
- Show **spec content displayed** with frontmatter

**[AI Chat]**
```
AI: "Implementation complete! Let me verify against success criteria:
    
    ✅ All specs render as pages - Working
    ✅ Kanban board visualization - TODO (next phase)
    ✅ Stats dashboard - TODO (next phase)  
    ✅ Build time under 30s - 18.2s ✅
    
    Phase 1 complete. The specs are now live on the docs site.
    Should I continue with the board and stats views?"
```

---

### SCENE 6: Check Against Spec (30 seconds)

**[AI Chat]**
```
Human: "Let's validate this matches what we spec'd"

AI: [Uses MCP: validate()]
    [Uses MCP: view("035")]
    
    "Comparing implementation to spec 035:
    
    ✅ Implemented: Spec browsing, detail pages, navigation
    ⏳ Remaining: Kanban board page, stats dashboard, search
    
    Current implementation covers ~60% of the spec.
    This is a good checkpoint. Should I update the spec 
    to mark Phase 1 complete?"
```

---

### SCENE 7: Update Spec & Commit (45 seconds)

**[AI Chat]**
```
Human: "Yes, update the spec to reflect what's done"

AI: [Edits spec 035]
    
    "I've updated spec 035 with implementation progress:
    
    ## Plan
    
    Phase 1 (Complete):
    - [x] Design URL structure ✅
    - [x] Create build script to parse specs ✅
    - [x] Generate static pages ✅
    - [x] Add navigation/sidebar ✅
    - [x] Test build and deployment ✅
    
    Phase 2 (Planned):
    - [ ] Add Kanban board visualization
    - [ ] Add stats dashboard
    - [ ] Implement search
    
    Ready to commit?"
```

**[Terminal]**
```bash
git add .
git commit -m "feat: add live specs showcase (spec 035 phase 1)

Implements browsing and viewing of LeanSpec's own specs 
on the documentation site. Enables dogfooding transparency.

See: specs/035-live-specs-showcase"

git push
```

---

### SCENE 8: Live Result & Wrap-Up (45 seconds)

**[Browser]**
- Show deployed site (if using Vercel/Netlify with auto-deploy)
- Navigate to `https://lean-spec.dev/docs/dogfooding`
- Show **real specs** from the project
- Click through a few examples

**[AI Chat]**
```
Human: "Show the project board now"

AI: [Uses MCP: board()]
    
    "Project Board (Updated):
    
    ⏳ In Progress (1)
      - 035-live-specs-showcase [in-progress] - Phase 1 complete
    
    ✅ Complete (25)
      [Recent completions...]
    
    035 is progressing well. Phase 1 shipped, Phase 2 planned."
```

**[Voiceover or text overlay]**
```
"From spec to production in under 8 minutes.

1. Discovered feature in roadmap (via AI)
2. Reviewed existing spec
3. Updated status to in-progress
4. Implemented guided by spec
5. Validated against success criteria
6. Updated spec with progress
7. Committed with spec reference
8. Deployed and verified

This is LeanSpec: Specs that guide development, 
not documentation that follows it."
```

---

## Key Visual Moments

**Timestamps for editing:**
- **0:00-0:45** - AI searches roadmap, finds spec 035
- **0:45-1:45** - AI displays full spec with success criteria
- **1:45-2:15** - Status update to "in-progress"
- **2:15-5:00** - Live coding (AI creating files, build running)
- **5:00-5:45** - Browser showing working result
- **5:45-6:30** - Validation against spec criteria
- **6:30-7:15** - Git commit with spec reference
- **7:15-8:00** - Live deployment, final board view

---

## Recording Setup

### Screen Layout
```
┌────────────────────────────────────────────────────┐
│  AI Chat (Claude/Copilot)  │  VS Code + Terminal  │
│         50%                 │        50%           │
│                             │                      │
│  Natural conversation       │  Files + Terminal    │
│  with tool calls visible    │  Split pane view     │
└────────────────────────────────────────────────────┘
```

### Pre-Recording Checklist
- [ ] Clean git state (commit any changes)
- [ ] Spec 035 status set to "planned" (not "in-progress" yet)
- [ ] docs-site/ directory ready
- [ ] MCP integration working
- [ ] Can build docs-site locally (`npm run build`)
- [ ] Have deployment pipeline ready (Vercel auto-deploy)

### During Recording
- [ ] Show AI tool calls (MCP integration)
- [ ] Keep code visible as AI writes it
- [ ] Show terminal output (build times, success messages)
- [ ] Slow down for key moments (spec display, browser demo)
- [ ] Narrate or add captions for clarity

### Post-Production
- [ ] Speed up boring parts (file creation, build time)
- [ ] Zoom in on success criteria validation
- [ ] Highlight git commit message with spec reference
- [ ] Add text overlay for key takeaways
- [ ] End with clear call-to-action

---

## Alternative: Shorter Version (3-4 minutes)

If 8 minutes is too long, focus on:

1. **Discovery** (30s): "Show me planned features" → AI finds spec 035
2. **Review** (45s): AI shows spec, highlights success criteria
3. **Update** (15s): Mark in-progress
4. **Time-lapse** (90s): Speed up implementation to 2x
5. **Validation** (45s): Show working result in browser
6. **Commit** (15s): Git commit with spec reference

**Total: 3:45**

---

## Why This Demo is Compelling

### Shows Real Workflow
❌ **Not**: Toy example with fake feature  
✅ **Is**: Actual feature from real roadmap

### Demonstrates Value
- **For AI**: Spec provides clear implementation guide
- **For Human**: Spec documents decisions and rationale
- **For Team**: Spec enables async collaboration

### Proves Dogfooding
- Building LeanSpec with LeanSpec
- Transparency in development
- Real-world usage, not contrived examples

### End-to-End Story
1. Feature exists in roadmap
2. Spec guides implementation
3. Validation checks against spec
4. Commit references spec
5. Feature ships to production

**This is the full SDD workflow in action.**

---

## Success Metrics

**Demo succeeds if viewers:**
- ✅ See how specs guide real implementation
- ✅ Understand AI + spec collaboration model
- ✅ Recognize validation catches scope creep
- ✅ Want to try LeanSpec on their projects

**Demo fails if:**
- ❌ Looks staged or artificial
- ❌ Feature seems trivial/not useful
- ❌ Workflow seems slower than "just coding"
- ❌ Value proposition unclear

---

## Next Steps

**Ready to record?**
1. Review this script
2. Prepare environment (clean git, MCP working)
3. Practice once (dry run without recording)
4. Record with voiceover or silent (add later)
5. Edit and publish

**Want to refine?**
- Adjust timing (longer/shorter sections)
- Change feature (if 035 too complex)
- Simplify (skip some validation steps)
- Add narration (explain principles as you go)

---

**This demo shows LeanSpec's killer feature: specs that actually guide development, with AI as the implementation partner.**
