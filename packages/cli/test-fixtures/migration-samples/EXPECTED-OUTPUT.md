# Expected Migration Outputs

This document shows what the migrated LeanSpec structure should look like after migration from each source tool.

## OpenSpec → LeanSpec

**Before Migration:**
```
openspec/
├── specs/
│   ├── auth/spec.md
│   ├── api-gateway/spec.md
│   └── user-management/spec.md
└── changes/archive/
    └── 2024-11-15-oauth-integration/spec.md
```

**After Migration:**
```
specs/
├── 001-user-authentication/
│   └── README.md                    # From openspec/specs/auth/spec.md
├── 002-api-gateway/
│   └── README.md                    # From openspec/specs/api-gateway/spec.md
├── 003-user-management/
│   └── README.md                    # From openspec/specs/user-management/spec.md
└── 004-oauth-integration/
    └── README.md                    # From openspec/changes/archive/.../spec.md
```

**Frontmatter Example:**
```yaml
---
status: complete
priority: high
tags:
  - auth
  - security
  - mvp
created_at: '2024-03-15T10:23:45Z'
updated_at: '2024-11-08T14:30:12Z'
completed_at: '2024-03-20T16:45:00Z'
assignee: Alice Chen
---
```

---

## spec-kit → LeanSpec

**Before Migration:**
```
.specify/
└── specs/
    ├── 001-task-management/
    │   ├── spec.md
    │   ├── plan.md
    │   ├── tasks.md
    │   └── contracts/
    │       └── tasks-api.yml
    ├── 002-user-authentication/
    │   └── spec.md
    └── 003-notifications/
        └── spec.md
```

**After Migration (Option A: Keep Sub-Specs):**
```
specs/
├── 001-task-management/
│   ├── README.md                    # Renamed from spec.md
│   ├── IMPLEMENTATION.md            # Renamed from plan.md
│   ├── tasks.md                     # Keep as-is (tracking file)
│   └── contracts/                   # Keep as-is
│       └── tasks-api.yml
├── 002-user-authentication/
│   └── README.md
└── 003-notifications/
    └── README.md
```

**After Migration (Option B: Consolidate Simple Specs):**
```
specs/
├── 001-task-management/             # Complex: keep multi-file
│   ├── README.md
│   ├── IMPLEMENTATION.md
│   ├── tasks.md
│   └── contracts/
│       └── tasks-api.yml
├── 002-user-authentication/         # Simple: single file
│   └── README.md                    # Merged spec.md content
└── 003-notifications/               # Simple: single file
    └── README.md
```

**Frontmatter Example:**
```yaml
---
status: in-progress
priority: medium
tags:
  - product
  - backend
  - v1.0
created_at: '2024-05-10T09:15:30Z'
updated_at: '2024-11-10T11:45:22Z'
assignee: Bob Johnson
---
```

---

## ADR → LeanSpec

**Before Migration:**
```
docs/
└── adr/
    ├── 0001-use-microservices.md
    ├── 0042-event-sourcing-audit.md
    ├── 0105-graphql-api.md
    └── 0203-kubernetes-deployment.md
```

**After Migration:**
```
specs/
├── 001-use-microservices/
│   └── README.md                    # From 0001-use-microservices.md
├── 002-event-sourcing-audit/
│   └── README.md                    # From 0042-event-sourcing-audit.md
├── 003-graphql-api/
│   └── README.md                    # From 0105-graphql-api.md
└── 004-kubernetes-deployment/
    └── README.md                    # From 0203-kubernetes-deployment.md
```

**Frontmatter Example:**
```yaml
---
status: complete                     # ADR "Accepted" → "complete"
priority: high
tags:
  - architecture
  - infrastructure
  - adr
created_at: '2024-03-15T14:20:10Z'
updated_at: '2024-03-15T14:20:10Z'  # ADRs usually don't change
completed_at: '2024-03-15T14:20:10Z'
assignee: Tech Lead Team
---
```

**Status Mapping for ADRs:**
- ADR "Accepted" → LeanSpec `status: complete`
- ADR "Proposed" → LeanSpec `status: planned`
- ADR "Superseded" → LeanSpec `status: archived` (add `superseded_by` note)
- ADR "Deprecated" → LeanSpec `status: archived`

