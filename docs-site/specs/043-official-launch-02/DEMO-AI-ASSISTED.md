# AI-Assisted Demo Script

## Overview

Showcase LeanSpec's **killer feature**: AI agents working with specs naturally through MCP integration.

**Core Message:** *"Specs that AI agents can read, write, and reason about—automatically."*

**Duration:** 3-5 minutes  
**Format:** Split-screen (AI chat + terminal)  
**Recording:** OBS Studio / Loom with split view

---

## Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│  AI Chat (Claude / Copilot)     │  Terminal + Editor   │
│         60% width                │      40% width        │
│                                  │                       │
│  Show natural conversation       │  Show real-time      │
│  with MCP tool calls visible     │  file changes        │
└─────────────────────────────────────────────────────────┘
```

---

## Full Script

### SCENE 1: Setup & Discovery (45 seconds)

**[Terminal - Right side]**
```bash
# Show clean terminal
cd ~/demo-project
npm install --save-dev lean-spec
npx lean-spec init  # Choose "minimal"
```

**[AI Chat - Left side]**
```
Human: "What specs exist in this project?"

AI: [Uses MCP tool: list]
    "The project currently has no specs. The specs/ directory 
     is initialized and ready. Would you like to create one?"
```

**Key Point:** AI has instant awareness of project state through MCP

---

### SCENE 2: Create Spec Through Conversation (90 seconds)

**[AI Chat]**
```
Human: "We need user authentication. Create a spec for JWT-based auth 
        with bcrypt password hashing and rate limiting."

AI: [Uses MCP: create("user-authentication")]
    "I've created spec 001-user-authentication. 
     Let me draft the content following LeanSpec principles..."
    
    [Uses MCP: view("user-authentication")]
    [AI edits the spec file directly]
    
    "I've added:
    
    **Problem**: No authentication, unprotected endpoints
    
    **Solution**: 
    - JWT tokens (24hr expiry)
    - bcrypt hashing (10 rounds minimum)
    - Rate limiting (5 attempts/min per IP)
    
    **Success Criteria**:
    - [ ] Users can register with email/password
    - [ ] Login returns valid JWT token
    - [ ] Protected endpoints require valid token
    - [ ] Rate limit blocks brute force attacks
    
    The spec is under 200 lines and ready for review."
```

**[Terminal/Editor - Right side]**
- Show `specs/001-user-authentication/README.md` appearing
- Show content being written in real-time
- Highlight the clean frontmatter structure

**Key Point:** AI drafts complete, actionable spec in seconds

---

### SCENE 3: Semantic Search & Memory (60 seconds)

**[AI Chat]**
```
Human: "What did we decide about password security?"

AI: [Uses MCP: search("password security")]
    [Uses MCP: view("001-user-authentication")]
    
    "Per spec 001-user-authentication:
    - Passwords must be hashed with bcrypt
    - Minimum 10 rounds (computationally expensive to crack)
    - Never store plaintext passwords
    - Rate limiting prevents brute force (5 attempts/min)"
```

**Key Point:** AI has semantic memory—no need to reference file paths

---

### SCENE 4: Update Status & Track Progress (45 seconds)

**[AI Chat]**
```
Human: "I'm starting work on the auth spec. Update its status."

AI: [Uses MCP: update("user-authentication", status="in-progress")]
    "Spec 001 status updated to 'in-progress'.
     Transition logged at 2025-11-10T18:30:00Z"
    
Human: "Show me the project board"

AI: [Uses MCP: board()]
    "Project Board:
    
    📅 Planned (0)
    ⏳ In Progress (1)
      - 001-user-authentication [in-progress]
    ✅ Complete (0)
    
    Project Completion: 0% (0/1 complete)"
```

**[Terminal - Right side]**
```bash
# Verify in terminal
npx lean-spec board
# Shows same Kanban view
```

**Key Point:** AI tracks project state automatically

---

### SCENE 5: Validation & Quality Gates (45 seconds)

**[AI Chat]**
```
Human: "I added a lot of content to the spec. Is it getting too complex?"

AI: [Uses MCP: validate()]
    "Validation Results:
    
    ✅ 001-user-authentication: 187 lines (healthy)
    
    All specs pass validation. Your spec is well-scoped and 
    under the 300-line warning threshold. No issues detected."
```

**[Simulate adding too much content]**

```
Human: "What if I add 300 more lines of implementation details?"

AI: [Uses MCP: validate()]
    "⚠️ Validation Warnings:
    
    001-user-authentication: 487 lines (warning: exceeds 400)
    
    Recommendation: This spec exceeds the Context Economy threshold.
    Consider splitting into sub-specs:
    - README.md (overview)
    - DESIGN.md (detailed architecture)
    - IMPLEMENTATION.md (step-by-step plan)"
```

**Key Point:** AI enforces first principles automatically

---

### SCENE 6: Wrap-Up (30 seconds)

**[AI Chat]**
```
Human: "Show me all available commands"

