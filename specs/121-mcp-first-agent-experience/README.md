---
status: complete
created: '2025-11-26'
tags:
  - mcp
  - ai-agents
  - ux
  - init
  - dx
priority: high
created_at: '2025-11-26T02:23:13.829Z'
updated_at: '2025-11-26T02:56:55.242Z'
transitions:
  - status: in-progress
    at: '2025-11-26T02:32:10.155Z'
  - status: planned
    at: '2025-11-26T02:37:22.150Z'
  - status: in-progress
    at: '2025-11-26T02:45:28.537Z'
  - status: complete
    at: '2025-11-26T02:56:55.242Z'
depends_on:
  - 073-template-engine-agents-md
related:
  - 072-ai-agent-first-use-workflow
  - 110-project-aware-agents-generation
completed_at: '2025-11-26T02:56:55.242Z'
completed: '2025-11-26'
---

# MCP-First Agent Experience: Multi-Tool Support & SDD Compliance

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-26 · **Tags**: mcp, ai-agents, ux, init, dx

**Project**: lean-spec  
**Team**: Core Development

## Overview

### Problem: AI Agents Don't Follow MCP-Based SDD Workflow

Real user feedback indicates significant friction with current AGENTS.md approach:

**Issue 1: Tool-Specific File Names**
- Claude Code doesn't read `AGENTS.md` by default - requires `CLAUDE.md`
- Gemini CLI looks for `GEMINI.md`
- Other tools have their own conventions
- Users must manually create symlinks, breaking quick-start experience

**Issue 2: AGENTS.md Not MCP-Focused**
- Current template mentions CLI commands as primary method
- MCP tools appear as "alternative" rather than preferred approach
- AI agents default to CLI or manual file operations instead of MCP tools
- User quote: "效果不是很好" (not working well)

**Issue 3: SDD Compliance Degrades Over Time**
- AI agents create specs correctly initially
- After 2-3 conversations, agents forget to update specs with progress
- No clear reminder about ongoing SDD obligations
- Specs become stale/disconnected from actual work

### Root Causes

1. **File naming**: `AGENTS.md` is a convention, not universal standard
2. **MCP buried in docs**: CLI commands listed first, MCP mentioned later
3. **One-time instructions**: AGENTS.md read once at session start, not reinforced
4. **No session reminders**: Agents have no "checkpoint" to re-read SDD rules

### Success Criteria

After implementation:
- ✅ `lean-spec init` creates tool-specific symlinks (CLAUDE.md → AGENTS.md, etc.)
- ✅ AGENTS.md emphasizes MCP tools as PRIMARY method
- ✅ AI agents use MCP tools (not CLI) for spec operations
- ✅ AI agents maintain SDD compliance across multi-turn conversations
- ✅ Specs stay in sync with implementation progress

## Design

### Part 1: Multi-Tool Symlink Support

**During `lean-spec init`:**

```
? Which AI tools do you use? (Select all that apply)
  ◉ Claude Code / Claude Desktop (CLAUDE.md)
  ◉ GitHub Copilot (AGENTS.md - default)
  ◯ Gemini CLI (GEMINI.md)
  ◯ Cursor / Windsurf (uses AGENTS.md)
  ◯ Other (AGENTS.md)

Creating agent instruction files...
  ✓ AGENTS.md (primary)
  ✓ CLAUDE.md → AGENTS.md (symlink)
```

**File Structure After Init:**
```
project/
├── AGENTS.md           # Primary file (always created)
├── CLAUDE.md → AGENTS.md   # Symlink for Claude Code
├── GEMINI.md → AGENTS.md   # Symlink for Gemini CLI (if selected)
└── .lean-spec/
```

**Why Symlinks?**
- Single source of truth (edit AGENTS.md, all tools see updates)
- No duplication or sync issues
- Git-friendly (symlinks track correctly)
- Easy to add more tools later

**Non-Interactive Mode:**
```bash
# Create all common symlinks
lean-spec init -y --agent-tools all

# Create specific symlinks
lean-spec init -y --agent-tools claude,gemini

# Skip symlinks (legacy behavior)
lean-spec init -y --agent-tools none
```

### Part 2: MCP-First AGENTS.md Rewrite

**Current Structure (Problems):**
```markdown
## Essential Commands
**Discovery:**
- `lean-spec list` - See all specs
- `lean-spec search "<query>"` - Find relevant specs
...
```

**New Structure (MCP-First):**
```markdown
## 🔧 How to Manage Specs

### Primary Method: MCP Tools (Recommended)

If you have LeanSpec MCP server configured, **ALWAYS use MCP tools**:

| Action | MCP Tool | Why MCP is Better |
|--------|----------|-------------------|
| See project status | `board` | Kanban view + health metrics |
| List all specs | `list` | Filterable, structured data |
| Search specs | `search` | Semantic search across content |
| View a spec | `view` | Formatted output with metadata |
| Create spec | `create` | Auto-sequences, proper structure |
| Update status | `update` | Validates transitions, timestamps |
| Check dependencies | `deps` | Visual dependency graph |

**Why MCP over CLI?**
- ✅ Direct tool integration (no shell execution)
- ✅ Structured responses (better for AI reasoning)
- ✅ Real-time validation (immediate feedback)
- ✅ Context-aware (knows your project state)

### Fallback: CLI Commands

If MCP is not available, use CLI:
- `lean-spec board` - Project overview
- `lean-spec list` - See all specs
- `lean-spec create <name>` - Create new spec
- `lean-spec update <spec> --status <status>` - Update status

**Check MCP availability first**: If you see LeanSpec tools in your available tools, use them!
```

