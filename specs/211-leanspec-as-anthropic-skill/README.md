---
status: planned
created: 2026-01-12
priority: high
tags:
- skills
- anthropic
- integration
- sdd
- methodology
- orchestration
created_at: 2026-01-12T13:55:05.053133Z
updated_at: 2026-01-12T13:55:05.053133Z
---

## Overview

### Problem & Motivation

**Anthropic Skills** is a new concept that allows Claude to learn reusable capabilities - expertise, procedures, and best practices that can be applied automatically. Currently, users must configure LeanSpec via MCP, set up AGENTS.md, and manually teach AI agents about SDD methodology in every conversation.

**The Opportunity**: Package LeanSpec's SDD methodology as an **Anthropic Skill** that:
- Teaches Claude the complete SDD workflow automatically
- Enables spec-driven development without manual configuration
- Makes LeanSpec's orchestration capabilities discoverable
- Positions LeanSpec as a **systematic methodology**, not just tooling

### What Are Anthropic Skills?

Based on research:
- **Skills** teach Claude how to work with specific tools, procedures, and organizational standards
- They're **reusable capabilities** that persist across conversations
- Examples: Box (file transformation), Notion (workflow integration), Rakuten (spreadsheet processing)
- Skills appear in Claude's capabilities settings and can be enabled/shared
- They use **MCP under the hood** but provide higher-level methodology abstraction

### Strategic Vision

**Current**: LeanSpec as MCP tools (list, view, create, update, etc.)  
**Future**: LeanSpec as **SDD Skill** - a complete methodology for AI-assisted development

