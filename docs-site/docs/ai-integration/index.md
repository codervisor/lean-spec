---
id: 'index'
title: 'AI Integration'
sidebar_label: 'Overview'
sidebar_position: 1
---
# AI Integration

LeanSpec is designed from the ground up to work seamlessly with AI coding agents like GitHub Copilot, Cursor, Windsurf, and others.

## Why AI Integration Matters

In the era of AI-assisted development, LeanSpec serves as both a **methodology** and an **adaptive workflow** for AI-powered development teams. It's not just about writing specs—it's about establishing a living process that integrates with AI agent systems.

### Core Benefits for AI Teams

- **Clear Context**: Starting with "why" gives AI agents the purpose behind the work
- **Concrete Scenarios**: Specific examples help AI understand expected behavior  
- **Testable Criteria**: Clear targets guide AI implementation
- **Boundaries**: Explicit non-goals help AI avoid scope creep
- **Adaptable Structure**: Consistency helps AI parse and interpret effectively

AI coding agents work best with clear, concise specifications that balance context with brevity—exactly what the LeanSpec mindset promotes.

## How AI Agents Use Specs

When properly integrated, AI agents use LeanSpec specs to:

1. **Understand Context** - Quickly grasp what needs to be built and why
2. **Generate Code** - Implement features according to spec requirements
3. **Make Decisions** - Choose appropriate approaches based on constraints
4. **Ask Questions** - Identify ambiguities and request clarification
5. **Update Documentation** - Keep specs current as code evolves

## Integration Methods

There are three primary ways to integrate LeanSpec with AI agents:

### 1. System Prompts (`AGENTS.md`)

The most powerful integration method. Create an `AGENTS.md` file in your repository root that serves as **permanent instructions** for AI agents.

When you run `lspec init`, it creates or updates `AGENTS.md` with LeanSpec guidance.

**Example `AGENTS.md` structure:**

```markdown
# AI Agent Instructions

## Project: MyProject

[Project description]

## Core Rules

1. **Read README.md first** - Understand project context
2. **Check specs/** - Review existing specs before starting
3. **Follow LeanSpec principles** - Clarity over documentation
4. **Keep it minimal** - If it doesn't add clarity, cut it

## Discovery Commands

Before starting work:
- `lspec stats` - See work distribution  
- `lspec board` - View specs by status
- `lspec list --tag=<tag>` - Find related specs
- `lspec search "<query>"` - Full-text search
- `lspec deps <spec>` - Check dependencies

## Workflow

1. **Discover context** - Run discovery commands
2. **Search existing specs** - Find relevant work
3. **Create or update spec** - Document your changes
4. **Implement** - Build the feature
5. **Update status** - Mark progress
6. **Archive when done** - Clean up workspace
```

See the [AGENTS.md Guide](/docs/ai-integration/agents-md) for a complete template.

### 2. Repository Context

Structure your repository to make specs discoverable:

```
your-project/
├── AGENTS.md              # AI agent instructions
├── README.md              # Project overview
├── specs/                 # All specs here
│   └── YYYYMMDD/
│       └── NNN-name/
│           └── README.md  # The spec
├── .lspec/
│   └── config.json       # LeanSpec config
└── ... (code)
```

**Key practices:**
- Keep specs in a dedicated `specs/` directory
- Use consistent naming (date-based organization)
- Reference specs in code comments
- Link PRs to relevant specs

### 3. Direct References

Include spec paths in your prompts to AI agents:

```
Implement the feature described in specs/20251102/001-user-auth/README.md
```

Or reference multiple specs:

```
Check specs/20251102/001-user-auth and specs/20251102/002-api-gateway 
before implementing the login endpoint.
```

## Setting Up AI Integration

### Step 1: Initialize LeanSpec

```bash
lspec init
```

Choose a template that matches your workflow. The tool will:
- Create `.lspec/config.json`
- Set up `specs/` directory  
- Create or update `AGENTS.md`

### Step 2: Configure AGENTS.md

Edit `AGENTS.md` to include:
1. Project-specific context
2. LeanSpec workflow instructions
3. Coding standards and conventions
4. Quality expectations

See [Setup Guide](/docs/ai-integration/setup) for details.

### Step 3: Create Your First Spec

```bash
lspec create user-authentication
```

Write a clear, focused spec following LeanSpec principles.

### Step 4: Test with AI Agent

Prompt your AI agent:

