---
status: complete
created: '2025-11-10'
tags:
  - cli
  - migration
  - ai-assisted
  - v0.2
priority: high
created_at: '2025-11-10T05:35:31.293Z'
updated_at: '2025-11-28T01:50:23.546Z'
transitions:
  - status: in-progress
    at: '2025-11-10T06:39:58.417Z'
  - status: complete
    at: '2025-11-10T06:48:06.343Z'
completed_at: '2025-11-10T06:48:06.343Z'
completed: '2025-11-10'
related:
  - 128-constant-time-migration
---

# Migration from Existing SDD Tools

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-10 · **Tags**: cli, migration, ai-assisted, v0.2

**Project**: lean-spec  
**Team**: Core Development

## Overview

Add `lean-spec migrate` command to help users migrate from mainstream SDD tools to LeanSpec.

**Problem**: Teams using existing SDD tools have different folder/file organization. Manually reorganizing specs is tedious and error-prone.

**Solution**: Two migration modes:
1. **Manual mode** (default): Outputs AI prompt for any AI tool
2. **AI-assisted mode**: Automated migration via Copilot/Claude/Gemini CLI

**Key Insight:** The real migration challenge is **metadata/frontmatter**, not folder structure or content format:
- **Folder structure**: spec-kit already uses `specs/###-name/` (compatible!)
- **Content format**: LeanSpec is flexible—keep your existing content
- **Metadata**: Need to generate system-managed frontmatter (status, priority, tags, timestamps)
- **Solution**: Use `lean-spec backfill` to extract metadata from git history + existing docs

**Primary Migration Sources:**
1. **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** - `openspec/specs/` + `openspec/changes/` structure (needs folder merge)
2. **[GitHub spec-kit](https://github.com/github/spec-kit)** - `.specify/specs/` (already compatible! just needs frontmatter)
3. **Document collections** - ADR folders, RFC directories, scattered docs (need folder reorganization)
4. **System prompts** - AGENTS.md, Cursorrules, etc. (guide AI behavior during/after migration)

**External Systems:** Support exported documents only (no API integration). Users export to markdown/JSON, then migrate those files.

## Design

See [DESIGN.md](./DESIGN.md) for complete technical design including:
- Command interface and options
- Migration modes (manual vs AI-assisted)
- AI provider integration
- Error handling

See [EXAMPLES.md](./EXAMPLES.md) for detailed folder reorganization examples:
- OpenSpec → LeanSpec (merging specs + changes directories)
- spec-kit → LeanSpec (consolidating multi-file features)
- ADR → LeanSpec (flat files to folder hierarchy)

## Implementation

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for implementation plan including:
- Migration workflow diagram
- 5-phase development plan
- Comprehensive testing strategy

## Notes

### Design Decisions

**Why focus on metadata/frontmatter, not content or folders?**
- LeanSpec doesn't enforce content structure—users write however they want
- spec-kit already uses compatible folder structure (`specs/###-name/`)
- The real challenge: generating system-managed frontmatter (status, priority, tags, timestamps)
- Use `lean-spec backfill` to extract metadata from git history and existing docs
- OpenSpec and ADR need folder reorganization, but that's secondary
- Follows: Intent Over Implementation (automate metadata extraction, preserve content)

**Why focus on file-based specs (OpenSpec, spec-kit, ADR)?**
- Mainstream SDD tools used by engineering teams
- Git-based, version-controlled, no API complexity
- OpenSpec and spec-kit are AI-native and well-structured
- Avoids authentication and external system dependencies

**Why exported documents only for external systems?**
- API integration requires auth, keys, rate limits, ongoing maintenance
- Security concerns with storing/managing credentials
- Export-then-migrate keeps tool simple and secure
- Users already have export workflows (Linear→markdown, etc.)

**Why instruction-based by default?**
- No API keys required
- Works with any AI tool (ChatGPT, Claude, Copilot, etc.)
- User maintains control
- Lower complexity

**Why AI-assisted auto-executes?**
- When user specifies `--with`, they want automation
- Verification ensures tools are ready
- Fails fast with clear errors

**Why migrate system prompts (AGENTS.md)?**
- OpenSpec and spec-kit have AGENTS.md files guiding AI behavior
- LeanSpec also uses AGENTS.md for AI workflow instructions
- Migration should preserve AI guidance, not just specs
- Consider migrating: AGENTS.md, .cursorrules, .github/copilot-instructions.md
- Ensures continuity of AI-assisted development workflows

### Success Criteria

- Migrate ADR/RFC repos in <30 minutes
- AI-assisted migration accuracy >90%
- Zero data loss
- 80% of beta users migrate successfully without support
