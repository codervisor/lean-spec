---
status: planned
created: '2025-11-24'
tags: ['documentation', 'user-experience', 'ai-workflow']
priority: high
created_at: '2025-11-24T02:57:57.618Z'
---

# Simplify and Streamline Tutorial Content

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-24

**Project**: lean-spec  
**Team**: Core Development

## Overview

Current tutorials (e.g., "Writing Your First Spec with AI") are overly verbose and lack the progressive, full-lifecycle approach demonstrated in the simplified getting-started guide. They focus on basic operations rather than showcasing LeanSpec's core value: AI-driven spec-to-implementation workflow.

**Problem**: Tutorials don't reflect how users actually work with LeanSpec:
- Too many manual CLI commands instead of AI-driven workflow
- Verbose explanations that lose the reader
- Missing the full lifecycle: intent → spec → implementation → completion
- Don't showcase MCP integration benefits
- Step-by-step format feels rigid vs. natural conversation flow

**Goal**: Rewrite tutorials to be:
- **Simple**: Get to value quickly, minimal ceremony
- **Linear**: Follow natural workflow progression
- **Progressive**: Build on previous concepts
- **Full-lifecycle**: Show complete journey from idea to working code
- **AI-first**: Demonstrate AI agent capabilities, not just CLI commands

## Design

### Tutorial Structure Redesign

**New Tutorial Suite** (3 core tutorials):

1. **Your First Feature with AI** (10 min)
   - Intent → AI creates spec → AI implements → Review & test
   - Shows: MCP integration, spec creation, AI implementation, status tracking
   - Outcome: Working feature with completed spec

2. **Managing Multiple Features** (15 min)
   - Work on 2-3 related features
   - Shows: Listing specs, searching, dependencies, parallel work
   - Outcome: Understanding project-level spec management

3. **Refactoring with Specs** (15 min)
   - Document a refactoring need → Create spec → AI assists
   - Shows: When to spec, technical specs, code review integration
   - Outcome: Completed refactoring with clear documentation

### Content Principles

**From getting-started.mdx approach:**
- Use conversational prompts: "Ask your AI: ..." instead of "Run this command: ..."
- Show AI workflow first, CLI details second (reference links)
- Realistic examples with actual output samples
- Clear "what happens" explanations after each step
- Visual progression: Intent → Spec → Code → Complete

**Avoid:**
- ❌ Long prerequisite sections (link to getting-started)
- ❌ Manual CLI commands unless necessary
- ❌ Step-by-step numbered instructions (feels rigid)
- ❌ Abstract examples ("feature-x", "task-y")
- ❌ Separate "what you learned" summaries (embed learning)

**Include:**
- ✅ Real-world scenarios (login, dashboard, API)
- ✅ AI conversation examples with actual prompts
- ✅ Visual spec examples (before/after)
- ✅ "Why this matters" context inline
- ✅ Smooth transitions between concepts

### Template Structure

Each tutorial follows this flow:

**Opening (Hook + Context)**
- One-sentence hook explaining why this matters
- Time estimate and learning outcome
- Prerequisites (link to getting-started, mention MCP)

**The Scenario**
- Real-world context in 2-3 sentences
- Show starting point: file tree, existing code, or problem statement

**Creating the Spec**
- Natural language prompt example
- Explain what the AI does
- Show key parts of the generated spec (excerpt)

**Implementation**
- Implementation prompt example
- List what the AI will do (3-4 bullet points)
- Show key code changes or progress updates

**Review and Complete**
- How to verify and test
- Update status (command or AI prompt)

**What Just Happened**
- Reflection on the workflow
- Key concepts learned
- Why this approach is powerful

**Next Steps**
- Immediate action reader can take
- Link to related concept
- Link to next tutorial (progression)

**Structure Notes:**
- Use conversational tone, not instructional
- Show prompts as code blocks with actual examples
- Include realistic spec/code excerpts
- Embed learning inline, not in separate summaries

### Content Migration Plan