```
┌─────────────────────────────────────────────────────────────┐
│                  LeanSpec as Skill                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "Enable spec-driven development (SDD) methodology"         │
│                                                             │
│  When activated, Claude automatically:                      │
│  • Discovers existing specs via MCP                         │
│  • Follows SDD lifecycle (create → implement → validate)    │
│  • Enforces context economy (<2000 tokens per spec)         │
│  • Uses burst mode for iterative development               │
│  • Tracks dependencies and relationships                    │
│  • Maintains spec-code alignment                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## High-Level Approach

### 1. Skill Definition Structure

**Skill Manifest** (conceptual):
```json
{
  "name": "leanspec-sdd",
  "version": "1.0.0",
  "displayName": "LeanSpec Spec-Driven Development",
  "description": "Systematic AI-assisted development using lightweight specifications",
  "capabilities": [
    "spec-management",
    "context-economy",
    "sdd-workflow",
    "burst-mode-orchestration",
    "dependency-tracking"
  ],
  "mcp": {
    "server": "@leanspec/mcp",
    "required": true
  },
  "methodology": {
    "framework": "Spec-Driven Development (SDD)",
    "principles": [
      "Context Economy: Keep specs <2000 tokens",
      "Signal-to-Noise: Every word informs decisions",
      "Intent Over Implementation: Capture WHY",
      "Progressive Disclosure: Add complexity only when needed"
    ],
    "workflow": ["discover", "design", "implement", "validate", "complete"]
  },
  "prompts": {
    "systemPrompt": "You are an expert in Spec-Driven Development...",
    "workflowPrompts": { ... }
  }
}
```

### 2. Integration Points

**MCP Foundation** (already exists):
- All spec operations (list, view, create, update, link, etc.)
- Board, stats, search, validation
- Token counting and context management

**Skill Layer** (new):
- **Methodology teaching**: Automatic SDD workflow guidance
- **Workflow orchestration**: Multi-phase development patterns
- **Quality gates**: Enforces context economy, validation
- **Burst mode integration**: Connects to spec 171 patterns

### 3. User Experience

**Before (MCP only)**:
```
User: "Let's implement feature X"
Claude: "Should I create a spec first?"
User: "Yes, follow SDD methodology..."
Claude: [needs to be told what SDD is]
```

**After (Skill enabled)**:
```
User: "Let's implement feature X"
Claude: [Automatically discovers specs via MCP]
Claude: "I see this is a LeanSpec project. Let me check existing specs..."
Claude: [Runs board, search]
Claude: "No existing spec found. I'll create spec 211-feature-x following SDD principles..."
Claude: [Creates spec, validates token count, links dependencies]
Claude: "Spec created. Ready to implement via burst mode?"
```

### 4. Skill Capabilities

| Capability                | What It Teaches Claude                                       | Enabled By                  |
| ------------------------- | ------------------------------------------------------------ | --------------------------- |
| **Discovery**             | Always check specs first via `board` and `search`            | MCP tools                   |
| **Context Economy**       | Keep specs <2000 tokens, validate before creating            | `tokens` tool + methodology |
| **SDD Workflow**          | Follow: Discover → Design → Implement → Validate             | Skill prompts               |
| **Dependency Management** | Use `link`/`unlink` to track relationships                   | MCP tools                   |
| **Ralph Mode**            | Autonomous iterative AI development loop (also "burst mode") | Spec 171 integration        |
| **Quality Gates**         | Validate before marking complete                             | `validate` tool             |

## Acceptance Criteria

### Core Requirements

- [ ] **Skill manifest defined** - Clear structure for LeanSpec Skill
- [ ] **Methodology documented** - SDD principles encoded for Claude
- [ ] **MCP integration** - Skill automatically connects to @leanspec/mcp
- [ ] **Workflow prompts** - System prompts for each SDD phase
- [ ] **Discovery behavior** - Claude automatically runs board/search before creating specs
- [ ] **Context economy enforcement** - Warns when specs exceed 2000 tokens
- [ ] **Ralph mode awareness** - Claude knows about autonomous iterative development pattern (also called "burst mode")

### Integration Requirements

- [ ] **Compatible with existing MCP** - Works with current @leanspec/mcp package
- [ ] **No breaking changes** - Skill is additive, doesn't replace MCP tools
- [ ] **Orchestration ready** - Connects to spec 168 desktop app vision
- [ ] **Ralph mode ready** - Supports spec 171 autonomous iterative pattern (Ralph/burst mode)

### User Experience Requirements

- [ ] **Zero configuration** - Enabling skill auto-configures SDD methodology
- [ ] **Discoverable** - Appears in Claude's Skills settings
- [ ] **Shareable** - Can be shared within organizations
- [ ] **Intuitive** - Claude naturally follows SDD without being told

## Out of Scope

**NOT included in initial Skill**:
- ❌ Desktop app integration (handled by spec 168)
- ❌ Ralph mode implementation (handled by spec 171 - autonomous loop pattern)
- ❌ New MCP tools (use existing ones)
- ❌ VS Code extension (separate integration)
- ❌ Alternative AI tools (Cursor, etc.) - Claude only

**Why**: The Skill teaches methodology, infrastructure already exists.

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

### 1. How Are Skills Defined?

**Research findings**: Skills appear to use MCP as infrastructure but provide higher-level abstractions:
- MCP = Low-level tools (list, view, create)
- Skill = High-level methodology (when to use tools, in what order, following what principles)

**LeanSpec Skill structure**:
```
Skill Definition
├── Metadata (name, version, description)
├── MCP Connection (points to @leanspec/mcp)
├── Methodology (SDD principles and workflow)
├── System Prompts (teach Claude SDD patterns)
└── Quality Gates (context economy, validation rules)
```

### 2. Skill vs MCP Server

| Aspect            | MCP Server                     | LeanSpec Skill                             |
| ----------------- | ------------------------------ | ------------------------------------------ |
| **Level**         | Low-level tool access          | High-level methodology                     |
| **What**          | Execute commands               | Follow workflow                            |
| **Examples**      | `list`, `create`, `update`     | "Always search first", "Keep <2000 tokens" |
| **Configuration** | Requires manual setup          | Auto-configures on enable                  |
| **Audience**      | All AI tools (Claude, Copilot) | Claude only (Skills are Claude-specific)   |

**Strategy**: Skill wraps MCP, doesn't replace it. Other tools still use MCP directly.

### 3. Methodology Encoding

**SDD Workflow Prompts**:

**Phase 1: Discovery**
```
Before creating any spec, ALWAYS:
1. Run `board` to see project state
2. Run `search` with relevant keywords
3. Check for related/duplicate specs
4. Review dependencies of related specs

Only create new spec if truly needed.
```

**Phase 2: Design**
```
When creating a spec:
1. Use standard template (from spec 117)
2. Keep total <2000 tokens (run `tokens` to verify)
3. Focus on WHY over HOW
4. Define clear acceptance criteria
5. Link dependencies with `link` tool

