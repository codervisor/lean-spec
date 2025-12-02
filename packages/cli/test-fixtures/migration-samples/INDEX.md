# Migration Test Fixtures - Complete Index

Quick reference to all files in the migration samples.

## Documentation Files (4 files)

| File | Purpose | Size |
|------|---------|------|
| `README.md` | Complete migration guide with strategies for each tool | ~450 lines |
| `QUICK-START.md` | Step-by-step migration practice tutorials | ~300 lines |
| `EXPECTED-OUTPUT.md` | Post-migration structure reference with validation | ~350 lines |
| `SUMMARY.md` | High-level overview and statistics | ~200 lines |

**Start here**: `QUICK-START.md` for hands-on practice, `README.md` for comprehensive understanding.

---

## Sample Projects (3 projects, 14 spec files)

### 1. OpenSpec Sample (4 specs)

📁 `openspec-sample/openspec/`

**Active Specs** (`specs/` directory):
- `auth/spec.md` - User authentication with JWT, OAuth2, MFA (~200 lines)
- `api-gateway/spec.md` - Centralized gateway with routing and rate limiting (~180 lines)
- `user-management/spec.md` - User CRUD and profile management (~150 lines)

**Archived Changes** (`changes/archive/` directory):
- `2024-11-15-oauth-integration/spec.md` - Completed OAuth2 integration (~120 lines)

**Migration Complexity**: ⚠️ Moderate (merge directories, add numbering)

---

### 2. spec-kit Sample (3 specs, 6 files)

📁 `spec-kit-sample/.specify/specs/`

**Spec 001: Task Management** (complex multi-file):
- `001-task-management/spec.md` - Main specification (~280 lines)
- `001-task-management/plan.md` - Implementation plan with 5 phases (~200 lines)
- `001-task-management/tasks.md` - Current task tracking (~50 lines)
- `001-task-management/contracts/tasks-api.yml` - OpenAPI contract (~120 lines)

**Spec 002: User Authentication** (simple single-file):
- `002-user-authentication/spec.md` - Auth specification (~100 lines)

**Spec 003: Notifications** (moderate complexity):
- `003-notifications/spec.md` - Notification system design (~200 lines)

**Migration Complexity**: ✅ Easiest (already compatible, rename files, add frontmatter)

---

### 3. ADR Sample (4 decision records)

📁 `adr-sample/docs/adr/`

- `0001-use-microservices.md` - Microservices architecture decision (~180 lines)
- `0042-event-sourcing-audit.md` - Event sourcing implementation (~220 lines)
- `0105-graphql-api.md` - GraphQL migration from REST (~250 lines)
- `0203-kubernetes-deployment.md` - Kubernetes infrastructure (~280 lines)

**Migration Complexity**: 🔴 Complex (flat files → folders, complete renumbering)

---

## Statistics Summary

```
Total Files: 18
├── Documentation: 4 files (~1,300 lines)
└── Sample Specs: 14 files (~2,500 lines)
    ├── OpenSpec: 4 specs
    ├── spec-kit: 3 specs (6 files including sub-specs)
    └── ADR: 4 decision records

Content Coverage:
- Authentication/Authorization: 3 specs
- Infrastructure/DevOps: 3 specs
- API/Gateway: 2 specs
- User Management: 2 specs
- Task Management: 1 spec
- Notifications: 1 spec
- Architecture Decisions: 4 ADRs
```

## Quick Navigation

### By Use Case

**Learning Migration:**
1. Start: `QUICK-START.md`
2. Practice: spec-kit sample (easiest)
3. Progress: OpenSpec sample (moderate)
4. Challenge: ADR sample (complex)

**Understanding Structure:**
1. Overview: `SUMMARY.md`
2. Details: `README.md`
3. Reference: `EXPECTED-OUTPUT.md`

**Testing `lean-spec migrate` Command:**
1. Use spec-kit for smoke tests (fast)
2. Use OpenSpec for directory merging tests
3. Use ADR for complex reorganization tests