### Part 3: SDD Compliance Reinforcement

**Problem:** AI agents read AGENTS.md once, then forget SDD rules.

**Solution 1: Persistent Reminders in AGENTS.md**

Add a new section that's impossible to miss:

```markdown
## ⚠️ CRITICAL: SDD Workflow Checkpoints

**Before EVERY task**, check:
1. 📋 Run `board` tool - What's the current project state?
2. 🔍 Run `search` tool - Are there related specs?
3. 📝 Is there an existing spec for this work?

**During implementation**, remember:
4. 📊 Update spec status to `in-progress` BEFORE coding
5. 📝 Document decisions/changes in the spec as you work
6. ✅ Update spec status to `complete` AFTER finishing

**After EVERY task**, ask yourself:
- Did I update the spec with what I learned?
- Did I change the status appropriately?
- Are there new specs needed for follow-up work?

### 🚨 Common Mistakes to Avoid

❌ Creating files without checking existing specs first
❌ Implementing features without updating spec status
❌ Finishing work without documenting decisions in spec
❌ Leaving spec status as "planned" after starting work
❌ Using manual file creation instead of MCP tools
```

**Solution 2: Session Checkpoint Prompt (New MCP Tool)**

Add a new MCP prompt `checkpoint`:

```typescript
// New MCP prompt: checkpoint
{
  name: "checkpoint",
  description: "SDD compliance reminder - call this periodically during long sessions",
  template: `
## SDD Checkpoint ✅

Before continuing, verify:

1. **Current Specs**: {{board_summary}}
2. **Active Work**: {{in_progress_specs}}
3. **Your Task**: Does it relate to an existing spec?

### Action Required:
- If working on existing spec: Is status `in-progress`?
- If new work: Create spec with \`create\` tool first
- If finished: Update status to \`complete\`

Remember: **Specs are the source of truth. Keep them in sync!**
  `
}
```

**Solution 3: Reminder in MCP Tool Responses**

Add gentle reminders to MCP tool outputs:

```typescript
// After create_spec
return {
  result: "Spec 121-my-feature created",
  reminder: "💡 Remember to update status to 'in-progress' when you start implementing!"
}

// After list/board showing stale specs
return {
  result: [...],
  warning: "⚠️ Spec 045 has been 'in-progress' for 7 days. Consider updating status."
}
```

### Part 4: Enhanced Init Flow

**New Interactive Init:**

```
$ lean-spec init

Welcome to LeanSpec! 🚀

? Choose your setup:
  ❯ Quick Start (recommended for most projects)
    Full Setup (customize everything)
    Example Project (learn with a tutorial)

? Which AI tools do you use? (affects agent instruction files)
  ◉ Claude Code / Claude Desktop
  ◉ GitHub Copilot  
  ◯ Gemini CLI
  ◯ Cursor / Windsurf
  ◯ Warp Terminal
  ◯ Other

? Enable MCP integration guidance? (recommended)
  ❯ Yes - Include MCP setup instructions in AGENTS.md
    No - CLI-only instructions

Creating LeanSpec project...
  ✓ .lean-spec/config.json
  ✓ .lean-spec/templates/
  ✓ specs/
  ✓ AGENTS.md (with MCP-first instructions)
  ✓ CLAUDE.md → AGENTS.md

🎉 LeanSpec initialized!

Next steps:
  1. Configure MCP server (see AGENTS.md for instructions)
  2. Start your AI tool and ask: "Show me the project board"
  3. Create your first spec: "Create a spec for [feature]"
