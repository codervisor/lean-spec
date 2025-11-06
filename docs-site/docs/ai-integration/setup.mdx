---
id: 'setup'
title: 'Setup'
sidebar_position: 2
---
# Setup Guide

Step-by-step guide to integrating LeanSpec with AI coding agents.

## Quick Setup

1. **Initialize LeanSpec**
   ```bash
   lspec init
   ```

2. **Review AGENTS.md**
   
   The init command creates or updates `AGENTS.md` with LeanSpec guidance.

3. **Create Your First Spec**
   ```bash
   lspec create my-feature
   ```

4. **Test with AI Agent**
   
   Prompt your AI: "Read specs/20251102/001-my-feature/README.md and implement it"

That's it! You're ready to go.

## Detailed Setup

### Step 1: Install LeanSpec

```bash
npm install -g lean-spec
```

### Step 2: Initialize in Your Project

```bash
cd your-project
lspec init
```

Choose a template that matches your workflow:
- Solo dev for individual projects
- Team for small teams
- Enterprise for large organizations

### Step 3: Configure AGENTS.md

Edit the created `AGENTS.md` file to add project-specific context:

```markdown
# AI Agent Instructions

## Project: MyProject

Brief description of what the project does.

## Core Rules

1. **Read README.md first** - Understand project context
2. **Check specs/** - Review existing specs before starting
3. **Follow LeanSpec principles** - Clarity over documentation
4. **Keep it minimal** - If it doesn't add clarity, cut it

## Workflow

[Your specific workflow...]
```

See the [AGENTS.md Template](/docs/ai-integration/agents-md) for a complete example.

### Step 4: Set Up Your AI Agent

Different AI tools read context differently:

#### GitHub Copilot

Copilot automatically reads `AGENTS.md` and spec files when opened.

**No additional setup needed.**

#### Cursor

Cursor reads `.cursorrules` by default. Options:

**Option 1:** Use AGENTS.md (recommended)
```bash
# Cursor also reads AGENTS.md
# No additional setup
```

**Option 2:** Link .cursorrules to AGENTS.md
```bash
ln -s AGENTS.md .cursorrules
```

#### Windsurf

Windsurf uses system prompts. Add this to your Windsurf config:

```json
{
  "systemPrompt": "Read and follow instructions in AGENTS.md"
}
```

#### Other AI Tools

Most AI coding tools can read repository files. Either:
1. They automatically discover AGENTS.md
2. You manually reference it in prompts
3. You configure them to read it

### Step 5: Create Specs Directory Structure

LeanSpec creates this automatically, but here's what you get:

```
your-project/
├── .lspec/
│   ├── config.json
│   └── templates/
│       └── spec-template.md
├── specs/
│   └── (date-organized specs)
├── AGENTS.md
└── ... (your code)
```

### Step 6: Create Your First Spec

```bash
lspec create user-authentication
```

This creates:
```
specs/20251102/001-user-authentication/README.md
```

### Step 7: Write the Spec

Edit the created README.md:

```markdown
---
status: planned
created: 2025-11-02
tags: [security, api]
priority: high
---

# User Authentication

## Goal

Enable secure user login with JWT tokens.

## Key Scenarios

1. User logs in with email/password → receives JWT
2. User accesses API with JWT → gets data
3. Token expires → 401, must re-auth

## Acceptance Criteria

- [ ] POST /api/auth/login endpoint
- [ ] JWT tokens with 24h expiry
- [ ] bcrypt password hashing
- [ ] Rate limiting (5 attempts/min)

## Technical Approach

- jsonwebtoken library
- PostgreSQL for user storage
- Express middleware for JWT verification

## Non-Goals

- Social login (separate spec)
- Password reset (separate spec)
- 2FA (not needed for MVP)
```

### Step 8: Reference Spec in AI Prompt

Tell your AI agent about the spec:

```
Read specs/20251102/001-user-authentication/README.md and implement 
the user authentication system described there.
```

### Step 9: Iterate

As the AI implements:

1. Update spec with learnings
2. Add clarifications based on AI questions
3. Keep spec in sync with code
4. Update status: `lspec update specs/20251102/001-user-authentication --status=in-progress`

### Step 10: Complete and Archive

When done:

```bash
lspec update specs/20251102/001-user-authentication --status=complete
lspec archive specs/20251102/001-user-authentication
```

## Verification

Check that everything is working:

### 1. Verify AGENTS.md Exists

```bash
cat AGENTS.md
```

Should contain LeanSpec instructions.

### 2. Test Spec Creation

```bash
lspec create test-spec
lspec list
```

Should show the new spec.

### 3. Test AI Understanding

Ask your AI agent:

```
What specs exist in this project? Read them and summarize.
```

AI should discover and read your specs.

### 4. Test AI Implementation

```
Implement the feature described in specs/20251102/001-test-spec
```

AI should read and implement according to spec.

## Troubleshooting

### AI Doesn't Read Specs

**Problem:** AI ignores specs or doesn't know they exist.

**Solutions:**
1. Explicitly reference spec path in prompts
2. Update AGENTS.md to emphasize specs
3. Check that AI tool can access repository files

### AI Misinterprets Specs

**Problem:** AI implements incorrectly.

**Solutions:**
1. Add concrete examples to spec
2. Make acceptance criteria more specific
3. Include code snippets or API samples
4. Use consistent terminology

### Specs Get Outdated

**Problem:** Code and specs diverge.

**Solutions:**
1. Update specs during implementation
2. Include spec updates in PR checklist
3. Have AI update specs as it codes
4. Review spec accuracy during code review

## Next Steps

- Read [AGENTS.md Template](/docs/ai-integration/agents-md) for complete template
- Check [Best Practices](/docs/ai-integration/best-practices) for tips
- See [Examples](/docs/ai-integration/examples) for real-world patterns

---

Ready to level up? Explore [Best Practices](/docs/ai-integration/best-practices) next.
