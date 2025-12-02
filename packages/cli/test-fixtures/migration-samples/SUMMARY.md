# Migration Test Fixtures Summary

## What We've Created

Sample projects from 3 major spec tools for testing LeanSpec migration workflows.

```
test-fixtures/migration-samples/
├── 📘 README.md                    # Complete migration guide
├── 📘 QUICK-START.md               # Step-by-step migration practice
├── 📘 EXPECTED-OUTPUT.md           # Post-migration structure reference
│
├── openspec-sample/                # OpenSpec tool structure
│   └── openspec/
│       ├── specs/                  # Active specifications (3 specs)
│       │   ├── auth/
│       │   ├── api-gateway/
│       │   └── user-management/
│       └── changes/archive/        # Completed changes (1 spec)
│           └── 2024-11-15-oauth-integration/
│
├── spec-kit-sample/                # GitHub spec-kit structure
│   └── .specify/
│       └── specs/                  # Numbered features (3 specs)
│           ├── 001-task-management/
│           │   ├── spec.md         # Main specification
│           │   ├── plan.md         # Implementation plan
│           │   ├── tasks.md        # Task tracking
│           │   └── contracts/      # API contracts
│           ├── 002-user-authentication/
│           └── 003-notifications/
│
└── adr-sample/                     # Architecture Decision Records
    └── docs/adr/                   # Flat file structure (4 ADRs)
        ├── 0001-use-microservices.md
        ├── 0042-event-sourcing-audit.md
        ├── 0105-graphql-api.md
        └── 0203-kubernetes-deployment.md
```

## Content Statistics

- **Total Files**: 17 specification files
- **Sample Projects**: 3 (OpenSpec, spec-kit, ADR)
- **Total Specs**: 10 (4 + 3 + 3)
- **Documentation**: 3 guides (README, QUICK-START, EXPECTED-OUTPUT)

### Content Breakdown

**OpenSpec Sample** (4 specs):
- User Authentication System (JWT, OAuth2, MFA)
- API Gateway Service (Kong/Express, routing, rate limiting)
- User Management System (CRUD, email workflows)
- OAuth Integration (completed change - Google/GitHub login)

**spec-kit Sample** (3 specs):
- Task Management (complex multi-file: spec, plan, tasks, contracts)
- User Authentication (simple single-file)
- Notification System (multi-channel notifications)

**ADR Sample** (4 decisions):
- Microservices Architecture adoption
- Event Sourcing for audit trail
- GraphQL API migration from REST
- Kubernetes deployment strategy

## Use Cases

### 1. **Manual Migration Practice** 
Learn migration patterns by manually migrating sample projects.

**Time Investment:**
- spec-kit: 5 minutes ✅
- OpenSpec: 15-30 minutes ⚠️
- ADR: 30-60 minutes 🔴

### 2. **Automated Testing**
Test `lean-spec migrate` command (when implemented) against realistic data.

### 3. **Documentation & Training**
Use as examples in migration documentation and team training.

### 4. **Migration Strategy Validation**
Verify migration approaches work with realistic specs before tackling production data.

## Key Insights Demonstrated

### 1. Metadata is the Real Challenge

All three migrations require frontmatter generation:
- `status`, `priority`, `tags`
- `created_at`, `updated_at`, `completed_at`
- `assignee` (from git author)

**Solution**: `lean-spec backfill` command

### 2. Folder Complexity Varies

- **spec-kit**: Already compatible! (✅ easiest)
- **OpenSpec**: Merge two directories (⚠️ moderate)
- **ADR**: Complete reorganization (🔴 complex)

### 3. Content Never Changes

LeanSpec doesn't enforce content format. Original content preserved as-is.

## Quick Start

```bash
# Practice easiest migration first
cd test-fixtures/migration-samples
cp -r spec-kit-sample /tmp/test
cd /tmp/test

# Follow QUICK-START.md guide
cat QUICK-START.md
```

## Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `README.md` | Complete migration guide with detailed strategies | ~450 |
| `QUICK-START.md` | Step-by-step migration practice guide | ~300 |
| `EXPECTED-OUTPUT.md` | Post-migration structure reference | ~350 |
| OpenSpec specs | 4 realistic specifications | ~200 each |
| spec-kit specs | 3 specs with multi-file structure | ~150-300 each |
| ADR specs | 4 architecture decision records | ~250 each |

## Testing the Fixtures

### Validation Tests

After migration, these should all pass:

```bash
npx lean-spec validate        # No errors
npx lean-spec board           # Shows organized kanban
npx lean-spec check           # No sequence conflicts
npx lean-spec list            # Lists all migrated specs
npx lean-spec stats           # Shows accurate metrics
```

### Expected Outcomes

**Post-migration structure:**
- ✅ All specs in `specs/###-name/` format
- ✅ Each has `README.md` (not `spec.md`)
- ✅ Frontmatter populated with all required fields
- ✅ Relationships preserved
- ✅ Content unchanged

## Integration with Existing Specs

These fixtures reference and complement:

- **[063-migration-from-existing-tools](../../specs/063-migration-from-existing-tools/)** - Migration command design
- **[047-git-backfill-timestamps](../../specs/047-git-backfill-timestamps/)** - Backfill command docs
- **[012-sub-spec-files](../../specs/012-sub-spec-files/)** - Multi-file spec organization

## Future Enhancements

Potential additions:

1. **More Source Tools**
   - Linear export format
   - Notion export format
   - Confluence export format
   - Custom RFC formats

2. **Edge Cases**
   - Unicode in filenames
   - Very large specs (>1000 lines)
   - Missing git history
   - Broken frontmatter
   - Circular dependencies

3. **Automated Tests**
   - Integration tests for `lean-spec migrate`
   - Validation of migration output
   - Performance benchmarks

4. **Migration Scripts**
   - Shell scripts for each migration type
   - Python scripts for complex transformations
   - Dry-run visualization tools

## Contributing

To add new migration samples:

1. Choose realistic source tool/pattern
2. Create 3-5 authentic specs (not trivial examples)
3. Follow actual tool conventions precisely
4. Update README with migration strategy
5. Add to QUICK-START guide
6. Document expected output

**Quality Criteria:**
- ✅ Realistic technical content
- ✅ Mix of simple and complex specs
- ✅ Shows tool-specific conventions
- ✅ Includes edge cases
- ✅ Comprehensive documentation

## Related Documentation

- [Main README](../../README.md) - LeanSpec overview
- [AGENTS.md](../../AGENTS.md) - AI agent workflow
- [Migration spec](../../specs/063-migration-from-existing-tools/) - Complete spec
- [Backfill spec](../../specs/047-git-backfill-timestamps/) - Metadata extraction

---

**Status**: ✅ Complete and ready for use

**Created**: 2025-11-10

**Purpose**: Enable testing and validation of LeanSpec migration workflows

**Maintained by**: LeanSpec core team
