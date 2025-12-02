# Solution Design

## New Information Architecture

**Principle**: Separate WHY from HOW, progressive disclosure from foundational to advanced.

### 1. Core Concepts → WHY LeanSpec Exists

**New Structure**:
```
Core Concepts/
  - Understanding LeanSpec (positioning, problem/solution, when to use)
  - First Principles (5 principles with clear examples)
  - Context Engineering (NEW - managing AI working memory)
  - AI Agent Memory (NEW - specs as persistent memory layer)
  - Philosophy & Mindset (beliefs, mental models - references principles)
```

**Changes**:
- **RESTRUCTURE "Understanding LeanSpec"**: Merge positioning + when to use, keep as entry point
- **Keep "First Principles"**: Standalone page with 5 principles and constraints
- **NEW "Context Engineering"**: How LeanSpec manages context for AI agents (link to spec 059)
- **NEW "AI Agent Memory"**: Specs as persistent memory layer for AI agents (semantic memory concept)
- **KEEP "Philosophy & Mindset"**: Beliefs, mental models - references all above concepts
- **REMOVE "Writing Specs AI Can Execute"**: Move to Usage section

### 2. Working with AI → REMOVE Section

**Rationale**: AI is integrated throughout LeanSpec, not a separate concern.

**Content Migration**:
- Setup content → Merge into "Getting Started" 
- AGENTS.md reference → Keep in Getting Started
- Best practices → Move to new "AI-Assisted Spec Writing" in Usage
- Examples → Distribute to relevant Usage sections

### 3. Features + Workflow → Unified "Usage" Section

**New Structure**:
```
Usage/
  Essential Usage/
    - Creating & Managing Specs (create, update, archive)
    - Finding Specs (list, search, view)
    - Spec Structure (frontmatter, content sections)
  
  Project Management/
    - Board & Stats (kanban view, analytics)
    - Dependencies (related vs depends_on)
    - Validation & Quality (validate command, complexity analysis)
  
  Advanced Features/
    - Templates (minimal, standard, enterprise)
    - Custom Fields (extending frontmatter)
    - Variables & Configuration
    - Sub-Specs (for complex specs)
  
  AI-Assisted Writing/
    - Writing Specs AI Can Execute (12 patterns - moved from Core Concepts)
    - MCP Integration (setup, usage)
    - Agent Configuration (AGENTS.md)
```

**Changes**:
- **NEW "Essential Usage"**: Fill gap - document create, update, list, search, view basics
- **NEW "Project Management"**: Combine board/stats/deps/validate (formerly "Workflow")
- **NEW "Advanced Features"**: Templates, custom fields, variables (formerly "Features")
- **NEW "AI-Assisted Writing"**: Consolidate all AI-related HOW content
- **Add cross-links to Reference**: Each page links to relevant CLI/Config/Frontmatter reference docs

### Navigation Flow

**Progressive Learning Path**:
```
1. Introduction (Overview → Getting Started)
   ↓
2. Core Concepts (WHY - positioning, principles, philosophy)
   ↓
3. Usage (HOW - basic → project mgmt → advanced → AI)
   ↓
4. Reference (CLI, Config, Frontmatter, MCP API)
```
