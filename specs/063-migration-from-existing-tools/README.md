---
status: planned
created: '2025-11-10'
tags:
  - cli
  - migration
  - ai-assisted
  - v0.2
priority: high
created_at: '2025-11-10T05:35:31.293Z'
---

# Migration from Existing SDD Tools

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-10

**Project**: lean-spec  
**Team**: Core Development

## Overview

Add `lean-spec migrate` command to help users migrate from any specification/design tool (ADR, RFC, Linear, Confluence, etc.) to LeanSpec.

**Problem**: Teams using existing SDD tools face friction adopting LeanSpec. Manual migration is tedious and error-prone.

**Solution**: Two migration modes:
1. **Manual mode** (default): Outputs AI prompt for any AI tool
2. **AI-assisted mode**: Automated migration via Copilot/Claude/Gemini CLI

**Key insight**: By leveraging AI agents, we support unlimited formats (ADR, RFC, Linear, Notion, Jira, custom formats) without hard-coded parsers. AI analyzes document structure and maps to LeanSpec automatically.

## Design

See [DESIGN.md](./DESIGN.md) for complete technical design including:
- Command interface and options
- Migration modes (manual vs AI-assisted)
- AI provider integration
- Error handling

## Implementation

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for implementation plan including:
- Migration workflow diagram
- 5-phase development plan
- Comprehensive testing strategy

## Notes

### Design Decisions

**Why no format specification?**
- AI understands ANY format without hard-coded parsers
- Zero maintenance for new formats
- Simpler UX: just point to documents
- Follows: Intent Over Implementation

**Why instruction-based by default?**
- No API keys required
- Works with any AI tool (ChatGPT, Claude, Copilot, etc.)
- User maintains control
- Lower complexity

**Why AI-assisted auto-executes?**
- When user specifies `--with`, they want automation
- Verification ensures tools are ready
- Fails fast with clear errors
- Progressive disclosure

### Success Criteria

- Migrate ADR/RFC repos in <30 minutes
- AI-assisted migration accuracy >90%
- Zero data loss
- 80% of beta users migrate successfully without support
