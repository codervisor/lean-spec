---
status: complete
created: 2025-11-13
priority: high
tags:
- onboarding
- ai-agents
- ux
- mcp
created_at: 2025-11-13T08:20:28.110Z
updated_at: 2026-01-16T06:37:00.966145Z
transitions:
- status: in-progress
  at: 2025-11-13T08:21:45.345Z
- status: planned
  at: 2025-11-17T08:18:44.417Z
---
# AI Agent First Use Workflow

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-13 · **Tags**: onboarding, ai-agents, ux, mcp

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: Real users report that AI agents are not following the standard workflow to leverage LeanSpec MCP/CLI tools on their first use. Observed issues:

1. **Skipping Discovery**: Agents don't use discovery commands (`lean-spec board`, `lean-spec list`) to understand project context before creating specs
2. **Manual Spec Creation**: Agents create spec files manually (e.g., `specs/my-feature.md`) instead of using `lean-spec create`, resulting in:
   - Missing sequence numbers
   - Wrong directory structure (flat files vs `NNN-name/README.md`)
   - Missing/malformed frontmatter
   - Breaking LeanSpec tooling

**Root Causes**:
1. Current AGENTS.md buries discovery workflow ~200 lines down in "SDD Workflow"
2. No explicit instruction to **ALWAYS use `lean-spec create`** instead of manual file creation
3. CLI/MCP tool usage not emphasized as mandatory, appears optional

**Impact**:
- Specs created with wrong structure, breaking `lean-spec list`, `board`, etc.
- Duplicate/conflicting specs from lack of discovery
- Missing proper metadata and sequence numbers
- Poor first impression of LeanSpec's AI integration
- Users need extensive manual corrections

**Goal**: Make the discovery-first workflow unmissable and automatic for AI agents on first use.

## Design

### Problem Analysis

Current AGENTS.md structure (all templates):
1. **First Principles** (60+ lines) - Great but heavy for first use
2. **Core Rules** - Generic, no actionable first step
3. **Essential Commands** - Listed but not emphasized as mandatory first action
4. **SDD Workflow** - "Discover" is step 1 but appears ~200 lines down

**What AI agents need on FIRST interaction:**
```
🚨 CRITICAL FIRST STEPS:

1. DISCOVER project context:
   - CLI: `lean-spec board` (preferred - shows status + health)
   - MCP: Use board prompt or list tool
   
2. ALWAYS use proper tools to create specs:
   - CLI: `lean-spec create <name>`
   - MCP: Use create_spec tool
   - ❌ NEVER manually create spec files
   
Skipping these steps breaks LeanSpec tooling and structure.
```

### Solution: Add Prominent First-Use Section

Add a new section **immediately after project description**, before everything else:

**Content to add:**

    ## 🚨 First Interaction Protocol
    
    **STOP**: Before doing anything, follow these mandatory steps:
    
    ### Step 1: Discover Context (REQUIRED)
    
    **Using CLI** (recommended):
    - `lean-spec board` - Best: shows status, health, WIP at a glance
    - `lean-spec list` - Alternative: see all specs
    
    **Using MCP**:
    - Use the `board` prompt (preferred)
    - Or use the `list` tool
    
    ### Step 2: Always Use Proper Tools (REQUIRED)
    
    **To create specs:**
    - CLI: `lean-spec create <name>`
    - MCP: Use the create_spec tool
    
    ❌ **NEVER manually create spec files** (e.g., `specs/my-feature.md`)
    ✅ **ALWAYS use the CLI/MCP tools**
    
    **Why?**
    - `lean-spec create` auto-generates sequence numbers
    - Creates correct directory structure (`NNN-name/README.md`)
    - Adds proper frontmatter with timestamps
    - Manual creation breaks tooling (`list`, `board`, `search`)
    
    ### Step 3: Update Status as You Work
    
    - `lean-spec update <spec> --status in-progress` - Mark started
    - `lean-spec update <spec> --status complete` - Mark done
    
    **Why This Matters**: 
    - Discovery prevents duplicate work and finds related specs
    - Using proper tools maintains structure and metadata
    - Status updates enable project tracking and visibility

### Implementation Strategy

**Phase 1: Update All Templates** (Immediate)
- Add "First Interaction Protocol" section to all template AGENTS.md files:
  - `packages/cli/templates/minimal/files/AGENTS.md`
  - `packages/cli/templates/standard/files/AGENTS.md`
  - `packages/cli/templates/enterprise/files/AGENTS.md`
- Position: Right after project description, before Core Rules
- Use prominent emoji/visual markers (🚨)
- Keep it short (<150 tokens)

**Phase 2: Update Root AGENTS.md** (Reference implementation)
- Update `/AGENTS.md` to include this pattern
- Serves as canonical example

**Phase 3: Update Documentation**
- Update `docs-site/docs/guide/usage/ai-assisted/agent-configuration.mdx`
- Add first-use protocol to example templates
- Update MCP integration guide to emphasize discovery-first

**Phase 4: MCP Server Enhancement** (Optional, future)
- Add server-side hint when AI makes first call without discovery
- Track if `board` or `list` was called this session
- Return gentle reminder if agent tries `create_spec` without discovery first
- Detect if specs are being manually created (filesystem monitoring)

### Content Guidelines