AI: [Uses MCP: help or lists tools]
    "I can help you with these spec operations:
    
    **Discovery**: list, search, board, stats, deps
    **Viewing**: view (formatted/raw/json), files
    **Management**: create, update, archive
    **Quality**: validate, check
    
    All through natural conversation—no need to remember CLI syntax."
```

**[Voiceover or text overlay]**
```
"LeanSpec + MCP: Specs that AI agents understand natively.

- Natural conversation interface
- Semantic memory across sessions  
- Automatic validation and quality gates
- Zero-friction collaboration

Get started: npm install lean-spec"
```

---

## Key Visual Moments (For Editing)

1. **0:15** - MCP tool call appears (highlight with subtle animation)
2. **1:30** - Spec file appears in editor in real-time
3. **2:15** - Search finding spec by concept, not filename
4. **3:00** - Status update reflected in board instantly
5. **3:45** - Validation warning catching complexity

---

## Voiceover Script (Complete)

```
[0:00 - INTRO]
"LeanSpec is a spec methodology designed for AI-powered development.
But here's what makes it different: specs that AI agents can read, 
write, and manage—automatically.

[0:15 - SETUP]
Let me show you. I'll start by installing LeanSpec and asking 
my AI assistant what specs exist in the project.

Notice: The AI uses the Model Context Protocol to query LeanSpec 
directly. No manual file references needed.

[0:45 - CREATE]
Now I'll ask the AI to create a spec for user authentication.
Watch what happens.

The AI creates the spec, understands the requirements, and drafts 
complete content—all in natural language. Problem, solution, success 
criteria. Clean, actionable, under 200 lines.

[2:00 - SEMANTIC SEARCH]
Days later, I can ask: 'What did we decide about password security?'

The AI searches specs semantically, retrieves the authentication spec,
and gives me the exact details. This works across sessions—
the AI remembers project decisions through specs.

[2:45 - STATUS TRACKING]
When I start work, I just say: 'Update the auth spec to in-progress.'

The AI updates the status and can show me the project board instantly.
All without leaving the conversation.

[3:30 - VALIDATION]
Here's where it gets smart. If I add too much content, 
the AI warns me—using LeanSpec's validation rules.

It enforces the first principle: Context Economy. 
Specs must fit in working memory, or they're split automatically.

[4:15 - WRAP UP]
This is LeanSpec with MCP: specs as semantic memory for AI agents.

Natural conversation. Zero manual file management. Built-in quality gates.
Perfect for human-AI collaboration.

Try it yourself: npm install lean-spec"
```

---

## Recording Checklist

### Pre-Recording
- [ ] Clean terminal (no history, simple prompt)
- [ ] Fresh project directory (`demo-project`)
- [ ] AI tool configured (MCP server ready)
- [ ] VS Code with simple theme (high contrast)
- [ ] Screen recording software set to split view
- [ ] Test MCP integration (verify tools work)
- [ ] Prepare "overflow content" file for validation demo

### During Recording
- [ ] Slow down typing in chat (readable)
- [ ] Pause 2-3 seconds after each AI response
- [ ] Show MCP tool calls (if visible in UI)
- [ ] Highlight key moments (spec file appearing, validation warnings)
- [ ] Keep consistent pacing (not too fast)

### Post-Production
- [ ] Add subtle highlights for MCP tool calls
- [ ] Zoom in on key text (validation warnings, spec content)
- [ ] Add captions for key takeaways
- [ ] Trim any dead air or mistakes
- [ ] Add outro with installation command + website

---

## Distribution

### Primary
- [ ] YouTube (unlisted for now, public at launch)
- [ ] Embedded in README.md "Quick Demo" section
- [ ] Docs site homepage (hero section)
- [ ] Product Hunt submission (video)

### Secondary
- [ ] Twitter/X (15-30s teaser + link)
- [ ] LinkedIn (professional audience)
- [ ] Hacker News Show HN (link to full video)
- [ ] Dev.to / Hashnode article embedding

---

## Alternative: Recorded Terminal Session (Backup)

If split-screen recording is complex, fall back to terminal-only demo with visible MCP output:

```bash
# Install
npm install -g lean-spec
lean-spec init

# Show AI interaction via terminal (Claude CLI or similar)
echo "Pretend this is AI chat, show the same workflow"

# Manually run commands to show what AI would do via MCP
lean-spec list
lean-spec create user-authentication
lean-spec view user-authentication
lean-spec update user-authentication --status in-progress
lean-spec board
lean-spec validate
```

This loses the "natural conversation" magic but still shows the workflow.

---

## Success Metrics

**Demo is successful if viewers understand:**
1. ✅ AI can manage specs through conversation (no CLI needed)
2. ✅ Specs persist as semantic memory across sessions
3. ✅ Validation enforces quality automatically
4. ✅ MCP enables zero-friction AI collaboration

**Failure signs:**
- ❌ Looks like "just another CLI tool"
- ❌ MCP integration not clear
- ❌ Seems like gimmick, not real workflow