Validate before creating: `validate --check-deps`
```

**Phase 3: Implementation**
```
When implementing:
1. Mark spec as in-progress: `update <spec> --status in-progress`
2. For complex specs, suggest burst mode (spec 171)
3. Track progress via checklist items
4. Document decisions in spec as you go

Don't leave specs in limbo.
```

**Phase 4: Validation**
```
Before marking complete:
1. Run `validate <spec>` to check quality
2. Verify all checklist items checked
3. Check token count still <2000
4. Ensure all acceptance criteria met

Use `update <spec> --status complete` only when verified.
```

### 4. Context Economy Enforcement

**Built-in checks**:
```javascript
// Skill behavior: Automatic token checking
if (action === 'create' && content.length > estimatedTokens(2000)) {
  warn("This spec may exceed 2000 tokens. Consider splitting.");
  suggest("Run `tokens` to verify exact count.");
}

// Before marking complete
if (action === 'update' && status === 'complete') {
  const tokenCount = await runTool('tokens', { spec });
  if (tokenCount > 2000) {
    warn("Spec exceeds optimal token count (2000).");
    suggest("Consider refactoring before completing.");
  }
}
```

### 5. Burst Mode Integration

**Skill awareness**:
```
When user says "implement spec X":
- Suggest Ralph mode (autonomous loop) for iterative development
- Explain: "I can implement this using Ralph mode - autonomous iterative test-driven development"
- Offer: "This will automatically iterate until tests pass and spec is verified"
- Reference: Based on Geoffrey Huntley's Ralph technique (ghuntley.com/ralph)