**Keep it:**
- ✅ Visual (emojis, formatting)
- ✅ Actionable (specific commands with examples)
- ✅ Short (~200 tokens max for expanded version)
- ✅ At the top (can't miss it)
- ✅ Explains WHY (prevents duplicates, maintains structure)
- ✅ Explicit about what NOT to do (❌ don't manually create files)

**Avoid:**
- ❌ Philosophy (save for later sections)
- ❌ Lengthy explanations
- ❌ Buried in other content
- ❌ Optional/suggested tone (make it mandatory)

## Plan

- [ ] **Phase 1: Update template AGENTS.md files**
  - [ ] Update `packages/cli/templates/minimal/files/AGENTS.md`
  - [ ] Update `packages/cli/templates/standard/files/AGENTS.md`
  - [ ] Update `packages/cli/templates/enterprise/files/AGENTS.md`
  - [ ] Test with each template via `lean-spec init`

- [ ] **Phase 2: Update root AGENTS.md**
  - [ ] Add First Interaction Protocol section
  - [ ] Verify positioning and visibility

- [ ] **Phase 3: Update documentation**
  - [ ] Update agent-configuration.mdx with first-use emphasis
  - [ ] Update mcp-integration.mdx to highlight discovery pattern
  - [ ] Add verification section for first-use behavior

- [ ] **Phase 4: Validation & Testing**
  - [ ] Test with real AI agents (Copilot, Claude, etc.)
  - [ ] Verify discovery commands are used before creation
  - [ ] Collect feedback from test users

## Test

**Success Criteria:**

- [ ] **Visibility Test**: First Interaction Protocol appears in first 100 lines of all AGENTS.md templates
- [ ] **Discovery Test**: AI agent runs `lean-spec board` (or MCP equivalent) BEFORE creating specs
- [ ] **Tool Usage Test**: AI agent uses `lean-spec create` instead of manually creating files
- [ ] **Structure Test**: Created specs have correct structure (`NNN-name/README.md`, proper frontmatter)
- [ ] **Content Test**: Section includes discovery priority (board > list), tool usage mandate
- [ ] **Template Test**: All three templates (minimal, standard, enterprise) include the section
- [ ] **User Feedback**: At least 3 real users confirm agents follow proper workflow

**Testing Protocol:**

1. **Fresh Project Test**:
   ```bash
   mkdir test-lean-spec-project
   cd test-lean-spec-project
   lean-spec init --template standard
   # Ask AI agent: "Create a spec for authentication"
   # Expected: 
   #   1. Agent runs `lean-spec board` FIRST
   #   2. Agent uses `lean-spec create authentication`
   #   3. Spec created at specs/001-authentication/README.md (not specs/authentication.md)
   ```

2. **MCP Test** (with Copilot/Claude):
   - Configure MCP for test project
   - Ask: "Show me the project board"
   - Expected: Uses MCP board prompt or list tool
   - Ask: "Create a user profile spec"
   - Expected: Uses create_spec tool (NOT manual file creation)
   - Verify: Check `specs/` directory has `NNN-user-profile/README.md` structure

3. **Existing Project Test**:
   - Project with 5+ existing specs
   - Ask AI: "Add a rate limiting feature"
   - Expected: 
     - Agent runs `lean-spec board` to see context
     - Agent searches for related specs (`lean-spec search "rate"`)
     - Agent uses `lean-spec create rate-limiting`
     - New spec properly numbered (e.g., `006-rate-limiting/`)

4. **Manual Creation Prevention Test**:
   - Ask AI: "Create a spec for email notifications"
   - Monitor filesystem
   - Expected: NO direct file creation in specs/
   - Expected: Uses `lean-spec create` or MCP create_spec tool

## Notes

### Why This Wasn't Caught Earlier

- LeanSpec dogfoods itself - our AGENTS.md was customized and had implicit context
- Templates were created for "configured" projects, not first-time use
- MCP testing focused on tool functionality, not workflow adherence
- Documentation showed capabilities but didn't enforce discovery-first pattern
- Testing focused on successful tool calls, not detecting manual file creation
- No real-world user testing with fresh AI agent interactions

### Alternative Approaches Considered

1. **MCP Server-Side Enforcement**: Have MCP server refuse `create` calls until discovery is done
   - ❌ Too restrictive, breaks legitimate workflows
   - ❌ Doesn't help CLI-only users
   - ✅ Could work as optional "training wheels" mode

2. **Interactive Init Prompt**: During `lean-spec init`, show AI-focused onboarding
   - ❌ Doesn't help projects initialized before update
   - ❌ Users might skip or miss it
   - ✅ Good supplementary approach

3. **System Prompt Enhancement**: Provide starter prompts in docs
   - ❌ Users don't always read docs
   - ❌ Varies by AI tool configuration
   - ✅ Good documentation enhancement

**Decision**: Start with prominent AGENTS.md section (lowest friction, highest impact). Consider others as enhancements.

### Related Work

- `specs/061-ai-assisted-spec-writing` - AI writing guidance (complements this)
- `specs/034-copilot-slash-commands` - VS Code integration (future commands for discovery)
- `specs/070-mcp-token-counting-tool` - MCP server enhancements (future server-side hints)

### Open Questions

- Should we add visual indicators (banner, ASCII art) to make section even more prominent?
- Should MCP server log discovery patterns and warn if skipped?
- How do we measure success beyond anecdotal user reports?
- Can we detect manual spec creation and provide helpful error messages?
- Should `lean-spec validate` check for manually created specs (missing sequence, wrong structure)?

### Key Insight from User Feedback

**Discovery Tool Priority**: `board` > `list` because:
- `board` shows status, WIP, and project health in one view
- `list` only shows spec names without context
- New users get better overview from board
- Aligns with "see the forest before the trees" principle

**Manual Creation Problem**: More serious than just skipping discovery - agents that manually create files bypass the entire LeanSpec system, breaking tooling and structure.
