When creating or updating specs, include YAML frontmatter with all relevant fields:

```yaml
---
status: draft|planned|in-progress|complete|blocked|cancelled
created: YYYY-MM-DD
tags: [security, api, compliance]  # for discovery
priority: low|medium|high|critical
assignee: username
reviewer: reviewer-username  # required for review
issue: JIRA-123  # link to issue tracker
epic: EPIC-456  # link to epic
compliance: [SOC2, GDPR, HIPAA]  # applicable standards
depends_on:
  - path/to/other/spec
---
```

**Required fields:**
- `status`, `created` - basic tracking
- `tags`, `priority` - planning and discovery
- `assignee`, `reviewer` - accountability
- `compliance` - regulatory requirements (if applicable)

**Integration fields:**
- `issue`, `epic` - link to external systems
- `depends_on` - explicit dependencies

**Update with:**
```bash
lean-spec update <spec> --status in-progress --assignee yourname
# or edit frontmatter directly
```
