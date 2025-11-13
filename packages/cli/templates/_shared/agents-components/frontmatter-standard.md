When creating or updating specs, include YAML frontmatter at the top:

```yaml
---
status: draft|planned|in-progress|complete|blocked|cancelled
created: YYYY-MM-DD
tags: [tag1, tag2]  # helps with discovery
priority: low|medium|high  # helps with planning
assignee: username  # for team coordination
---
```

**Core fields:**
- `status` and `created` are required
- `tags` help with discovery and organization
- `priority` helps teams plan work
- `assignee` shows who's working on what

**Update status with:**
```bash
lean-spec update <spec> --status in-progress --assignee yourname
# or edit frontmatter directly
```