**Phase 1: Rewrite Core Tutorials**
1. Replace "Writing Your First Spec with AI" → "Your First Feature with AI"
2. Create "Managing Multiple Features" (new)
3. Create "Refactoring with Specs" (new)

**Phase 2: Archive or Consolidate**
- "AI-Assisted Feature Development" → Merge into tutorial 1
- "Managing Multiple Specs with AI" → Becomes tutorial 2
- Other tutorials: Archive or convert to guides if too detailed

**Phase 3: Polish**
- Add screenshots/GIFs of AI interactions
- Cross-link to relevant guide sections
- Ensure Chinese translations match

## Plan

### Content Creation
- [ ] Draft "Your First Feature with AI" tutorial
  - Use realistic example (e.g., "Add email notifications")
  - Show full MCP workflow with Copilot/Claude
  - Include spec creation, implementation, testing, completion
  - Target: 400-500 lines, <2,000 tokens

- [ ] Draft "Managing Multiple Features" tutorial
  - Scenario: Dashboard with 3 widgets (list, create, update)
  - Show: `lean-spec list`, search, dependencies, parallel work
  - Demonstrate project-level visibility

- [ ] Draft "Refactoring with Specs" tutorial
  - Scenario: Extract API client from monolith
  - Show: Technical spec structure, architectural decisions
  - Demonstrate AI-assisted refactoring

### Documentation Updates
- [ ] Update tutorial index page with new structure
- [ ] Add navigation: Tutorial 1 → 2 → 3 progression
- [ ] Update getting-started to reference tutorials
- [ ] Ensure sidebar.ts reflects new tutorial order

### Translations
- [ ] Translate new tutorials to Chinese (zh-Hans)
- [ ] Maintain content parity with English versions
- [ ] Validate MDX formatting for Chinese content

### Quality Assurance
- [ ] Test AI prompts with GitHub Copilot Agent Mode
- [ ] Test AI prompts with Claude Code + MCP
- [ ] Verify all links work
- [ ] Run `npm run build` in docs-site
- [ ] Review token counts for all tutorials

## Test

**Success Criteria:**
- [ ] New user can complete tutorial 1 in <15 minutes
- [ ] Tutorials demonstrate full spec-to-implementation lifecycle
- [ ] AI prompts work with major AI tools (Copilot, Claude)
- [ ] Each tutorial teaches one clear concept
- [ ] Token count < 2,000 per tutorial
- [ ] Build passes with no errors
- [ ] Chinese translations have complete parity

**Validation:**
- [ ] User testing: Can a new user follow tutorial 1 successfully?
- [ ] AI testing: Do the prompts produce expected results?
- [ ] Content review: Applies getting-started simplification principles?
- [ ] Token check: `lean-spec tokens` on each tutorial file
- [ ] Link check: All internal/external links valid

## Notes

**Key Differences from Current Approach:**

Current "Writing Your First Spec with AI":
- 6 steps with substeps
- Focuses on spec writing techniques
- Heavy on manual commands
- Ends at spec creation (no implementation)

New "Your First Feature with AI":
- Natural flow: intent → spec → code → done
- Focuses on AI workflow
- Shows complete lifecycle
- Demonstrates actual value delivery

**Example Transformation:**

**Before (current approach):**

Section title: "Step 1: Share Intent with the Agent"

Content: "Open VS Code, focus the agent panel, and paste your intent. Example prompt: [prompt]. The agent will request the AGENTS.md instructions..."

**After (simplified approach):**

Section title: "Creating the Spec"

Content: "In your AI tool, describe what you want: [code block with prompt]. The AI reads your project structure and creates a spec in specs/014-email-notifications/."

**Key difference:** Conversational and outcome-focused vs. instructional and process-focused.

**Why This Matters:**
- Aligns with getting-started simplification
- Makes tutorials actionable vs. instructional
- Shows LeanSpec value (AI integration) not just features (CLI commands)
- Reduces friction for new users
