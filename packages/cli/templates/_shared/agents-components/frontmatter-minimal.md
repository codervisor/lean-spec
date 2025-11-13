When creating or updating specs, add YAML frontmatter at the top:

```yaml
---
status: draft|planned|in-progress|complete|blocked|cancelled
created: YYYY-MM-DD
---
```

**Keep it simple:**
- Just `status` and `created` fields
- Other fields are optional - only add if helpful
- Update `status` as work progresses

**Update status with:**
```bash
lean-spec update <spec> --status in-progress
```