```
Read the spec in specs/20251102/001-user-authentication/README.md
and implement the login endpoint.
```

Observe how the AI interprets and implements the spec.

### Step 5: Iterate and Improve

- Refine specs based on AI agent performance
- Clarify sections where AI had questions
- Add examples where AI made wrong assumptions
- Update AGENTS.md with learnings

## Best Practices

### For Spec Writing

::: tip Be Explicit
AI agents work best with explicit, concrete requirements. Instead of "secure authentication", write "JWT tokens with bcrypt password hashing, minimum 10 rounds".
:::

::: tip Provide Examples
Show don't tell. Include code snippets, API examples, or sample data.
:::

::: tip Define Boundaries
Use "Non-Goals" sections to prevent scope creep. AI agents will respect explicit boundaries.
:::

::: tip Use Acceptance Criteria
Testable criteria give AI agents clear targets. Make them specific and measurable.
:::

### For AI Integration

::: tip Keep AGENTS.md Current
Update as you discover what works. Make it a living document.
:::

::: tip Use Consistent Terminology
Align spec terminology with code. Makes it easier for AI to map concepts.
:::

::: tip Reference Specs in Code
Add comments linking code to specs: `// Implements: specs/20251102/001-user-auth`
:::

::: tip Test AI Understanding
Periodically ask AI to explain specs back to you. Clarify confusing parts.
:::

## Common Patterns

### Pattern 1: Spec-First Development

1. Write spec with clear requirements
2. Have AI implement from spec
3. Update spec with learnings
4. Archive when complete

### Pattern 2: Collaborative Refinement

1. Write rough spec
2. AI asks clarifying questions
3. Refine spec based on questions
4. AI implements refined version

### Pattern 3: Reverse Spec Writing

1. AI implements feature
2. Write spec documenting what was built
3. Use spec for future modifications
4. Keep spec updated

### Pattern 4: Template-Driven Generation

1. Create detailed spec templates
2. AI fills in template for new features
3. Review and refine
4. Use as implementation guide

## Measuring Success

Track these metrics to assess AI integration effectiveness:

**Positive Indicators:**
- AI generates correct code from specs
- Fewer clarification questions needed
- Faster feature implementation
- Specs remain accurate over time
- Team alignment improves

**Warning Signs:**
- AI frequently misinterprets specs
- Constant back-and-forth for clarification
- Specs become outdated quickly
- Implementation diverges from specs
- Team confusion increases

When you see warning signs, revise your specs and AGENTS.md instructions.

## Troubleshooting

### AI Ignores Specs

**Problem:** AI doesn't reference or follow specs.

**Solutions:**
- Make specs more discoverable (better filenames, prominent links)
- Explicitly reference specs in prompts
- Update AGENTS.md to emphasize spec importance
- Simplify spec structure

### AI Misinterprets Specs

**Problem:** AI implements features incorrectly.

**Solutions:**
- Add concrete examples
- Make acceptance criteria more specific
- Clarify ambiguous language
- Use consistent terminology
- Add diagrams or API samples

### Specs Get Outdated

**Problem:** Code and specs diverge.

**Solutions:**
- Include spec updates in definition of done
- Have AI update specs as it codes
- Review spec accuracy during code review
- Use `lspec update` to mark status changes

### Too Much Overhead

**Problem:** Maintaining specs takes too long.

**Solutions:**
- Keep specs leaner (review each section)
- Use templates to reduce writing
- Focus on high-value features
- Skip specs for trivial changes
- Have AI draft initial specs

## Tools and Extensions

### AI Coding Tools

LeanSpec works with:
- **GitHub Copilot** - Via AGENTS.md and repository context
- **Cursor** - Via `.cursorrules` or AGENTS.md
- **Windsurf** - Via system prompts
- **Cody** - Via repository context
- **Amazon Q** - Via context files
- **Custom Agents** - Via any prompt mechanism

### IDE Extensions

- **VSCode LeanSpec Extension** (planned) - Spec navigation and management
- **Cursor Integration** (planned) - Native spec awareness

## Examples

See [Examples](/docs/ai-integration/examples) for real-world AI integration patterns and workflows.

---

**Next**: 
- [Setup Guide](/docs/ai-integration/setup) - Detailed setup instructions
- [AGENTS.md Template](/docs/ai-integration/agents-md) - Complete template
- [Best Practices](/docs/ai-integration/best-practices) - Tips for effective AI integration
