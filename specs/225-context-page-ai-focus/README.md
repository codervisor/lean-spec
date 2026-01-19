---
status: planned
created: 2026-01-19
priority: medium
tags:
- ui
- context
- ai-agents
- refactor
created_at: 2026-01-19T09:25:01.564432474Z
updated_at: 2026-01-19T09:25:01.564432474Z
---

# Refactor Context Page to Focus on AI Agent Contexts

## Overview

The current context page includes too much unnecessary information (custom docs, etc.) and doesn't clearly communicate AI agent relevant contexts. We need to refactor it to focus on what matters for AI agents:

1. **Static contexts**: System prompts (AGENTS.md, CLAUDE.md, GEMINI.md, etc.)
2. **Dynamic contexts**: Agent skills (SKILL.md files in `.github/skills/`)
3. **Global contexts**: Global configured agent skills and MCP tools (future consideration)

The new design should intuitively tell users the (potential) contexts the project might have so they can better understand if their context management is healthy.

### Current Issues

- Mixes project documentation (README.md, CONTRIBUTING.md) with AI agent contexts
- Doesn't show agent skills from `.github/skills/` directory
- No clear separation between static and dynamic contexts
- Doesn't prepare for future MCP tool contexts
- Users can't easily assess context health

### Goals

- Clear categorization of context types
- Intuitive health indicators
- Remove non-AI-agent relevant files
- Prepare for future MCP integration
- Better token budget awareness per category

## Design

### Data Model Changes

**Backend (Rust)**

```rust
/// Project context response focused on AI agent contexts
pub struct ProjectContextResponse {
    pub system_prompts: Vec<ContextFile>,      // AGENTS.md, CLAUDE.md, etc.
    pub agent_skills: Vec<AgentSkill>,         // .github/skills/*/SKILL.md
    pub config: ProjectConfigResponse,          // .lean-spec/config.json
    pub global_contexts: GlobalContexts,        // Future: MCP tools, etc.
    pub total_tokens: usize,
    pub project_root: String,
}

/// Agent skill with metadata
pub struct AgentSkill {
    pub name: String,                           // skill directory name
    pub file: ContextFile,                      // SKILL.md content
    pub description: Option<String>,            // extracted from frontmatter
}

/// Global contexts (future-ready)
pub struct GlobalContexts {
    pub mcp_tools: Vec<McpTool>,               // Future: configured MCP tools
    pub total_tokens: usize,
}
```

**Frontend (TypeScript)**

```typescript
export interface ProjectContext {
  systemPrompts: ContextFile[];              // Root-level agent instructions
  agentSkills: AgentSkill[];                 // Skills from .github/skills/
  config: {
    file: ContextFile | null;
    parsed: LeanSpecConfig | null;
  };
  globalContexts: GlobalContexts;            // Future: MCP tools
  totalTokens: number;
  projectRoot: string;
}

export interface AgentSkill {
  name: string;
  file: ContextFile;
  description?: string;
}

export interface GlobalContexts {
  mcpTools: McpTool[];                       // Future
  totalTokens: number;
}
```

### Collection Logic

**System Prompts** (root level):
- `AGENTS.md`
- `CLAUDE.md`, `GEMINI.md`, `COPILOT.md`
- `.github/copilot-instructions.md`

**Agent Skills** (`.github/skills/` directory):
- Scan `<skill-name>/SKILL.md` files
- Extract description from frontmatter or first paragraph
- Group by skill name

**Config**:
- `.lean-spec/config.json` (keep as-is)

**Global Contexts** (future):
- MCP tools configuration
- Global agent skills

### UI Design

**Context Health Indicators**:
- 🟢 Green (< 5K tokens): Optimal
- 🔵 Blue (5-10K): Good
- 🟡 Yellow (10-20K): Warning
- 🔴 Red (> 20K): Critical

