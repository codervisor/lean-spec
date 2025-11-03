---
status: complete
created: '2025-11-01'
tags:
  - documentation
  - ai-agents
  - templates
priority: medium
depends_on:
  - 20251101/002-structured-frontmatter
  - 20251101/003-pm-visualization-tools
completed: '2025-11-01'
---

# system-prompt-updates

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-01 · **Tags**: documentation, ai-agents, templates


## Overview

Once structured frontmatter and PM visualization tools are implemented, AI agents should know about them and use them effectively. We need to update `AGENTS.md` in all templates to guide agents on:

1. **Using frontmatter** when creating/updating specs
2. **Leveraging PM commands** for project context and discovery
3. **Understanding spec status** before making changes

This ensures AI agents become better teammates by using the full LeanSpec toolset.

## Design

### What to Add to AGENTS.md

#### 1. Frontmatter Guidance

Add section on using frontmatter when creating specs:

**Minimal (solo developers):**
- Just `status` and `created` fields

**Standard (teams):**
- Add `tags`, `priority`, `assignee`

**Updating status:**
- Use `lspec update` command or edit frontmatter directly

#### 2. Discovery Commands

Add section on discovery before starting work:
- `lspec stats` - See work distribution
- `lspec board` - View specs by status
- `lspec list --tag=api` - Find relevant specs
- `lspec search "topic"` - Full-text search
- `lspec deps <spec>` - Check dependencies

#### 3. Workflow Integration

Add AI agent workflow section:
1. Understand context (run stats/board/search)
2. Check dependencies before starting
3. Create or update spec with frontmatter
4. Keep specs in sync with implementation
5. Use interactive mode optionally

#### 4. Template-Specific Guidance

**For minimal template:**
- Emphasize `status` and `created` only
- Keep it simple, optional fields are truly optional

**For standard template:**
- Encourage `tags` and `priority`
- Mention `assignee` for team coordination

**For enterprise template:**
- Full field usage with `issue`, `epic`, `reviewer`
- Integration with external tools
- Compliance tracking fields

### Files to Update

All template AGENTS.md files need updates:
- `AGENTS.md` (root) - Update main file
- `templates/minimal/files/AGENTS.md` - Minimal guidance
- `templates/standard/files/AGENTS.md` - Standard guidance  
- `templates/enterprise/files/AGENTS.md` - Full guidance

### Key Additions to Each Template

**All templates get:**
- Discovery commands section (stats, board, search, deps)
- Workflow integration steps
- Frontmatter usage examples appropriate to template tier
- Updated workflow that includes checking existing specs

**Template-specific customization:**
- Minimal: Focus on basics, minimal fields
- Standard: Full workflow, team coordination
- Enterprise: Advanced features, compliance, integrations

## Plan

- [ ] Update root `AGENTS.md` with frontmatter and PM commands
- [ ] Update `templates/minimal/files/AGENTS.md` (minimal guidance)
- [ ] Update `templates/standard/files/AGENTS.md` (standard guidance)
- [ ] Update `templates/enterprise/files/AGENTS.md` (full guidance)
- [ ] Add examples for each template tier
- [ ] Create integration guide for popular AI coding tools (Cursor, GitHub Copilot, etc.)
- [ ] Update README.md to reference updated agent instructions
- [ ] Add troubleshooting section for common agent mistakes

## Test

- [ ] AI agents can parse and follow updated instructions
- [ ] Template-specific guidance is appropriate for each tier
- [ ] Examples are clear and actionable
- [ ] Commands work as documented
- [ ] Integration with popular AI tools (test with Cursor, Copilot)
- [ ] Agents understand when to use specs vs skip them
- [ ] Agents properly update frontmatter when working on specs
- [ ] Documentation is discoverable (README points to AGENTS.md)

## Notes

### Why This Matters

AI agents are powerful but need clear instructions. By updating system prompts with:
- Structured frontmatter usage
- Discovery commands for context
- Clear workflow integration

We turn AI agents into better teammates who:
1. Understand project state before acting
2. Keep specs in sync with implementation
3. Use the full LeanSpec toolset effectively
4. Follow team conventions consistently

### Progressive Disclosure

Match guidance to template complexity:
- **Minimal**: Basic commands only, don't overwhelm
- **Standard**: Full workflow, team coordination
- **Enterprise**: Advanced features, compliance, integrations

### AI Tool Integration

Consider creating tool-specific guides:
- **Cursor**: `.cursorrules` integration examples
- **GitHub Copilot**: Workspace instructions format
- **Cline/Aider**: Custom prompt patterns
- **Continue**: Context provider setup

### Testing with AI

After updates, test with real AI coding assistants:
1. Ask them to create a spec
2. Check if they use frontmatter correctly
3. Verify they run discovery commands
4. Ensure they update status appropriately

### Future: AI-Specific Commands

Consider commands that help AI agents:
```bash
lspec context          # Output formatted for AI context
lspec summary --ai     # AI-optimized summary format
lspec related <topic>  # Find related specs for context
```
