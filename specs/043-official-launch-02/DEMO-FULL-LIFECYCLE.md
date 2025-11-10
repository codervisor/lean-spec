# Full Lifecycle Demo: Spec → Implementation

## Overview

Show the **complete workflow** from AI-assisted spec creation through working implementation. This demonstrates LeanSpec's real-world value, not just tooling.

**Duration:** 5-7 minutes  
**Format:** Split-screen (AI chat + IDE with terminal)  
**Outcome:** Working feature at the end

**Core Message:** *"From conversation to code: How AI and specs work together"*

---

## Demo Feature: Add `--json` Output to `lean-spec list`

**Why this feature?**
- ✅ Simple enough to implement in 5 minutes
- ✅ Real feature users would want
- ✅ Shows actual code changes
- ✅ Has testable success criteria
- ✅ Demonstrates validation workflow

**Current state:** `lean-spec list` outputs formatted table  
**Goal:** Add `--json` flag for machine-readable output

---

## Full Script

### SCENE 1: Project Context (30 seconds)

**[Terminal]**
```bash
cd ~/lean-spec
npx lean-spec list
# Shows formatted table output
```

**[AI Chat]**
```
Human: "I need to add a --json flag to the 'list' command 
        for machine-readable output. Help me create a spec."

AI: "Let me check the existing specs first..."
    [Uses MCP: search("list command")]
    [Uses MCP: list()]
    
    "I don't see an existing spec for this. Let me create one 
     following LeanSpec principles."
```

---

### SCENE 2: AI-Assisted Spec Creation (90 seconds)

**[AI Chat]**
```
AI: [Uses MCP: create("json-output-flag")]
    
    "I've created spec 064-json-output-flag. Let me draft the content:
    
    **Problem**: 
    - CLI output is human-readable only
    - Can't pipe results to other tools
    - No machine-readable format for automation
    
    **Solution**:
    - Add --json flag to list command
    - Output valid JSON array of specs
    - Preserve existing formatting as default
    
    **Success Criteria**:
    - [ ] lean-spec list --json outputs valid JSON
    - [ ] JSON includes all spec metadata (name, status, tags, etc.)
    - [ ] Existing behavior unchanged without flag
    - [ ] Can pipe to jq successfully
    
    **Implementation**:
    - Update src/commands/list.ts
    - Add --json option to commander config
    - Add JSON formatter function
    - Add test cases
    
    Spec is 127 lines - well under Context Economy threshold.
    Ready to implement?"