**Section Layout**:
```
┌─────────────────────────────────────┐
│ Project Context                     │
│ AI agent contexts for this project  │
│ 📊 Total: 8.2K tokens               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📄 System Prompts (3 files, 4.2K)  │
│ ─────────────────────────────────── │
│ • AGENTS.md                  2.1K   │
│ • CLAUDE.md                  1.5K   │
│ • .github/copilot-instruc... 600    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🧩 Agent Skills (2 skills, 3.5K)   │
│ ─────────────────────────────────── │
│ • leanspec-sdd              2.8K    │
│   Spec-Driven Development           │
│ • leanspec-publishing       700     │
│   Publishing workflows              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚙️ Configuration (1 file, 500)     │
│ ─────────────────────────────────── │
│ • .lean-spec/config.json    500     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🌐 Global Contexts (coming soon)   │
│ ─────────────────────────────────── │
│ MCP tools and global skills will    │
│ appear here in future releases      │
└─────────────────────────────────────┘
```

**Empty States**:
- System Prompts: "No system prompts found. Add AGENTS.md to provide instructions."
- Agent Skills: "No skills configured. Create .github/skills/ to add capabilities."
- Config: "Default configuration. Create .lean-spec/config.json to customize."

## Plan

- [ ] Update Rust types in `rust/leanspec-http/src/types.rs`
  - Add `AgentSkill` struct
  - Add `GlobalContexts` struct
  - Refactor `ProjectContextResponse`
  
- [ ] Update collection logic in `rust/leanspec-http/src/handlers/projects.rs`
  - Rename `collect_agent_instructions` → `collect_system_prompts`
  - Create `collect_agent_skills` for `.github/skills/` scanning
  - Create `collect_global_contexts` (stub for future)
  - Update `get_project_context` handler
  
- [ ] Update TypeScript types in `packages/ui/src/types/api.ts`
  - Add `AgentSkill` interface
  - Add `GlobalContexts` interface
  - Update `ProjectContext` interface
  
- [ ] Refactor ContextClient component (`packages/ui/src/components/context/ContextClient.tsx`)
  - Update section components for new structure
  - Add context health indicators
  - Improve empty states with guidance
  - Update token counting per section
  
- [ ] Update translations
  - `packages/ui/src/locales/en/common.json`
  - `packages/ui/src/locales/zh-CN/common.json`
  - Update section titles/descriptions
  
- [ ] Update tests
  - `rust/leanspec-http/tests/projects_test.rs`
  - Add test for agent skills collection
  - Update existing context tests

## Test

- [ ] System prompts section displays correctly
  - Shows AGENTS.md, CLAUDE.md, etc.
  - Token counts accurate
  - Empty state when no files
  
- [ ] Agent skills section works
  - Scans `.github/skills/` directory
  - Shows SKILL.md files grouped by skill
  - Extracts descriptions
  - Empty state with guidance
  
- [ ] Context health indicators
  - Green for < 5K tokens
  - Yellow for 10-20K tokens
  - Red for > 20K tokens
  
- [ ] Search functionality works across all sections
  
- [ ] Copy all includes new structure
  
- [ ] File detail view works for all file types
  
- [ ] No regression: existing functionality preserved

## Notes

### Design Decisions

1. **Why remove project docs?**
   - README.md, CONTRIBUTING.md are not AI agent contexts
   - They're general project documentation
   - Adding them increases noise without value for agents
   - Agents can access them via other means if needed

2. **Why add agent skills?**
   - Skills are dynamic AI capabilities
   - Currently hidden from context visibility
   - Important for understanding agent behavior
   - Natural fit with LeanSpec workflow

3. **Why prepare for global contexts?**
   - MCP tools will be important
   - Better to design the structure now
   - Makes future integration seamless
   - Sets clear expectations

### Future Enhancements

- MCP tool configuration display
- Global agent skills registry
- Context health recommendations
- Auto-detect missing recommended files
- Context diff view (changes over time)
- Export context bundle for sharing

### Related Specs

- Spec 131 - UI Project Context Visibility (original implementation)
- Future: MCP integration spec (when available)