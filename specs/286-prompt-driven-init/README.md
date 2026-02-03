---
status: planned
created: 2026-02-03
priority: medium
tags:
- init
- dx
- ai-agents
- ux
depends_on:
- 224-ai-chat-configuration-improvements
created_at: 2026-02-03T02:44:13.479026048Z
updated_at: 2026-02-03T02:55:31.404056212Z
---

# Prompt-Driven Project Bootstrap

## Problem

Starting a new project with LeanSpec requires multiple manual steps: running `lean-spec init`, creating specs, writing project descriptions. This friction slows down the critical moment when ideas are fresh and motivation is high.

**Current flow:**
```bash
lean-spec init        # Set up scaffolding
lean-spec create x    # Create first spec manually
# Manually write problem, solution, plan...
```

**Desired flow:**
```bash
lean-spec init "a CLI tool for managing kubernetes secrets with encryption"
# → Project scaffolded + vision spec + AGENTS.md all generated
```

## Builds On Prior Work

This spec leverages existing AI infrastructure:

| Spec | Status | What We Use |
|------|--------|-------------|
| [224-ai-chat-configuration-improvements](../224-ai-chat-configuration-improvements/) | ✅ Complete | Multi-provider AI SDK (OpenAI, Anthropic, etc.), ConfigManager, ProviderFactory |
| [126-ai-tool-auto-detection](../126-ai-tool-auto-detection/) | ✅ Complete | AI tool detection during init |
| [226-agent-skills-init-integration](../226-agent-skills-init-integration/) | ✅ Complete | Skills auto-installation |
| [267-ai-session-runner-configuration](../267-ai-session-runner-configuration/) | 🔄 In Progress | Runner configuration patterns (inspiration) |

**Key insight:** Spec 224 provides a complete multi-provider AI infrastructure with `ConfigManager`, `ProviderFactory`, and support for OpenAI, Anthropic, Deepseek, OpenRouter. We reuse this instead of building a new "LeanSpec Models API".

## Solution

Enable one-line project bootstrapping from natural language prompts, supporting various levels of idea maturity:

```bash
# Quick idea capture (NEW - this spec)
lean-spec init "a CLI tool for managing kubernetes secrets with encryption"

# From prepared notes (NEW - this spec)
lean-spec init --from ideas.md

# Guided conversation (NEW - this spec)
lean-spec init --guided
```

## User Scenarios

### Scenario 1: Fresh Idea (No Prior Planning)
User has a spontaneous idea, wants to capture it immediately.

**Input:** `lean-spec init "description of project idea"`

**Expected behavior:**
- Generate project name from prompt
- Create initial spec capturing idea + high-level scope
- Set up LeanSpec scaffolding with sensible defaults
- Bake project context into AGENTS.md

### Scenario 2: Refined Idea (With Preliminary Design)
User has notes, design docs, or conversation transcripts.

**Input options:**
```bash
lean-spec init --from ideas.md
lean-spec init --from-url https://gist.github.com/...
lean-spec init < design-notes.txt
```

**Expected behavior:**
- Parse input document for requirements, constraints, decisions
- Generate structured specs from content
- Preserve user's terminology and priorities
- Create dependency relationships if multiple features detected

### Scenario 3: Guided Conversation
User wants AI assistance to refine the idea interactively.

**Input:** `lean-spec init --guided`

**Expected behavior:**
- Interactive Q&A to clarify scope, constraints, goals
- Progressive refinement of project vision
- Generate specs based on conversation outcomes

### Scenario 4: Additional Sources (Future)
- **Conversation transcript** - Import Claude/ChatGPT discussion as context
- **GitHub Issue/Discussion** - Bootstrap from issue URL
- **Voice memo/transcript** - Low-fidelity brain dump → structured specs
- **Existing codebase** - Analyze code to generate initial spec backlog

## Proposed CLI Interface

```bash
# Quick one-liner (AI generates structure)
lean-spec init "description of project idea"

# From file (structured or unstructured)
lean-spec init --from <file>

# From clipboard
lean-spec init --from-clipboard

# Interactive AI conversation
lean-spec init --guided

# Hybrid: one-liner + file for context  
lean-spec init "todo app" --context design-notes.md

# Specify AI provider (optional)
lean-spec init "idea" --provider openai
```

## Design Considerations

### AI Integration
- Use configurable AI provider (OpenAI, Anthropic, local models)
- Graceful fallback if AI unavailable (manual template)
- Cache/store original prompt for reference

