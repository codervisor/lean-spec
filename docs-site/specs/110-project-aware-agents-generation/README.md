---
status: planned
created: '2025-11-20'
tags:
  - init
  - templates
  - ai-agents
  - dx
priority: high
created_at: '2025-11-20T06:23:35.088Z'
related:
  - 121-mcp-first-agent-experience
  - 072-ai-agent-first-use-workflow
  - 122-ai-agent-deps-management-fix
updated_at: '2025-11-26T06:04:18.723Z'
depends_on:
  - 073-template-engine-agents-md
  - 086-template-component-deduplication
---

# Context-Aware AGENTS.md Generation for Init

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-20 · **Tags**: init, templates, ai-agents, dx

**Project**: lean-spec  
**Team**: Core Development

## Overview

### Problem: Generic AGENTS.md Doesn't Fit All Projects

When users run `lean-spec init` on their projects, the generated `AGENTS.md` is **too generic** and misses critical project-specific context:

**Example: agent-relay (Self-hosted AI orchestration platform)**
- ❌ **Missing**: How to run agent-relay locally (docker-compose, env vars, API keys)
- ❌ **Missing**: Security guidance (API key exposure, network access, authentication)
- ❌ **Missing**: MCP server config for local deployment (port, auth, environment)
- ❌ **Missing**: Project purpose and architecture context
- ✅ **Has**: Generic LeanSpec principles (correct but insufficient)

**Current Generated Content**:

    ## Project: agent-relay

    Lightweight spec methodology for AI-powered development.

    ## Core Rules
    1. Read README.md first
    2. Check specs/
    ...

**What It Should Have**:

    ## Project: agent-relay

    AgentRelay is a lightweight, self-hosted orchestration platform for AI coding agents.

    ## Security & Privacy

    ⚠️ **CRITICAL**: This is a self-hosted service handling API keys and agent execution.
    - Store API keys in environment variables (never commit)
    - Run behind authentication (network access controls)
    - Default: localhost-only (expose cautiously)
    - TLS required for remote access

    ## Development Setup

    Start the local server:
    bash
    export AGENT_RELAY_API_KEY=your-key
    docker-compose up  # or npm run dev
    # Server: http://localhost:4000


    ## MCP Integration

    Configure your AI tool to connect:
    json
    {
      "mcpServers": {
        "agent-relay": {
          "command": "node",
          "args": ["./bin/mcp-client.js"],
          "env": {
            "AGENT_RELAY_URL": "http://localhost:4000",
            "AGENT_RELAY_API_KEY": "${AGENT_RELAY_API_KEY}"
          }
        }
      }
    }


    ## Core Rules
    1. Read README.md first (understand agent-relay architecture)
    2. Check specs/ (orchestration patterns, security decisions)
    ...

### Why This Matters

**Impact on AI Agent Experience**:
- 😞 **Without context**: Agent doesn't know how to run/test the project
- 😞 **Without security**: Agent may suggest insecure patterns
- 😞 **Without MCP config**: Agent can't help with integration
- 😃 **With context**: Agent provides project-appropriate guidance

**User Frustration**:
- Must manually edit `AGENTS.md` after `lean-spec init`
- High-value information (README, architecture) not leveraged
- Generic guidance feels disconnected from actual project needs

### Root Causes

1. **Template System Design**: Current templates use static components with only `{project_name}` substitution
2. **No README Analysis**: Init doesn't read/parse project README.md for context
3. **No Project Type Detection**: Can't distinguish web app vs CLI vs library vs orchestration platform
4. **No Security Context**: Doesn't understand if project handles secrets, network access, etc.
5. **MCP Config Generation**: No project-specific MCP examples (ports, env vars, auth)

### Success Criteria

After `lean-spec init` on any project:
- ✅ `AGENTS.md` includes project purpose from README.md
- ✅ Development setup steps extracted from README.md
- ✅ Security guidance for projects handling secrets/auth
- ✅ MCP configuration examples with correct ports/env vars
- ✅ Project-specific examples in core rules ("understand X architecture")
- ✅ Generic LeanSpec principles retained (not replaced)

## Design

### Approach: README-Aware Template Augmentation

