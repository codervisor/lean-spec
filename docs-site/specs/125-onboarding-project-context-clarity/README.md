---
status: complete
created: '2025-11-26'
tags:
  - onboarding
  - user-experience
  - agents-md
priority: high
created_at: '2025-11-26T08:24:50.022Z'
updated_at: '2025-11-26T08:27:32.463Z'
transitions:
  - status: in-progress
    at: '2025-11-26T08:24:54.329Z'
  - status: complete
    at: '2025-11-26T08:27:32.463Z'
completed_at: '2025-11-26T08:27:32.463Z'
completed: '2025-11-26'
---

# Streamline Onboarding: Clear Project Context Section

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-26 · **Tags**: onboarding, user-experience, agents-md

**Project**: lean-spec  
**Team**: Core Development

## Overview

User feedback indicates confusion about where to add project information (description, objectives, tech stack) during onboarding. The current AGENTS.md has a generic placeholder that users don't realize needs customization.

**Problem**: Current AGENTS.md header says:
```
## Project: {project_name}
Lightweight spec methodology for AI-powered development.
```
Users don't realize this is a placeholder they should replace with their actual project description.

**Solution**: 
1. Add an explicit "Project Context" section with clear TODO markers
2. Include prompts for what to add (description, tech stack, objectives)
3. Improve "Next steps" messaging to specifically call out this section

## Design

### AGENTS.md Changes

Add a new "📋 Project Context" section after the project header with clear TODO markers:

```markdown
## Project: {project_name}

<!-- 👇 TODO: Replace this section with your project info -->
### 📋 Project Context (Edit This!)

**What this project does:**
<!-- Describe your project in 1-2 sentences -->
_Example: A task management API for team collaboration_

**Tech stack:**
<!-- List main technologies -->
_Example: Node.js, Express, PostgreSQL, Redis_

**Key objectives:**
<!-- What are you building toward? -->
_Example: Launch MVP with core CRUD operations by Q1_
<!-- 👆 End of TODO section -->
```

### Init "Next steps" Update

Change from vague "Review and customize AGENTS.md" to specific:
```
Next steps:
  1. Edit AGENTS.md → Fill in "Project Context" section with your project info
  2. Create your first spec: lean-spec create my-feature
```

## Plan

- [x] Update standard template AGENTS.md with Project Context section
- [x] Update detailed template AGENTS.md with Project Context section  
- [x] Update init.ts "Next steps" messaging
- [ ] Test init flow end-to-end

## Notes

### User Feedback
User didn't know where to add project info (what the project is about, objectives). The AGENTS.md file looked "complete" and they didn't realize customization was needed.