### Generated Artifacts
1. **Project scaffolding** - specs/, .lean-spec/, AGENTS.md
2. **Vision spec** - High-level project overview (spec 001)
3. **Initial backlog** - Feature specs derived from prompt (optional)
4. **AGENTS.md** - Pre-populated with project context

### Non-Breaking Integration
- Existing `lean-spec init` without arguments works as before
- Prompt argument triggers AI-assisted flow
- All flags remain compatible

### Token Economy
- Keep generated specs under 2000 tokens
- Split large ideas into multiple focused specs
- Use progressive disclosure pattern

## Implementation Phases

### Phase 1: One-Line Prompt
- [ ] Accept positional string argument as project description
- [ ] Generate project name from description
- [ ] Create vision/overview spec from prompt
- [ ] Integrate with existing init scaffolding

### Phase 2: File/URL Input
- [ ] `--from <file>` flag for local files
- [ ] `--from-url <url>` for remote content
- [ ] `--from-clipboard` for clipboard content
- [ ] Parse markdown, plain text, JSON formats

### Phase 3: Guided Mode
- [ ] `--guided` flag for interactive conversation
- [ ] Multi-turn refinement loop
- [ ] Generate specs from conversation summary

### Phase 4: Advanced Sources
- [ ] GitHub issue import
- [ ] Conversation transcript parsing
- [ ] Codebase analysis (existing project bootstrap)

## Acceptance Criteria

- [ ] `lean-spec init "my idea"` creates working project with vision spec
- [ ] Generated specs are valid and pass `lean-spec validate`
- [ ] Original prompt preserved in spec or config
- [ ] Works offline with graceful degradation
- [ ] Existing init behavior unchanged when no prompt given

## Open Questions

1. Should we generate multiple specs or just one vision spec?
2. How to handle API key not configured? (Prompt user or skip AI generation?)
3. Should `--guided` mode use streaming or batch responses?
4. Minimum prompt length before triggering AI? (Avoid accidental API calls)

## References

- Current init implementation: `rust/leanspec-cli/src/commands/init.rs`
- Spec template: `rust/leanspec-cli/templates/spec-template.md`
- **AI infrastructure:** [224-ai-chat-configuration-improvements](../224-ai-chat-configuration-improvements/) - Multi-provider support, ConfigManager
- **Prior art:** [126-ai-tool-auto-detection](../126-ai-tool-auto-detection/) - AI tool detection

## Technical Notes

### Leveraging Existing AI Infrastructure (Spec 224)

Spec 224 already provides:
- **ConfigManager** - Loads `~/.leanspec/chat-config.json` with hot-reload
- **ProviderFactory** - Creates AI SDK providers (OpenAI, Anthropic, Deepseek, OpenRouter)
- **Environment variable interpolation** - `${OPENAI_API_KEY}` syntax
- **Zod validation** - Config schema validation
- **Multi-provider support** - Switch providers without code changes

### Implementation Approach

```rust
// In init.rs - reuse chat-config infrastructure

async fn generate_vision_spec(prompt: &str, config: &ChatConfig) -> Result<String> {
    // 1. Get default provider from chat-config
    let provider = config.get_default_provider()?;
    
    // 2. Use AI SDK to generate spec content
    let ai = ProviderFactory::create(&provider);
    
    // 3. Call LLM with spec generation prompt
    let system_prompt = include_str!("../templates/vision-spec-prompt.md");
    let response = ai.generate(system_prompt, prompt).await?;
    
    // 4. Parse response into spec structure
    parse_spec_response(&response)
}
```

### Fallback Chain

1. **Has configured provider** → Use AI to generate spec
2. **No API key configured** → Prompt: "Add API key to enable AI generation, or press Enter to skip"
3. **User skips AI** → Create blank spec template with prompt as description
4. **API failure** → Fall back to blank template with error message

### Config Location

Reuse existing chat config at `~/.leanspec/chat-config.json`:

```json
{
  "providers": [
    {
      "id": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "models": [{ "id": "gpt-4o-mini", "default": true }]
    }
  ],
  "settings": {
    "defaultProviderId": "openai"
  }
}
```

### Vision Spec Template

The AI generates content following this structure:

```markdown
---
status: planned
created: {date}
tags:
  - vision
  - bootstrap
---

# {Project Name}

## Overview

{AI-generated project description}

## Goals

{AI-generated goals from prompt analysis}

## Non-Goals

{AI-generated scope boundaries}

## Initial Features

{AI-generated feature list}

## Open Questions

{AI-generated questions to explore}
```