**High-Level Flow**:

    lean-spec init
      ↓
    1. Detect project type (web, CLI, library, service, orchestration)
    2. Parse README.md for:
       - Project description (first paragraph)
       - Development setup (## Dev, ## Setup, ## Getting Started)
       - Dependencies (package.json, docker-compose.yml)
       - Security keywords (API keys, auth, secrets, tokens)
    3. Generate context-aware sections
    4. Compose final AGENTS.md:
       - Project-specific header
       - Security section (if needed)
       - Development setup (if found)
       - MCP config (for services)
       - Generic LeanSpec principles

### Project Type Detection

**Heuristics** (check in order):
1. **Orchestration Platform**: Keywords in README (orchestration, agent relay, multi-agent)
2. **Web Service**: Has `docker-compose.yml` or port bindings
3. **CLI Tool**: Has `bin/` folder or CLI keywords in README
4. **Library**: Has `src/`, no `bin/`, no web server
5. **Documentation**: Only markdown files
6. **Unknown**: Fall back to generic template

**What Changes Per Type**:
| Type | Security | Dev Setup | MCP Config | Examples |
|------|----------|-----------|------------|----------|
| Orchestration | ✅ High (secrets) | ✅ Docker/env | ✅ Port/auth | Agent patterns |
| Web Service | ✅ Medium (auth) | ✅ Dev server | ✅ API endpoint | REST/GraphQL |
| CLI Tool | ⚠️ Low | ✅ Build/install | ❌ | Command patterns |
| Library | ❌ | ✅ Dev setup | ❌ | API usage |

### README.md Parsing Strategy

**Primary Approach: LeanSpec Models API**

Uses available LLM providers in priority order (with user permission):

1. **LeanSpec Models** (preferred - free for all users)
   - Official LeanSpec API endpoint
   - Backend model agnostic (GitHub Models, OpenAI, Anthropic, local models, etc.)
   - Initially powered by GitHub Models (free tier), can switch backends as needed
   - No configuration needed - works out of the box
   - Privacy-focused: README analysis only, no data retention
   - Rate-limited per user (fair usage)
   
2. **User API Keys** (detected from environment)
   - `OPENAI_API_KEY` → User selects model (gpt-5-mini, gpt-5.1, etc.)
   - `ANTHROPIC_API_KEY` → User selects model (claude-3-5-haiku, claude-3-5-sonnet, etc.)
   - **Requires explicit permission**: Prompt user during init
   - **Model selection**: Interactive prompt or config file preference
   - User can opt-out (falls back to regex)
   - Useful when LeanSpec Models rate-limited or unavailable
   
3. **Fallback: Simple Regex Extraction**
   - No LLM available or user declined
   - Find first paragraph (project description)
   - Look for setup sections via headers
   - Extract code blocks, security keywords
   - Still functional, just less smart

**LeanSpec Models API**:
- Endpoint: `https://api.lean-spec.dev/v1/analyze-project`
- Method: POST with README content + project files list
- Response: Structured ProjectContext JSON
- Free tier: 100 requests/day per IP
- No auth required for basic usage

**Permission Flow**:

    $ lean-spec init
    
    ✓ Analyzing project with LeanSpec Models...
    ✓ Generated project-specific AGENTS.md
    
    # Or if rate-limited:
    
    ⚠ LeanSpec Models rate limit reached
    Detected API key: OPENAI_API_KEY
    
    Use your OpenAI API key as fallback?
    Select model:
      1. gpt-5-mini (fastest, ~$0.002/analysis)
      2. gpt-5.1 (better quality, ~$0.009/analysis)
    
    Choice [1-2, or n to skip]:

**Why This Approach**:
- ✅ **Zero config**: Works immediately for all users
- ✅ **Free**: LeanSpec Models free tier (GitHub Models backend)
- ✅ **Privacy**: Explicit privacy policy, no data retention
- ✅ **Flexible**: Fallback to user's API keys if needed
- ✅ **User control**: Explicit opt-in for personal API keys
- ✅ **Transparent**: Show what's being analyzed
- ✅ **Always functional**: Regex fallback

**LLM Provider Priority**:
1. LeanSpec Models (free, no config, official, any backend model)
2. User's OpenAI key (with permission + model selection, ~$0.002-0.009/analysis)
3. User's Anthropic key (with permission + model selection, ~$0.002-0.01/analysis)
4. Regex fallback (free, no LLM)

### Template Structure Changes

**Current**:

    packages/cli/templates/_shared/agents-components/
    ├── core-rules-shared.md
    ├── discovery-commands-shared.md
    ├── essential-commands-shared.md
    ├── workflow-standard-detailed.md
    └── quality-standards-shared.md

**Proposed Addition**:

    packages/cli/templates/_shared/agents-components/
    ├── (existing files...)
    ├── project-header-template.hbs    # NEW: Project-specific header
    ├── security-section-template.hbs  # NEW: Security guidance
    ├── dev-setup-template.hbs         # NEW: Development setup
    └── mcp-config-template.hbs        # NEW: MCP integration

**agents-template.hbs Changes**:

    # AI Agent Instructions

    ## Project: {{{project_name}}}

    {{{projectDescription}}}  <!-- NEW: From README -->

    {{#if hasSecurity}}
    {{{securitySection}}}      <!-- NEW: Security guidance -->
    {{/if}}

    {{#if hasDevSetup}}
    {{{devSetupSection}}}      <!-- NEW: Dev setup -->
    {{/if}}

    {{#if hasMcpConfig}}
    {{{mcpConfigSection}}}     <!-- NEW: MCP config -->
    {{/if}}

    ## Core Rules

    {{{coreRules}}}
    <!-- Rest of template unchanged -->

### Implementation Architecture

**New Module**: `packages/cli/src/utils/project-analyzer.ts`

TypeScript interface definition:

    interface ProjectContext {
      name: string;
      description: string;
      type: 'orchestration' | 'web' | 'cli' | 'library' | 'docs' | 'unknown';
      hasSecurity: boolean;
      securityKeywords: string[];
      devSetup: {
        found: boolean;
        commands: string[];
        environment: Record<string, string>;
      };
      mcpConfig: {
        applicable: boolean;
        port?: number;
        endpoint?: string;
        requiresAuth: boolean;
      };
      techStack: string[];
    }

    interface LLMProvider {
      name: 'leanspec-models' | 'openai' | 'anthropic' | 'none';
      available: boolean;
      requiresPermission: boolean;
      models?: LLMModel[];  // Available models for this provider
      selectedModel?: string;
      estimatedCost?: string;
    }

    interface LLMModel {
      id: string;  // e.g., 'gpt-5-mini', 'gpt-5.1', 'claude-3-5-haiku'
      name: string;  // Display name
      speed: 'fast' | 'medium' | 'slow';
      cost: string;  // e.g., '~$0.002'
      recommended?: boolean;
    }

    // Primary orchestrator - tries providers in priority order
    async function analyzeProject(projectRoot: string, options?: AnalysisOptions): Promise<ProjectContext>
    
    // Detect available LLM providers
    async function detectLLMProviders(): Promise<LLMProvider[]>
    
    // Get available models for a provider
    async function getAvailableModels(providerName: string): Promise<LLMModel[]>
    
    // Request user permission + model selection for API key usage (not needed for LeanSpec Models)
    async function requestLLMPermission(provider: LLMProvider): Promise<{ permitted: boolean; selectedModel?: string }>
    
    // Provider-specific analysis
    async function analyzeWithLeanSpecModels(readme: string, projectRoot: string): Promise<ProjectContext>
    async function analyzeWithOpenAI(readme: string, projectRoot: string, model: string): Promise<ProjectContext>
    async function analyzeWithAnthropic(readme: string, projectRoot: string, model: string): Promise<ProjectContext>
    
    // Fallback: Simple extraction
    async function analyzeWithRegex(readme: string, projectRoot: string): Promise<ProjectContext>

**New Module**: `packages/cli/src/services/leanspec-models.ts`

LeanSpec Models API client:

    interface LeanSpecModelsRequest {
      readme: string;
      projectFiles: string[];  // List of file paths for context
      projectName: string;
      preferredBackend?: string;  // Optional: 'github-models', 'openai', etc.
    }

    interface LeanSpecModelsResponse {
      projectContext: ProjectContext;
      confidence: number;  // 0-1 score
      fallbackUsed: boolean;
    }

    // Call LeanSpec Models API
    async function analyzeWithLeanSpecModels(request: LeanSpecModelsRequest): Promise<LeanSpecModelsResponse>
    
    // Check API availability and rate limits
    async function checkLeanSpecModelsStatus(): Promise<{ available: boolean; rateLimitRemaining: number }>
    
    // Handle errors and fallbacks
    function handleLeanSpecModelsError(error: Error): void

**Modified**: `packages/cli/src/commands/init.ts`

TypeScript code changes:

    // After template selection, before file copy:
    
    // Try LeanSpec Models first (free, no config)
    let projectContext: ProjectContext;
    
    try {
      const status = await checkLeanSpecModelsStatus();
      
      if (status.available) {
        console.log(chalk.dim('✓ Analyzing project with LeanSpec Models...'));
        projectContext = await analyzeProject(cwd, {
          provider: 'leanspec-models',
        });
      } else {
        // LeanSpec Models unavailable, check user API keys
        const providers = await detectLLMProviders();
        let selectedProvider: LLMProvider | null = null;
        
        for (const provider of providers) {
          if (provider.requiresPermission) {
            const { permitted, selectedModel } = await requestLLMPermission(provider);
            if (permitted) {
              provider.selectedModel = selectedModel;
              selectedProvider = provider;
              break;
            }
          }
        }
        
        projectContext = await analyzeProject(cwd, {
          provider: selectedProvider?.name || 'none',
        });
      }
    } catch (error) {
      // Fallback to regex if everything fails
      console.log(chalk.dim('Using basic analysis...'));
      projectContext = await analyzeProject(cwd, { provider: 'none' });
    }

    // Pass to template generation:
    await generateContextualAgentsFile(
      templateName,
      templatesDir,
      cwd,
      { 
        project_name: projectName,
        projectContext,
      }
    );

**Modified**: `scripts/build-agents-templates.ts`

TypeScript code changes:

    // Add support for dynamic sections:
    interface DynamicSection {
      condition: string;  // 'hasSecurity', 'hasDevSetup', etc.
      template: string;   // Template file name
      data: any;          // Context data for template
    }

    // Generate with dynamic sections:
    function generateAgentsFile(
      templateName: string,
      dynamicSections?: DynamicSection[]
    ): void

### Security Guidance Template

**security-section-template.hbs**:

Handlebars template content:

    ## Security & Privacy

    ⚠️ **CRITICAL**: This project handles {{securityContext}}.

    **Required Practices:**
    - Store secrets in environment variables (never commit)
    {{#if hasNetworkAccess}}
    - Run behind authentication (network access controls)
    - Default: localhost-only (expose cautiously)
    - TLS required for remote access
    {{/if}}
    {{#if hasApiKeys}}
    - Use .env files (add to .gitignore)
    - Rotate API keys regularly
    - Least-privilege access (limit scope)
    {{/if}}

    **Check for security issues before committing:**
    bash
    git diff | grep -i "api.key\|secret\|password\|token"

### MCP Config Template

**mcp-config-template.hbs**:

Handlebars template content:

    ## MCP Integration

    Connect AI tools to {{project_name}}:

    **VS Code (GitHub Copilot)**:
    Add to `.vscode/settings.json`:
    json
    {
      "github.copilot.chat.mcp.servers": {
        "{{project_name}}": {
          "command": "{{mcpCommand}}",
          "args": {{mcpArgs}},
          {{#if mcpEnv}}
          "env": {{mcpEnv}},
          {{/if}}
          "cwd": "${workspaceFolder}"
        }
      }
    }


    **Claude Desktop**:
    Add to `claude_desktop_config.json`:
    json
    {
      "mcpServers": {
        "{{project_name}}": {
          "command": "{{mcpCommand}}",
          "args": {{mcpArgs}},
          {{#if mcpEnv}}
          "env": {{mcpEnv}},
          {{/if}}
          "cwd": "/absolute/path/to/{{project_name}}"
        }
      }
    }


    **Test Connection**:
    
    Ask your AI: "List all specs in {{project_name}}"

### Alternative Approaches Considered

**A. Always Use External LLM (OpenAI/Anthropic)**
- Require API key for smart generation
- ❌ **Rejected**: Adds friction, costs money, not accessible to all users

**B. Direct GitHub Models Integration**
- Integrate GitHub Models directly in CLI
- ❌ **Rejected**: Requires users to have Copilot subscription, less accessible

**C. LeanSpec Models Proxy (Official API)** ✅ **CHOSEN**
- Official LeanSpec API powered by GitHub Models
- ✅ **Zero config**: Works for all users out of the box
- ✅ **Free**: Free tier for all users (100/day)
- ✅ **Privacy**: Clear privacy policy, no data retention
- ✅ **Flexible**: Fallback to user's API keys
- ✅ **User control**: Explicit opt-in for personal API keys only
- ✅ **Sustainable**: Can add paid tiers later if needed
- ✅ **Always works**: Multiple fallback layers

**D. User API Keys Only**
- Only support user-provided API keys
- ❌ **Rejected**: Too much friction for new users

**E. Regex-Only (No LLM)**
- Parse README with string matching only
- ❌ **Rejected**: Less accurate, misses edge cases
- ✅ **Kept as final fallback**: When all LLMs fail

**F. User Questionnaire (Interactive)**
- Ask user questions instead of analyzing README
- ❌ **Rejected**: Friction, breaks quick start
- ⚠️ Could be optional `--interactive` mode

**Decision**: LeanSpec Models as primary (zero-config, free) → user API keys (with permission) → regex fallback ensures maximum accessibility with zero friction

## Plan

### Phase 1: LeanSpec Models API (Week 1-2)
- [ ] **Backend API Setup** (separate repo/service)
  - [ ] Create Next.js API route `/api/v1/analyze-project`
  - [ ] Integrate multiple LLM backends (GitHub Models primary, OpenAI/Anthropic fallback)
  - [ ] Add backend routing logic (cost optimization, availability)
  - [ ] Implement rate limiting (100 req/day per IP)
  - [ ] Add request validation and sanitization
  - [ ] Set up error handling and monitoring
  - [ ] Deploy to Vercel/similar (free tier)
  - [ ] Document privacy policy (no data retention)
- [ ] **CLI Integration**
  - [ ] Create `packages/cli/src/services/leanspec-models.ts`
  - [ ] Implement API client with retry logic
  - [ ] Add timeout handling (5s max)
  - [ ] Create fallback chain (LeanSpec → User Keys → Regex)
  - [ ] Add model selection UI for user API keys
  - [ ] Store model preference in config (`.leanspec/config.json`)
- [ ] **Project Analyzer**
  - [ ] Create `project-analyzer.ts` module
  - [ ] `analyzeProject()` orchestrator with multi-provider
  - [ ] `detectLLMProviders()` - check API + env vars
  - [ ] `getAvailableModels()` - list models per provider
  - [ ] `requestLLMPermission()` - permission + model selection for user API keys
  - [ ] `analyzeWithLeanSpecModels()` - API integration (backend handles model routing)
  - [ ] `analyzeWithOpenAI()` - OpenAI fallback with model parameter
  - [ ] `analyzeWithAnthropic()` - Anthropic fallback with model parameter
  - [ ] `analyzeWithRegex()` - final fallback
- [ ] Create new template components
  - [ ] `project-header-template.hbs`
  - [ ] `security-section-template.hbs`
  - [ ] `dev-setup-template.hbs`
  - [ ] `mcp-config-template.hbs`
- [ ] Update `agents-template.hbs` with conditional sections
- [ ] Update `build-agents-templates.ts` to support dynamic sections

### Phase 2: Init Integration (Week 2-3)
- [ ] Modify `init.ts` to call LeanSpec Models API
- [ ] Add graceful degradation (API → User Keys → Regex)
- [ ] Implement loading indicators ("Analyzing project...")
- [ ] Add `--no-llm` flag to skip straight to regex
- [ ] Add `--model <name>` flag to specify model explicitly
- [ ] Read model preference from config if available
- [ ] Pass project context to template generation
- [ ] Update `template-helpers.ts` for context-aware file copy
- [ ] Add variable substitution for new template fields
- [ ] Test on multiple project types

### Phase 3: Template Configs (Week 2)
- [ ] Update `minimal/agents-config.json` (skip advanced sections)
- [ ] Update `standard/agents-config.json` (include all sections)
- [ ] Update `enterprise/agents-config.json` (enhanced security)
- [ ] Add `projectAnalysis` config option (enable/disable per template)

### Phase 4: Testing & Validation (Week 2-3)
- [ ] Test on sample projects:
  - [ ] agent-relay (orchestration platform)
  - [ ] lean-spec itself (CLI tool)
  - [ ] Simple web service
  - [ ] Library project
- [ ] Verify AGENTS.md quality for each type
- [ ] Test fallback for projects without README.md
- [ ] Validate MCP configs are correct

### Phase 5: Documentation (Week 3)
- [ ] Update init command docs
- [ ] Add "Project Analysis" section to AGENTS.md guide
- [ ] Document security guidance patterns
- [ ] Add examples of generated AGENTS.md files
- [ ] Update CONTRIBUTING.md with template authoring guide

### Phase 6: Future Enhancements (Backlog)
- [ ] `lean-spec enhance-agents` command (manual refinement)
- [ ] LeanSpec Models paid tier (unlimited requests, priority)
- [ ] Support more LLM providers (Gemini, Mistral, local models)
- [ ] Template marketplace (community templates)
- [ ] Project-specific rule suggestions
- [ ] Integration with package.json scripts
- [ ] Cache responses (avoid re-analyzing same README)
- [ ] Analytics dashboard (API usage, popular project types)

## Test

### LLM Provider Selection
- [ ] Correctly prioritizes LeanSpec Models (free, zero-config)
- [ ] Falls back to user API keys when LeanSpec Models unavailable
- [ ] Detects `OPENAI_API_KEY` environment variable
- [ ] Detects `ANTHROPIC_API_KEY` environment variable
- [ ] Prompts for permission only for user's API keys (not LeanSpec Models)
- [ ] Shows estimated cost in permission prompt for paid APIs
- [ ] Respects `--no-llm` flag (skips to regex)
- [ ] Falls back to regex when all LLM providers unavailable

### LeanSpec Models API
- [ ] API endpoint responds correctly
- [ ] Rate limiting works (100 req/day per IP)
- [ ] Handles timeouts gracefully (5s max)
- [ ] Returns valid ProjectContext JSON
- [ ] Error responses are handled correctly
- [ ] Privacy policy accessible and clear

### README.md Parsing
- [ ] Extracts first paragraph as project description
- [ ] Finds development setup sections
- [ ] Extracts setup commands from code blocks
- [ ] Detects security keywords (API key, secret, auth)
- [ ] Handles missing README.md gracefully

### Security Context Detection
- [ ] Flags projects with API key references
- [ ] Flags projects with docker-compose (network access)
- [ ] Flags projects with authentication keywords
- [ ] Generates appropriate security guidance
- [ ] Skips security section for simple libraries

### MCP Config Generation
- [ ] Generates correct port numbers
- [ ] Includes environment variables
- [ ] Handles authentication requirements
- [ ] Works for both VS Code and Claude Desktop
- [ ] Skips MCP section for non-service projects

### Template Integration
- [ ] Generated AGENTS.md validates (no broken syntax)
- [ ] All substitution variables resolved
- [ ] Conditional sections render correctly
- [ ] Generic LeanSpec principles preserved
- [ ] File size remains under 2,000 tokens

### End-to-End Workflow
- [ ] `lean-spec init` on agent-relay produces useful AGENTS.md
- [ ] LeanSpec Models API called automatically (no config needed)
- [ ] Loading indicator shows during analysis
- [ ] Falls back gracefully when API unavailable
- [ ] Permission prompt appears only when using user's API key
- [ ] User can opt-out of all LLM usage with `--no-llm`
- [ ] Regex fallback works when all LLMs declined/unavailable
- [ ] Security section appears for projects with secrets
- [ ] Dev setup section appears when found in README
- [ ] MCP config matches project architecture
- [ ] Quick start still takes <5 seconds (with API)
- [ ] Init completes successfully without any configuration (default path)

## Notes

### Design Decisions

**Why README.md as Primary Source?**
- Already maintained by developers
- High-quality project description
- Contains setup instructions developers actually use
- No additional maintenance burden

**Why LeanSpec Models (Official API)?**
- Zero configuration - works out of the box
- Free tier for all users (100 requests/day)
- Privacy-focused with clear policies
- Flexible fallback options
- Sustainable business model potential

**Why Conditional Sections in Template?**
- Avoids bloat for simple projects (libraries don't need security section)
- Allows template evolution (add sections without breaking existing)
- Clear separation between generic and project-specific content

### Open Questions

1. **How to handle evolving README.md?**
   - Option A: Re-run `lean-spec init` (destructive)
   - Option B: `lean-spec update-agents` command (non-destructive)
   - **Decision**: Implement update-agents in Phase 6

2. **Should we parse package.json / requirements.txt?**
   - Could extract dependencies, scripts, project metadata
   - **Decision**: Yes, GitHub Models can analyze these too (include in prompt)

3. **How much template complexity is too much?**
   - Risk: Templates become unreadable with too many conditions
   - Mitigation: Keep core template simple, complex logic in analyzer
   - **Guideline**: Max 5 conditional sections

4. **Should minimal template skip project analysis?**
   - Minimal users may want fastest possible init
   - **Decision**: Make analysis opt-out per template config (or skip GitHub Models, use regex fallback)

5. **What if user doesn't have any API keys?**
   - LeanSpec Models works for everyone with no config
   - **Decision**: Zero-friction default path

6. **What if LeanSpec Models API goes down?**
   - Automatically falls back to user API keys (with permission) or regex
   - **Decision**: Multiple fallback layers ensure reliability

7. **Should we store user's LLM provider and model preference?**
   - Save in `.leanspec/config.json`: `{ "llm": { "provider": "openai", "model": "gpt-5-mini" } }`
   - Skip permission prompt if saved (but validate API key still works)
   - Allow override with `--model` flag
   - **Decision**: Implement in Phase 2 (improves UX significantly)

8. **What about API costs for LeanSpec?**
   - Backend can route to cheapest available model (GitHub Models → OpenAI mini → etc.)
   - GitHub Models free tier should cover most usage
   - Can add paid tier later for unlimited requests or premium models
   - **Decision**: Start with free tier + intelligent routing, monitor usage

### Related Work

**Existing Specs**:
- `003-init-system-redesign` (archived) - Original init design
- `073-template-engine-agents-md` (complete) - Current template engine
- `086-template-component-deduplication` (complete) - Component architecture
- `072-ai-agent-first-use-workflow` (planned) - Discovery commands improvement

**Dependencies**:
- Requires existing template engine (spec 073) ✅ Complete
- Requires component-based templates (spec 086) ✅ Complete
- Compatible with existing init flow (spec 003) ✅

### Success Metrics

**Quantitative**:
- Generated AGENTS.md includes 80%+ project-specific content (when using LLM)
- Security section present for 90%+ projects handling secrets
- MCP config accuracy: 95%+ (correct ports, env vars)
- Init time increase: <3 seconds with LeanSpec Models, <1 second with regex
- LeanSpec Models uptime: >99.5% target
- API success rate: >95% (with automatic fallbacks)
- Permission prompt acceptance rate: Track for UX improvements (only shown when needed)

**Qualitative**:
- Users report "AGENTS.md feels tailored to my project"
- Reduced manual editing after init
- AI agents provide better project-specific guidance
- New contributors understand project faster

### Risk Mitigation

**Risk**: README.md parsing fails for unusual formats
- **Mitigation**: LLMs handle edge cases better than regex; graceful fallback to generic template if all fail
- **Test**: Run on 50+ diverse open-source projects

**Risk**: LLM providers unavailable or rate-limited
- **Mitigation**: LeanSpec Models API + user API keys + regex = triple fallback
- **Test**: Verify fallback chain works correctly, simulate API downtime

**Risk**: LeanSpec Models API costs
- **Mitigation**: GitHub Models free tier, rate limiting (100/day), monitor usage
- **Plan**: Add paid tier if needed (sustainable business model)

**Risk**: User privacy concerns about sending README to LeanSpec API
- **Mitigation**: Clear privacy policy, no data retention, allow opt-out with `--no-llm`
- **Transparency**: Document what data is sent and why
- **Test**: Verify privacy policy is accessible and clear

**Risk**: API key costs surprise users
- **Mitigation**: Show estimated cost in permission prompt (~$0.002-0.009)
- **Note**: Cost is negligible but transparency builds trust

**Risk**: Security guidance is too generic/not actionable
- **Mitigation**: Use specific patterns per project type
- **Review**: Security expert review of templates

**Risk**: MCP config examples don't work
- **Mitigation**: Test configs with real AI tools
- **Validation**: Automated tests for config syntax

**Risk**: Template complexity makes maintenance harder
- **Mitigation**: Keep analyzer logic separate from templates
- **Documentation**: Clear template authoring guide