```

## Plan

### Phase 1: Multi-Tool Symlink Support
- [x] Add AI tool selection to init prompts
- [x] Create symlink generation logic (CLAUDE.md, GEMINI.md, etc.)
- [x] Add `--agent-tools` CLI flag for non-interactive mode
- [x] Handle Windows (use file copy instead of symlink if needed)
- [x] Update init success message with created files
- [ ] Test symlinks work with actual AI tools

### Phase 2: MCP-First AGENTS.md
- [x] Rewrite `packages/cli/templates/standard/AGENTS.md`
- [x] Rewrite `packages/cli/templates/detailed/AGENTS.md`
- [x] Add "How to Manage Specs" section with MCP-first approach
- [x] Add MCP vs CLI comparison table
- [x] Add tool availability check guidance
- [x] Update SDD Workflow with MCP tools

### Phase 3: SDD Compliance Reinforcement
- [x] Add "SDD Workflow Checkpoints" section to AGENTS.md
- [x] Add "Common Mistakes" section with clear ❌/✅ examples
- [x] Create `checkpoint` MCP prompt for periodic reminders
- [x] Add gentle reminders to MCP tool responses
- [x] Add stale spec warnings to board/list outputs

### Phase 4: Documentation & Testing
- [x] Update docs-site MCP integration guide
- [x] Update agent-configuration.mdx with new structure
- [x] Add Chinese translations for new content
- [x] Test with GitHub Copilot MCP (this session validates workflow)
- [ ] Test with Claude Code (real user flow)
- [ ] Test with Gemini CLI
- [ ] Collect user feedback

## Test

### Multi-Tool Symlinks
- [x] `lean-spec init` shows AI tool selection prompt
- [x] Selecting "Claude Code" creates CLAUDE.md symlink
- [x] Selecting "Gemini CLI" creates GEMINI.md symlink
- [x] Symlinks point to AGENTS.md correctly
- [x] Editing AGENTS.md reflects in symlinked files
- [x] `--agent-tools all` creates all symlinks non-interactively
- [x] `--agent-tools none` skips symlink creation
- [x] Windows handles lack of symlink support gracefully

### MCP-First Content
- [x] AGENTS.md lists MCP tools before CLI commands
- [x] MCP vs CLI comparison table is clear
- [x] "Check MCP availability" guidance is prominent
- [x] SDD Workflow uses MCP tool names (not CLI)

### SDD Compliance
- [x] "SDD Workflow Checkpoints" section exists in AGENTS.md
- [x] "Common Mistakes" section lists anti-patterns clearly
- [x] `checkpoint` MCP prompt returns useful reminder
- [x] Stale spec warnings appear in board output
- [ ] AI agents (Claude Code) follow MCP-first approach
- [ ] AI agents update specs after completing work

### Real-World Validation
- [ ] User with Claude Code reports improved experience
- [ ] AI agent uses MCP tools (verified via MCP logs)
- [ ] Specs stay in sync over multi-turn conversations
- [ ] No manual CLAUDE.md creation needed

## Notes

### Why Not Just Rename AGENTS.md?

Considered renaming AGENTS.md to tool-specific names:
- ❌ Breaks existing projects
- ❌ No single source of truth
- ❌ Must maintain multiple files
- ✅ **Symlinks**: Best of both worlds

### Tool-Specific Conventions Research

| Tool | Expected File | Source |
|------|--------------|--------|
| Claude Code | CLAUDE.md | [Anthropic Docs](https://docs.anthropic.com/en/docs/claude-code) |
| Claude Desktop | Uses MCP directly | N/A |
| GitHub Copilot | AGENTS.md | [GitHub Docs](https://docs.github.com/copilot) |
| Gemini CLI | GEMINI.md | [Google Docs](https://github.com/google-gemini/gemini-cli) |
| Cursor | .cursorrules, AGENTS.md | Cursor docs |
| Windsurf | .windsurfrules, AGENTS.md | Codeium docs |
| Cline | AGENTS.md | Cline docs |

### MCP Tool Priority Order

For AGENTS.md, recommend tools in this order:
1. `board` - Best first-run experience (visual, comprehensive)
2. `list` - Alternative overview
3. `search` - Finding specific specs
4. `view` - Reading spec details
5. `create` - Creating new specs
6. `update` - Modifying specs

### Session Persistence Challenge

**Core Problem:** LLMs have no memory between sessions. AGENTS.md is read once.

**Mitigations:**
1. Make critical info unmissable (top of file, emojis, formatting)
2. Add checkpoints (periodic reminders via MCP prompt)
3. Tool-level reminders (in MCP responses)
4. User training (documentation on how to prompt effectively)

**Not Solvable:**
- Can't force agents to re-read AGENTS.md mid-session
- Can't inject reminders into arbitrary conversations
- Can't modify agent system prompts directly

**Best Approach:** Front-load critical info + periodic MCP checkpoints

### Related Specs

- `072-ai-agent-first-use-workflow` - First interaction protocol (complementary)
- `110-project-aware-agents-generation` - Context-aware AGENTS.md (future enhancement)
- `073-template-engine-agents-md` - Template system (dependency)

### Open Questions

1. **Should symlinks be the default?**
   - Pro: Better UX for Claude Code users (majority?)
   - Con: Adds complexity, may confuse some users
   - **Tentative**: Yes for Quick Start, optional for Full Setup

2. **How to detect which AI tool is running?**
   - Could add environment variable detection
   - Could check for MCP connection type
   - **Decision**: Start with user selection, consider auto-detect later

3. **Should we add tool-specific sections to AGENTS.md?**
   - E.g., "If you're Claude Code, do X; if Copilot, do Y"
   - **Decision**: Avoid - keep instructions universal, use MCP as common interface

4. **How often should checkpoint be called?**
   - Every N messages? Every task? User-triggered?
   - **Decision**: Document as "call periodically", let users decide
