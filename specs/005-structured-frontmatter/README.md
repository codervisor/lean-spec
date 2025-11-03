---
status: complete
created: 2025-11-01
tags:
  - enhancement
  - spec-management
  - metadata
priority: medium
completed: '2025-11-01'
---

# structured-frontmatter

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-01 · **Tags**: enhancement, spec-management, metadata

## Overview

Currently, LeanSpec specs use inline text fields (`**Status**: Complete`, `**Created**: 2025-10-31`) which are human-readable but difficult to parse programmatically. This makes it hard to:

- Filter specs by status (planned, in-progress, complete, archived)
- Query specs by tags or categories
- Build tooling for spec management (dashboards, reports)
- Track metadata consistently across specs

**Solution**: Add structured YAML frontmatter to specs for better metadata management while maintaining readability.

## Design

### Frontmatter Structure

#### Core Fields (Required)

```yaml
---
status: planned | in-progress | complete | archived
created: YYYY-MM-DD
---
```

That's it for the basics. These two fields give you filtering and tracking.

#### Recommended Fields (High Value, Low Overhead)

```yaml
---
status: in-progress
created: 2025-11-01
tags: [feature, api]        # Quick categorization
priority: high              # Focus management
---
```

Most users should stop here. These 4 fields cover 90% of needs.

#### Power User Fields (Use Sparingly)

Only add these when they genuinely help:

```yaml
---
# Dependencies (when specs actually block each other)
related: [20251031/001-typescript-cli, 20251101/001-existing-project]
depends_on: [20251031/003-init-system]

# Temporal (mostly auto-managed)
updated: YYYY-MM-DD         # auto-updated
completed: YYYY-MM-DD       # auto-set when status=complete

# Team coordination (for larger teams)
assignee: username
reviewer: username

# External links (when needed)
issue: #123
pr: #456
epic: epic-name

# Flags (when relevant)
breaking: true
---
```

**Note**: Spec references use full path `YYYYMMDD/NNN-name` for uniqueness across dates.

**Philosophy**: Start minimal. Add fields only when you feel the pain of not having them.

### Implementation Approach

1. **Template Updates**: 
   - `minimal/`: `status`, `created`
   - `standard/`: + `tags`, `priority`
   - `enterprise/`: + `assignee`, `reviewer`, `issue`, `epic`

2. **CLI Support**: 
   - Parse frontmatter when listing specs
   - Common filters: `lspec list --status=in-progress --tag=api --priority=high`
   - Quick updates: `lspec update <spec> --status=complete`
   - Validation: warn on unknown fields, validate enum values

3. **Smart Defaults**:
   - Auto-update `updated` timestamp on file changes (if field exists)
   - Set `completed` date when status changes to complete (if field exists)

4. **Backward Compatibility**: Inline fields (`**Status**: Complete`) work as fallback

5. **Progressive Enhancement**: Users can add fields as needed without migration

### Field Usage Guidelines

**Default recommendation**: `status`, `created`, `tags`, `priority` - stop there.

**Add more only when you need them**. If you're not sure, you don't need it.

**Template defaults:**
- **Minimal**: `status`, `created` only
- **Standard**: `status`, `created`, `tags`, `priority`
- **Enterprise**: Standard + team fields (assignee, reviewer) + links (issue, epic)

### Example Specs

**Typical Solo Developer:**
```markdown
---
status: in-progress
created: 2025-11-01
tags: [feature, cli]
---

# add-list-command

## Overview
...
```

**Small Team:**
```markdown
---
status: planned
created: 2025-11-01
tags: [api, breaking-change]
priority: high
assignee: alice
related: [20251031/001-typescript-cli]
---

# api-v2-migration

## Overview
...
```

**Enterprise (Maximum Fields):**
```markdown
---
status: in-progress
created: 2025-10-28
updated: 2025-11-01
tags: [security, compliance]
priority: critical
assignee: security-team
reviewer: ciso
depends_on: [20251031/001-typescript-cli]
issue: JIRA-1234
epic: security-hardening
breaking: true
---

# oauth2-migration

## Overview
...
```

## Plan

- [ ] Define minimal field schema (status, created as required)
- [ ] Add frontmatter parsing library (`gray-matter`)
- [ ] Update template files: minimal (2 fields), standard (4 fields), enterprise (8-10 fields)
- [ ] Implement frontmatter parser with validation
- [ ] Add filtering to `lspec list` (status, tags, priority)
- [ ] Create `lspec update` command for status changes
- [ ] Add smart defaults for optional timestamp fields
- [ ] Update documentation emphasizing minimalism
- [ ] Add tests for core fields + graceful handling of extra fields

## Test

- [ ] CLI parses minimal frontmatter (status, created)
- [ ] Filtering works: `lspec list --status=planned --tag=api`
- [ ] `lspec update <spec> --status=complete` updates correctly
- [ ] Old specs without frontmatter still work (fallback)
- [ ] Templates generate appropriate field sets per tier
- [ ] Unknown fields generate warnings but don't fail
- [ ] Auto-timestamps work when fields are present (optional)
- [ ] Query performance acceptable with 100+ specs

## Notes

### Why Frontmatter?

- Industry standard (Jekyll, Hugo, Gatsby, etc.)
- Human-readable and git-friendly
- Easy to parse with existing libraries
- Doesn't clutter the main content
- Extensible for future metadata needs

### Alternatives Considered

1. **JSON/TOML frontmatter**: More verbose, less common
2. **Inline structured comments**: Harder to parse reliably
3. **Separate metadata files**: Introduces file synchronization issues
4. **Database/external store**: Against LeanSpec's file-first philosophy

### Future Extensions

Only build these if users ask for them:

- `lspec stats` - "5 in-progress, 12 complete" summary
- `lspec board` - Kanban-style view by status (planned | in-progress | complete)
- `lspec gantt` - Timeline view with dependencies and due dates
- `lspec timeline` - Visualize spec creation/completion over time
- `lspec deps <spec>` - Show dependency graph (depends_on, blocks visualization)
- `lspec search` - Full-text search with metadata filters
- Export formats: JSON, CSV, markdown table for reporting
- Integration hooks: webhook on status change, sync to Jira/Linear
- AI suggestions: auto-tag based on content, suggest related specs
- Metrics: cycle time (created → complete), blocked time tracking

**Vision**: With structured metadata, LeanSpec can evolve from a simple file tool into a powerful project visibility system while staying true to its lean, file-first philosophy.
