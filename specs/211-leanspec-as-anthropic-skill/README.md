---
status: in-progress
created: 2026-01-12
priority: high
tags:
- agent-skills
- integration
- sdd
- cross-platform
- addon
created_at: 2026-01-12T13:55:05.053133Z
updated_at: 2026-01-16T10:36:14.703516Z
transitions:
- status: in-progress
  at: 2026-01-16T10:36:14.703516Z
---

# LeanSpec Agent Skill Support

## Overview

### Problem & Motivation

**Agent Skills** is an open standard format (https://agentskills.io) originally developed by Anthropic and now adopted across the AI coding ecosystem by Claude, Cursor, OpenAI Codex, Letta, Factory, and others. Skills are SKILL.md files that package instructions, scripts, and resources that agents can discover and use.

Currently, users must:
- Configure LeanSpec via MCP server
- Set up AGENTS.md in their project
- Manually teach AI agents about SDD methodology in every conversation

**The Opportunity**: Create a **LeanSpec Agent Skill** (SKILL.md) that:
- Teaches agents the complete SDD workflow automatically
- Works across multiple AI tools (Claude, Cursor, Codex, etc.)
- Makes SDD methodology discoverable and portable
- Serves as an **addon feature**, complementing existing MCP/CLI tools

### What Are Agent Skills?

**Agent Skills** are a lightweight, open format:
- **SKILL.md file** with frontmatter (name, description) + markdown instructions
- Optional `scripts/`, `references/`, `assets/` directories
- **Progressive disclosure**: Agents load name/description first, full content on activation
- **Cross-platform**: Works with Claude, Cursor, Codex, Letta, Factory, and growing list
- **Version controlled**: Skills are just folders you can check into git

**Key principle**: Skills are **addon capabilities**, not a replacement for core tooling.

### Strategic Vision

**Current**: LeanSpec via MCP + CLI + AGENTS.md  
**Future**: LeanSpec Agent Skill for cross-platform SDD methodology

**Key Insight**: SKILL.md serves as **primary onboarding** - teams no longer need massive AGENTS.md files with duplicated SDD instructions.

```
┌────────────────────────────────────────────────────────┐
│              LeanSpec Agent Skill                      │
│           (SKILL.md in .lean-spec/skills/)             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Replaces: Heavy AGENTS.md with SDD instructions       │
│                                                        │
│  When activated by compatible agents:                  │
│  • Teaches SDD workflow (discover → design → code)     │
│  • Enforces context economy (<2000 tokens per spec)    │
│  • References MCP tools (list, view, create, etc.)     │
│  • Provides best practices and common patterns         │
│  • Works across Claude, Cursor, Codex, etc.            │
│                                                        │
│  Does NOT replace: MCP server, CLI, or core tools      │
│                                                        │
│  AGENTS.md becomes: Project-specific rules only        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## High-Level Approach

### 1. Skill Definition Structure

**Agent Skill Format** (SKILL.md):

The skill will have YAML frontmatter followed by markdown instructions:

**Frontmatter fields**:
- `name: leanspec-sdd`
- `description`: Spec-Driven Development methodology for AI-assisted development. Use when working in a LeanSpec project.
- `compatibility`: Requires lean-spec CLI or @leanspec/mcp server
- `metadata`: author, version, homepage

**Body sections**:
1. When to Use This Skill - Triggers for activation (LeanSpec project detected, user mentions specs, planning features)
2. Core SDD Workflow - Discovery (board, search) → Design (create, validate tokens) → Implement (update status) → Validate (check completion)
3. Context Economy Principles - Keep specs under 2000 tokens, validate before creating
4. Tool Reference - Document both MCP tool names and CLI commands
5. Best Practices - Common patterns, anti-patterns, examples

See references/ for detailed workflow steps, examples, and patterns.

### 2. Integration Points

**Foundation (exists)**:
- MCP server: `@leanspec/mcp` with all tools (list, view, create, etc.)
- CLI: `lean-spec` commands
- AGENTS.md: Project-specific instructions

**Agent Skill (new, addon)**:
- SKILL.md file teaching SDD methodology
- References MCP tools and CLI commands
- Portable across Claude, Cursor, Codex, etc.
- Does NOT replace existing tools

### 3. User Experience

**Before (without Agent Skill)**:
```
Project requires 500+ line AGENTS.md explaining:
- SDD workflow
- When to create specs
- Token limits
- Discovery process
- Common patterns

User: "Let's implement feature X"
Agent: "Should I create a spec first?"
User: "Yes, follow SDD methodology in AGENTS.md..."
Agent: [needs to read and parse lengthy AGENTS.md]
```

**After (with Agent Skill)**:
```
AGENTS.md becomes minimal (50-100 lines):
- Project-specific rules only
- Team conventions
- Custom workflows

User: "Let's implement feature X"
Agent: [Detects LeanSpec project, activates leanspec-sdd skill]
Agent: [SKILL.md teaches SDD automatically]
Agent: "Checking existing specs..."
Agent: [Runs lean-spec board and search]
Agent: "No existing spec found. Creating spec 211-feature-x following SDD..."
Agent: [Creates spec, validates <2000 tokens, links dependencies]
Agent: "Spec created. Ready to implement?"
```

**Onboarding Benefit**: New team members don't need to read/maintain massive AGENTS.md. SKILL.md provides standard SOP automatically.

**Cross-platform**: Works with Claude, Cursor, Codex, and any skill-compatible agent.

### 4. What The Skill Teaches

| Capability                | What Agents Learn                                 | Tools Used             |
| ------------------------- | ------------------------------------------------- | ---------------------- |
| **Discovery**             | Always check specs first via board and search     | MCP or CLI             |
| **Context Economy**       | Keep specs <2000 tokens, validate before creating | tokens tool/command    |
| **SDD Workflow**          | Follow: Discover → Design → Implement → Validate  | Documented in SKILL.md |
| **Dependency Management** | Use link/unlink to track relationships            | MCP or CLI             |
| **Quality Gates**         | Validate before marking complete                  | validate tool/command  |
| **Best Practices**        | Common patterns, anti-patterns, spec structure    | Examples in SKILL.md   |
| **Onboarding**            | Standard SOP without requiring AGENTS.md bloat    | SKILL.md as primary    |

**Key Benefit**: SKILL.md serves as **primary onboarding mechanism**. Projects only need minimal AGENTS.md for custom rules.

**Note**: Skill is **methodology teaching**, not tool replacement.

## Acceptance Criteria

### Core Requirements

- [x] **SKILL.md created** - Valid Agent Skills format with frontmatter + instructions
- [x] **Methodology documented** - SDD workflow encoded in markdown
- [x] **Tool references** - Clear instructions for using MCP tools or CLI commands
- [x] **Workflow guidance** - Step-by-step instructions for each SDD phase
- [x] **Discovery behavior** - Agents learn to run board/search before creating specs
- [x] **Context economy** - Instructions explain <2000 token principle and validation
- [x] **Cross-platform compatible** - Works with Claude, Cursor, Codex, etc.

### Integration Requirements

- [x] **Compatible with existing tools** - Works with current @leanspec/mcp and CLI
- [x] **No breaking changes** - Skill is additive, doesn't replace existing tools
- [x] **Validation** - Skill passes `skills-ref validate` check
- [x] **Progressive disclosure** - SKILL.md under 500 lines, detailed content in references/

### User Experience Requirements

- [x] **Easy setup** - Users add skill to their project or global skills directory
- [x] **Auto-activation** - Agents detect LeanSpec projects and activate skill
- [x] **Shareable** - Can be version-controlled and shared via git
- [x] **Intuitive** - Agents naturally follow SDD after reading skill
- [x] **Onboarding simplification** - SKILL.md reduces AGENTS.md to <100 lines (project-specific rules only)
- [x] **Migration guide** - Documentation shows how to move from AGENTS.md to SKILL.md approach

## Out of Scope

**NOT included in initial Skill**:
- ❌ New MCP tools (use existing ones)
- ❌ CLI modifications (skill references existing commands)
- ❌ Desktop app integration (handled by spec 168)
- ❌ Complex workflow orchestration (handled by spec 171)
- ❌ Tool-specific implementations (skill is cross-platform)

**Why**: The Skill teaches methodology. Infrastructure already exists.

## Dependencies

**Foundation** (must exist):
- ✅ **@leanspec/mcp** - MCP server package (exists)
- ✅ **MCP tools** - list, view, create, update, etc. (exists)
- ✅ **Token counting** - Spec 069 (complete)
- ✅ **Validation** - Spec 018 (complete)

**Related** (coordinated but independent):
- **168-leanspec-orchestration-platform** - Desktop app orchestration (parallel)
- **171-burst-mode-orchestrator** - Ralph mode: autonomous iterative development pattern (parallel)
- **123-ai-coding-agent-integration** - Agent dispatch (exists)

## Design Considerations

### 1. Agent Skills Format

**Agent Skills specification** (https://agentskills.io/specification):
- **SKILL.md** with YAML frontmatter + Markdown body
- **Progressive disclosure**: name/description loaded first, full content on activation
- **Optional directories**: scripts/, references/, assets/
- **Cross-platform**: Works with any skills-compatible agent

**LeanSpec Skill structure**:
```
.lean-spec/skills/leanspec-sdd/
├── SKILL.md                # Main skill file
├── references/
│   ├── WORKFLOW.md         # Detailed SDD workflow
│   ├── BEST-PRACTICES.md   # Common patterns
│   └── EXAMPLES.md         # Example specs
└── scripts/
    └── validate-spec.sh    # Optional validation script
```

### 2. Agent Skill vs MCP Server

| Aspect            | MCP Server                    | Agent Skill                                 |
| ----------------- | ----------------------------- | ------------------------------------------- |
| **Level**         | Low-level tool access         | High-level methodology                      |
| **What**          | Execute commands              | Follow workflow                             |
| **Examples**      | `list`, `create`, `update`    | "Always search first", "Keep <2000 tokens"  |
| **Configuration** | Requires manual setup         | Drop SKILL.md in project or user directory  |
| **Audience**      | Tools with MCP support        | Any Agent Skills-compatible tool            |
| **Adoption**      | Claude, Cursor, Copilot, etc. | Claude, Cursor, Codex, Letta, Factory, etc. |

**Strategy**: Skill references MCP/CLI, doesn't replace them. Provides methodology layer.

### 3. SKILL.md vs AGENTS.md: Onboarding Optimization

| Aspect              | Traditional AGENTS.md              | With SKILL.md                      |
| ------------------- | ---------------------------------- | ---------------------------------- |
| **Size**            | 500-1000+ lines                    | 50-100 lines                       |
| **Content**         | SDD workflow + project rules       | Project-specific rules only        |
| **Maintenance**     | Update methodology + project rules | Update project rules only          |
| **Onboarding**      | Read entire AGENTS.md file         | SKILL.md auto-loads                |
| **Portability**     | Project-specific                   | SKILL.md works across projects     |
| **Duplication**     | Every project repeats SDD docs     | SKILL.md shared across projects    |
| **Cross-platform**  | Tool-dependent parsing             | Standard Agent Skills format       |
| **Version Control** | Must sync across projects          | SKILL.md version managed centrally |

**Key Insight**: SKILL.md becomes the **standard SDD SOP**. AGENTS.md shrinks to project-specific customizations only.

**Example AGENTS.md (before SKILL.md)**:
```markdown
# AI Agent Instructions

## LeanSpec SDD Methodology

1. Always check specs first: `lean-spec board`
2. Search before creating: `lean-spec search "query"`
3. Keep specs under 2000 tokens
4. Update status before coding: `--status in-progress`
...
[400+ lines of SDD instructions]

## Project-Specific Rules
- Use pnpm instead of npm
- All UI changes require design review
```

**Example AGENTS.md (with SKILL.md)**:
```markdown
# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

**Note**: Core SDD workflow is in `.lean-spec/skills/leanspec-sdd/SKILL.md`

## Project-Specific Rules
- Use pnpm instead of npm
- All UI changes require design review
- Deploy staging before production
```

**Migration Path**: Existing projects can gradually move SDD instructions from AGENTS.md to SKILL.md adoption.

### 4. Methodology Encoding

**SKILL.md structure** (main sections):

1. **When to Use**: Triggers for activating the skill
2. **Core Principles**: Context economy, signal-to-noise, etc.
3. **Discovery Phase**: Always check specs first (board, search)
4. **Design Phase**: Create specs following template, validate tokens
5. **Implementation Phase**: Update status, track progress, document
6. **Validation Phase**: Run validate, check completion criteria
7. **Common Patterns**: Examples of good/bad practices
8. **Tool Reference**: MCP tools and CLI commands available

**Progressive disclosure**:
- SKILL.md: ~300-400 lines (core workflow)
- references/WORKFLOW.md: Detailed step-by-step guide
- references/BEST-PRACTICES.md: Patterns and anti-patterns
- references/EXAMPLES.md: Sample specs

### 5. Skill Location

**Where to place the skill**:

| Scope       | Location                                        | Use Case                            |
| ----------- | ----------------------------------------------- | ----------------------------------- |
| **Project** | `$PROJECT_ROOT/.lean-spec/skills/leanspec-sdd/` | Team-specific SDD variations        |
| **User**    | `~/.codex/skills/leanspec-sdd/` (Codex)         | Personal preference across projects |
| **User**    | `~/.cursor/skills/leanspec-sdd/` (Cursor)       | Personal preference across projects |
| **Global**  | Bundled with lean-spec installation             | Default for all users (future)      |

**Note**: Exact paths depend on the agent tool being used. See https://agentskills.io for details.

## Implementation Strategy

### Phase 1: SKILL.md Creation (1 week)

**Goals**:
- [ ] Create SKILL.md following Agent Skills specification
- [ ] Write frontmatter (name, description, compatibility)
- [ ] Document core SDD workflow in markdown
- [ ] Create references/ directory with detailed docs

**Deliverables**:
- `.lean-spec/skills/leanspec-sdd/SKILL.md`
- `references/WORKFLOW.md`, `BEST-PRACTICES.md`, `EXAMPLES.md`
- Validate with `skills-ref validate`

### Phase 2: Tool Integration (3-5 days)

**Goals**:
- [ ] Document MCP tool usage in skill
- [ ] Provide CLI command alternatives
- [ ] Add examples of both approaches
- [ ] Test with different agent tools

**Deliverables**:
- Clear tool reference section
- Working examples with Claude, Cursor, Codex
- Compatibility notes

### Phase 3: Testing & Refinement (1 week)

**Goals**:
- [ ] Test skill with real LeanSpec projects
- [ ] Verify agents follow SDD workflow
- [ ] Measure token count of SKILL.md (<500 lines)
- [ ] Gather feedback from different agent tools

**Deliverables**:
- Test reports per agent (Claude, Cursor, Codex, etc.)
- Refinement list
- Performance metrics

### Phase 4: Distribution (3-5 days)

**Goals**:
- [ ] Bundle skill with lean-spec installation
- [ ] Create setup documentation
- [ ] Submit to community skill repositories
- [ ] Announce availability

**Deliverables**:
- Installation guide
- Blog post
- PR to agentskills/community-skills repo

## Success Metrics

| Metric                  | Target                                  | Measurement                        |
| ----------------------- | --------------------------------------- | ---------------------------------- |
| **Skill adoption**      | 100+ projects using skill in 3 months   | Git analytics                      |
| **Agent compliance**    | >70% of sessions follow SDD workflow    | Session analysis (where available) |
| **Context economy**     | >75% of specs <2000 tokens              | `tokens` tool data                 |
| **Discovery rate**      | >80% check board/search before creating | Tool usage logs                    |
| **Cross-platform**      | Works with 3+ agent tools               | Testing verification               |
| **AGENTS.md reduction** | <100 lines per project (vs 500+ before) | File size comparison               |
| **Onboarding time**     | <5 min to understand SDD (vs 30+ min)   | User feedback                      |

## Technical Challenges

### Challenge 1: Agent Behavior Variance

**Issue**: Different agents may interpret skills differently.

**Mitigation**:
1. Follow Agent Skills specification strictly
2. Test with multiple agents (Claude, Cursor, Codex)
3. Use clear, explicit instructions in SKILL.md
4. Provide examples in references/

### Challenge 2: Tool Detection

**Issue**: Skill needs to detect if MCP or CLI is available.

**Mitigation**:
- Document both MCP and CLI approaches in skill
- Include compatibility field in frontmatter
- Provide graceful degradation instructions

### Challenge 3: Methodology Drift

**Issue**: Agents might not consistently follow skill instructions.

**Mitigation**:
- Strong, explicit workflow instructions
- Include "When to Use" section
- Provide positive/negative examples
- Continuous refinement based on usage

## Open Questions

1. **Should we bundle the skill with lean-spec installation?**
   - Or distribute separately via GitHub?
   - Pros/cons of each approach

2. **How do we handle skill updates?**
   - Version in metadata field
   - Migration path for existing users

3. **What's the best skill location?**
   - Project-level (.lean-spec/skills/)?
   - User-level (~/.codex/skills/)?
   - Both with override behavior?

4. **How detailed should references/ be?**
   - Balance between completeness and token usage
   - Progressive disclosure strategy

5. **Should we create tool-specific variants?**
   - One skill for all agents?
   - Or optimize for each (Claude, Cursor, Codex)?

## Marketing & Positioning

### Key Messages

**For Agent Skills Directory/Community**:
- "Teach agents systematic spec-driven development"
- "Works with Claude, Cursor, Codex, and more"
- "Drop-in methodology for AI-powered teams"

**For LeanSpec Users**:
- "Eliminate 500+ line AGENTS.md files - use SKILL.md as standard SOP"
- "Onboard new team members in <5 minutes"
- "Share SDD workflow across your team via Agent Skills"
- "Works with any Agent Skills-compatible tool"
- "Addon feature - complements existing MCP and CLI"

### Value Proposition

**For Individual Developers**:
- Quick setup: drop SKILL.md in project or user directory
- Agents automatically learn SDD workflow
- No need to maintain massive AGENTS.md files
- Works across multiple AI coding tools

**For Teams**:
- **Onboarding revolution**: 5-minute ramp-up vs 30+ minutes reading AGENTS.md
- AGENTS.md shrinks from 500+ lines to <100 lines (project-specific rules only)
- Version-controlled methodology via standard SKILL.md
- Consistent development practices across all projects
- New team members instantly productive

**For Organizations**:
- **Reduce onboarding costs**: Standard SOP via SKILL.md, not per-project documentation
- Portable skill definition works across multiple agent platforms
- Centralized methodology updates (update SKILL.md once, affects all projects)
- Measurable quality improvements via spec validation

## Related Specs

**Foundation**:
- **102-mcp-wrapper-package**: @leanspec/mcp distribution (complete)
- **069-token-counting-utils**: Context economy measurement (complete)
- **018-spec-validation**: Quality gates (complete)
- **117-simplify-template-system**: Template structure (complete)

**Parallel Work**:
- **168-leanspec-orchestration-platform**: Desktop app (separate concern)
- **171-burst-mode-orchestrator**: Iterative pattern (separate concern)

## Next Steps

1. **Research Anthropic Skills API/format** - Understand technical requirements
2. **Create Skill prototype** - Build minimal working Skill
3. **Test with real projects** - Validate SDD workflow effectiveness
4. **Gather feedback** - Iterate on methodology encoding
5. **Launch publicly** - Position LeanSpec as methodology, not just tooling

## Notes

### Why Agent Skills Matter

Agent Skills solve a **discoverability and portability problem**:

**Current state**:
- Users must manually configure tools (MCP server)
- Must learn methodology separately (AGENTS.md)
- Agent-specific setup (Claude vs Cursor vs Codex)
- Methodology locked in project docs

**With Agent Skills**:
- Drop SKILL.md in project → all compatible agents understand SDD
- Portable across tools (Claude, Cursor, Codex, Letta, Factory, etc.)
- Version-controlled methodology that travels with code
- Easy to share: just commit the skill folder

### Positioning

Agent Skills are an **addon feature**, not core infrastructure:
- **Core**: MCP server + CLI for spec operations
- **Addon**: Agent Skill teaches methodology to compatible agents
- **Benefit**: Users without skills can still use MCP/CLI directly

### Relationship to Spec 168

**Spec 168**: Desktop app as orchestration frontend  
**This spec**: Agent Skill teaching SDD methodology

**Synergy**:
- Skill teaches agents the methodology
- Desktop app provides GUI for visualization/management
- MCP connects them
- User gets complete solution

### Philosophical Alignment

This spec aligns with **LeanSpec First Principles** (spec 049):
1. **Context Economy**: Built into skill instructions (<2000 tokens)
2. **Signal-to-Noise**: Clear workflow guidance, no fluff
3. **Intent Over Implementation**: Skill teaches WHY, not just HOW
4. **Bridge the Gap**: Skills = human+AI shared understanding
5. **Progressive Disclosure**: SKILL.md + references/ structure

---

**Key Insight**: Agent Skills provide a **standard way** to share methodology across the AI coding ecosystem. This increases LeanSpec's reach beyond tools with MCP support.