### By Migration Source

**Coming from spec-kit?** → Start with `spec-kit-sample/`, see QUICK-START.md Option 1

**Coming from OpenSpec?** → Start with `openspec-sample/`, see QUICK-START.md Option 2

**Coming from ADR/RFC?** → Start with `adr-sample/`, see QUICK-START.md Option 3

### By Complexity

**🟢 Beginner**: spec-kit sample + QUICK-START.md
**🟡 Intermediate**: OpenSpec sample + README.md
**🔴 Advanced**: ADR sample + EXPECTED-OUTPUT.md

---

## File Contents Quick Reference

### OpenSpec Specs
- **auth**: JWT, bcrypt, OAuth2, MFA, session management, token rotation
- **api-gateway**: Kong/Express, routing, rate limiting, circuit breakers, load balancing
- **user-management**: CRUD, email verification, password reset, soft delete, audit logs
- **oauth-integration**: Google/GitHub social login, account linking, metrics

### spec-kit Specs
- **task-management**: Task CRUD, WebSocket real-time, subtasks, drag-drop, API contracts
- **user-authentication**: JWT tokens, OAuth2, MFA, password reset
- **notifications**: Multi-channel (in-app, email, push), preferences, quiet hours, digest

### ADR Specs
- **microservices**: Service boundaries, API gateway, data ownership, fault isolation
- **event-sourcing**: Audit trail, temporal queries, CQRS, event store, snapshots
- **graphql-api**: Apollo Server, DataLoader, schema-first, federation, subscriptions
- **kubernetes**: EKS cluster, HPA auto-scaling, blue-green deploys, Istio service mesh

---

## Testing Checklist

After migrating any sample, verify:

```bash
# Structure
✅ All specs in specs/###-name/ format
✅ Each folder has README.md (not spec.md)
✅ Sub-specs preserved where appropriate

# Metadata
✅ All frontmatter fields populated
✅ Valid status values (planned/in-progress/complete/archived)
✅ Timestamps from git history (created_at, updated_at)
✅ Priority set appropriately
✅ Tags added

# Validation
✅ lean-spec validate passes with no errors
✅ lean-spec board shows specs correctly
✅ lean-spec check shows no conflicts
✅ lean-spec list displays all specs

# Content
✅ Original content preserved unchanged
✅ No broken markdown formatting
✅ Code blocks render correctly
✅ Links still work
```

---

## Common Migration Patterns

### Pattern 1: Rename + Backfill (spec-kit)
```bash
mv .specify/specs specs/
find specs -name 'spec.md' -execdir mv {} README.md \;
lean-spec backfill --assignee
```

### Pattern 2: Merge + Reorganize (OpenSpec)
```bash
mkdir -p specs/001-name
cp openspec/specs/name/spec.md specs/001-name/README.md
lean-spec backfill --assignee
lean-spec update 001-name --status complete
```

### Pattern 3: Flatten + Renumber (ADR)
```bash
mkdir -p specs/001-name
mv docs/adr/0042-name.md specs/001-name/README.md
lean-spec backfill --assignee
lean-spec update 001-name --status complete --tags architecture,adr
```

---

## Related Specs

- **[063-migration-from-existing-tools](../../specs/063-migration-from-existing-tools/)** - Migration command design
- **[047-git-backfill-timestamps](../../specs/047-git-backfill-timestamps/)** - Metadata extraction from git
- **[012-sub-spec-files](../../specs/012-sub-spec-files/)** - Multi-file spec organization
- **[018-spec-validation](../../specs/018-spec-validation/)** - Validation rules and CLI

---

## Maintenance Notes

**Last Updated**: 2025-11-10

**Version**: 1.0

**Status**: ✅ Complete and validated

**Contributors**: LeanSpec core team

**Feedback**: Open an issue or PR if you find issues or have suggestions for additional samples.