---

## Common Frontmatter Fields After Migration

All migrated specs should have these fields populated:

### System-Managed (via `lean-spec backfill`)
```yaml
status: planned | in-progress | complete | archived
created_at: '2024-MM-DDTHH:mm:ssZ'      # From first git commit
updated_at: '2024-MM-DDTHH:mm:ssZ'      # From last git commit
```

### Optional (via `lean-spec backfill --assignee`)
```yaml
assignee: FirstName LastName            # From first git commit author
```

### Optional (via `lean-spec backfill --all`)
```yaml
completed_at: '2024-MM-DDTHH:mm:ssZ'    # When status became 'complete'
transitions:                             # Full status history
  - status: planned
    timestamp: '2024-03-15T10:00:00Z'
  - status: in-progress
    timestamp: '2024-03-16T09:30:00Z'
  - status: complete
    timestamp: '2024-03-20T16:45:00Z'
```

### Manually Set (via `lean-spec update`)
```yaml
priority: low | medium | high | critical  # Default: medium
tags:                                     # Extract from content/folders
  - feature-name
  - team-name
  - version
```

### Manually Edit (no CLI command yet)
```yaml
depends_on:                              # Blocking dependencies
  - 042-mcp-error-handling
related:                                 # Related specs
  - 043-official-launch
```

---

## Migration Validation Checklist

After migration, verify:

- [ ] All specs have valid frontmatter
- [ ] Frontmatter fields use correct format (dates, status values, etc.)
- [ ] Folder names follow `###-kebab-case` pattern
- [ ] Each spec folder has `README.md` (not `spec.md`)
- [ ] Content preserved without modification
- [ ] Relationships between specs maintained
- [ ] No duplicate sequence numbers
- [ ] All specs validate: `lean-spec validate`
- [ ] Board shows correct organization: `lean-spec board`

**Validation Commands:**
```bash
# Check spec structure and frontmatter
lean-spec validate

# Visual verification
lean-spec board

# Check specific spec
lean-spec view 001-spec-name

# List all specs with metadata
lean-spec list --json | jq .
```

---

## Troubleshooting Common Issues

### Issue: Missing frontmatter fields

**Symptom**: `lean-spec validate` reports missing required fields

**Solution**:
```bash
# Run backfill to populate timestamps
lean-spec backfill

# Manually set missing fields
lean-spec update <spec> --status <status>
lean-spec update <spec> --priority <priority>
lean-spec update <spec> --tags <tag1,tag2>
```

### Issue: Invalid status values

**Symptom**: Status shows "Accepted", "Proposed" (ADR values)

**Solution**: Update to LeanSpec status values:
```bash
lean-spec update <spec> --status complete  # Was "Accepted"
lean-spec update <spec> --status planned   # Was "Proposed"
lean-spec update <spec> --status archived  # Was "Deprecated"
```

### Issue: Duplicate sequence numbers

**Symptom**: `lean-spec check` reports conflicts

**Solution**: Renumber manually:
```bash
mv specs/003-duplicate specs/005-duplicate
# Update any references in other specs
```

### Issue: Content formatting broken

**Symptom**: Markdown rendering issues, nested code blocks

**Solution**: LeanSpec doesn't enforce format, but check for:
- No nested code blocks (Markdown limitation)
- Valid YAML frontmatter (no tabs, correct indentation)
- Proper heading hierarchy

---

## Next Steps After Migration

1. **Validate**: Run `lean-spec validate` to check structure
2. **Review**: Use `lean-spec board` to visualize project state
3. **Adjust Metadata**: Fine-tune priority, tags, status as needed
4. **Update Relationships**: Manually add `depends_on` and `related` fields
5. **Document**: Update project README with new spec workflow
6. **Train Team**: Familiarize team with LeanSpec commands
7. **Archive Original**: Keep original specs backed up until confirmed working

**Recommended Commands:**
```bash
# After migration, run these to verify
lean-spec validate
lean-spec board
lean-spec stats

# Set up relationships
# (Edit frontmatter manually - no CLI command yet)

# Start using LeanSpec workflow
lean-spec create new-feature
lean-spec update new-feature --status in-progress
```