Connect to spec 171 workflow without reimplementing it.
```

## Implementation Strategy

### Phase 1: Skill Definition Research (1-2 weeks)

**Goals**:
- [ ] Understand exact Skill definition format (contact Anthropic if needed)
- [ ] Research similar Skills (Box, Notion, Rakuten patterns)
- [ ] Define LeanSpec Skill manifest structure
- [ ] Document methodology encoding approach

**Deliverables**:
- Skill specification document
- Example Skill JSON/YAML manifest
- System prompt templates

### Phase 2: Methodology Encoding (1-2 weeks)

**Goals**:
- [ ] Encode SDD principles in Skill format
- [ ] Create workflow prompts for each phase
- [ ] Define quality gates and validation rules
- [ ] Write context economy enforcement logic

**Deliverables**:
- Complete methodology document
- Workflow prompt library
- Quality gate definitions

### Phase 3: MCP Integration (1 week)

**Goals**:
- [ ] Connect Skill to @leanspec/mcp
- [ ] Test tool invocation from Skill prompts
- [ ] Verify automatic discovery behavior
- [ ] Ensure no MCP breaking changes

**Deliverables**:
- Integration layer
- Compatibility tests
- Documentation

### Phase 4: Testing & Refinement (2 weeks)

**Goals**:
- [ ] Test Skill with real projects
- [ ] Verify Claude follows SDD workflow naturally
- [ ] Measure context economy compliance
- [ ] Gather user feedback

**Deliverables**:
- Test reports
- Refinement backlog
- User feedback summary

### Phase 5: Launch (1 week)

**Goals**:
- [ ] Publish Skill to Anthropic Skills marketplace
- [ ] Create documentation and tutorials
- [ ] Marketing: Position LeanSpec as methodology, not just tools
- [ ] Monitor adoption and usage

**Deliverables**:
- Published Skill
- Launch blog post
- Tutorial videos
- Analytics dashboard

## Success Metrics

| Metric              | Target                                    | Measurement          |
| ------------------- | ----------------------------------------- | -------------------- |
| **Skill adoption**  | 500+ enables in 3 months                  | Claude analytics     |
| **SDD compliance**  | >80% of conversations follow workflow     | Session analysis     |
| **Context economy** | >75% of specs <2000 tokens                | `tokens` tool data   |
| **Discovery rate**  | >90% run `board`/`search` before creating | MCP logs             |
| **Completion rate** | >60% of in-progress specs completed       | Spec status tracking |

## Technical Challenges

### Challenge 1: Skill Format Unknown

**Issue**: Anthropic hasn't published official Skill definition format yet.

**Mitigation**:
1. Research existing Skills (Box, Notion) via Claude
2. Contact Anthropic for early access / documentation
3. Start with conceptual design, adapt format when available

### Challenge 2: Claude-Only

**Issue**: Skills only work with Claude, not other AI tools.

**Mitigation**:
- Keep MCP server as universal interface
- Skills are additive layer for Claude users
- Other tools continue using MCP directly

### Challenge 3: Methodology Drift

**Issue**: Claude might not follow Skill prompts consistently.

**Mitigation**:
- Strong system prompts with explicit rules
- Quality gates that block non-compliant actions
- Continuous refinement based on usage data

## Open Questions

1. **What is the exact Skill definition format?**
   - Need official documentation from Anthropic
   - May need early access program

2. **How are Skills distributed?**
   - Skills marketplace?
   - Private sharing?
   - Public registry?

3. **Can Skills be versioned?**
   - Important for methodology evolution
   - Backward compatibility concerns

4. **How do Skills interact with custom instructions?**
   - Do they override?
   - Do they merge?
   - Priority handling?

5. **Can Skills trigger desktop apps?**
   - Integration with spec 168 orchestration?
   - Deep linking from Skill to desktop?

6. **Are Skills mandatory or optional?**
   - Should MCP still work without Skill?
   - How to encourage Skill adoption?

## Marketing & Positioning

### New Messaging

**Current**: "LeanSpec - Lightweight spec management for AI-powered development"

**New**: "LeanSpec - The SDD Methodology Skill for Claude"

**Tagline**: "Teach Claude systematic development, not just tools"

### Value Proposition

**For Individual Developers**:
- Zero configuration - enable Skill, start coding
- Claude automatically follows SDD best practices
- No need to explain methodology every conversation

**For Teams**:
- Consistent development methodology across team
- Shareable Skill = shared practices
- Quality gates built-in

**For Organizations**:
- Standardized AI-assisted development
- Measurable code quality improvements
- Reduced onboarding time for AI tools

### Competitive Advantage

**vs Manual Prompting**: Automatic, consistent, no memory
**vs Custom Instructions**: Structured workflow, not just personality
**vs Pure MCP**: Methodology, not just tools
**vs Other SDD Tools**: Native Claude integration, AI-first

## Related Specs

**Foundation**:
- **123-ai-coding-agent-integration**: Agent dispatch (exists)
- **069-token-counting-utils**: Context economy measurement (complete)
- **018-spec-validation**: Quality gates (complete)

**Orchestration Vision**:
- **168-leanspec-orchestration-platform**: Desktop app (parallel)
- **171-burst-mode-orchestrator**: Iterative pattern (parallel)

**Supporting**:
- **102-mcp-wrapper-package**: @leanspec/mcp distribution (complete)
- **117-simplify-template-system**: Template structure (complete)

## Next Steps

1. **Research Anthropic Skills API/format** - Understand technical requirements
2. **Create Skill prototype** - Build minimal working Skill
3. **Test with real projects** - Validate SDD workflow effectiveness
4. **Gather feedback** - Iterate on methodology encoding
5. **Launch publicly** - Position LeanSpec as methodology, not just tooling

## Notes

### Why This Matters Strategically

LeanSpec has excellent infrastructure (MCP, CLI, desktop app) but **discoverability is low**. Skills solve this:

**Current problem**:
- Users must manually configure MCP
- Must learn SDD methodology separately
- Must remember to follow workflow
- Each conversation starts from scratch

**Skills solution**:
- One-click enable in Claude settings
- Methodology automatically applied
- Consistent behavior across conversations
- Shareable within organizations

### Relationship to Spec 168

**Spec 168**: Desktop app as orchestration frontend  
**This spec**: Methodology as Claude Skill

**Synergy**:
- Skill teaches Claude the methodology
- Desktop app provides GUI for execution
- MCP connects them
- User gets complete solution

### Philosophical Alignment

This spec aligns with **LeanSpec First Principles** (spec 049):
1. **Context Economy**: Built into Skill validation
2. **Signal-to-Noise**: Enforced via prompts
3. **Intent Over Implementation**: Core of SDD teaching
4. **Bridge the Gap**: Skills = human+AI shared understanding
5. **Progressive Disclosure**: Workflow guides complexity

---

**Key Insight**: Skills transform LeanSpec from "a tool Claude can use" to "a methodology Claude knows". This is the difference between giving Claude a hammer vs teaching it carpentry.