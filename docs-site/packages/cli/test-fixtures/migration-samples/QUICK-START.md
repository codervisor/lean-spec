# Quick Start: Testing Migration

Quick guide to test LeanSpec migrations using these sample projects.

## Setup

```bash
cd test-fixtures/migration-samples
```

## Option 1: spec-kit (Easiest - 5 minutes)

**Why start here**: spec-kit is already 90% compatible with LeanSpec!

```bash
# 1. Copy to temp location
cp -r spec-kit-sample /tmp/test-spec-kit
cd /tmp/test-spec-kit

# 2. Initialize git (needed for backfill)
git init
git add .
git commit -m "Initial import from spec-kit"

# 3. Move from .specify/specs to specs/
mv .specify/specs specs/
rmdir .specify

# 4. Rename spec.md → README.md
find specs -name 'spec.md' -execdir mv {} README.md \;

# 5. Generate frontmatter from git
npx lean-spec backfill --assignee

# 6. Validate
npx lean-spec validate
npx lean-spec board

# ✅ Done! Migration complete.
```

**Expected Result**: 3 specs, all with proper frontmatter, multi-file structure preserved.

---

## Option 2: OpenSpec (Moderate - 15 minutes)

**Challenge**: Merge specs + changes directories, add numbering

```bash
# 1. Copy to temp location
cp -r openspec-sample /tmp/test-openspec
cd /tmp/test-openspec

# 2. Initialize git
git init
git add .
git commit -m "Initial import from OpenSpec"

# 3. Create new specs directory
mkdir -p specs

# 4. Copy and reorganize each spec
mkdir -p specs/001-user-authentication
cp openspec/specs/auth/spec.md specs/001-user-authentication/README.md

mkdir -p specs/002-api-gateway
cp openspec/specs/api-gateway/spec.md specs/002-api-gateway/README.md

mkdir -p specs/003-user-management
cp openspec/specs/user-management/spec.md specs/003-user-management/README.md

mkdir -p specs/004-oauth-integration
cp openspec/changes/archive/2024-11-15-oauth-integration/spec.md specs/004-oauth-integration/README.md

# 5. Commit reorganization
git add specs/
git commit -m "Reorganize to LeanSpec structure"

# 6. Generate frontmatter
npx lean-spec backfill --assignee

# 7. Set appropriate status for each spec
npx lean-spec update 001-user-authentication --status complete --priority high
npx lean-spec update 002-api-gateway --status complete --priority high
npx lean-spec update 003-user-management --status in-progress --priority medium
npx lean-spec update 004-oauth-integration --status complete --priority high

# 8. Add tags
npx lean-spec update 001-user-authentication --tags auth,security,mvp
npx lean-spec update 002-api-gateway --tags infrastructure,gateway,mvp
npx lean-spec update 003-user-management --tags backend,api,mvp
npx lean-spec update 004-oauth-integration --tags auth,oauth,enhancement

# 9. Validate
npx lean-spec validate
npx lean-spec board

# ✅ Done! 4 specs migrated from OpenSpec structure.
```

---

## Option 3: ADR (Complex - 30 minutes)

**Challenge**: Flat files → folder hierarchy + complete renumbering

```bash
# 1. Copy to temp location
cp -r adr-sample /tmp/test-adr
cd /tmp/test-adr

# 2. Initialize git
git init
git add .
git commit -m "Initial ADR collection"

# 3. Create specs directory
mkdir -p specs

# 4. Migrate each ADR to folder structure
mkdir -p specs/001-use-microservices
mv docs/adr/0001-use-microservices.md specs/001-use-microservices/README.md

mkdir -p specs/002-event-sourcing-audit
mv docs/adr/0042-event-sourcing-audit.md specs/002-event-sourcing-audit/README.md

mkdir -p specs/003-graphql-api
mv docs/adr/0105-graphql-api.md specs/003-graphql-api/README.md

mkdir -p specs/004-kubernetes-deployment
mv docs/adr/0203-kubernetes-deployment.md specs/004-kubernetes-deployment/README.md

# 5. Commit reorganization
git add specs/
git commit -m "Reorganize ADRs to LeanSpec structure"

# 6. Generate frontmatter
npx lean-spec backfill --assignee

# 7. Set status (ADRs are usually complete decisions)
npx lean-spec update 001-use-microservices --status complete --priority high
npx lean-spec update 002-event-sourcing-audit --status complete --priority high
npx lean-spec update 003-graphql-api --status complete --priority medium
npx lean-spec update 004-kubernetes-deployment --status complete --priority high

# 8. Add tags (architectural decisions)
npx lean-spec update 001-use-microservices --tags architecture,adr,microservices
npx lean-spec update 002-event-sourcing-audit --tags architecture,adr,event-sourcing
npx lean-spec update 003-graphql-api --tags architecture,adr,graphql,api
npx lean-spec update 004-kubernetes-deployment --tags infrastructure,adr,kubernetes

# 9. Validate
npx lean-spec validate
npx lean-spec board

# ✅ Done! ADR collection migrated to LeanSpec.
```

---

## Comparing Results

After completing any migration, check:

```bash
# View all specs
npx lean-spec list

# See project dashboard
npx lean-spec board

# Get project stats
npx lean-spec stats

# View a specific spec
npx lean-spec view 001-use-microservices

# Check for issues
npx lean-spec validate
```

---

## Expected Timings

Based on 20 specs:

| Source | Time | Complexity |
|--------|------|------------|
| spec-kit | **< 5 min** | ✅ Rename files, backfill metadata |
| OpenSpec | **15-30 min** | ⚠️ Merge directories, renumber, set metadata |
| ADR | **30-60 min** | 🔴 Complete reorganization, renumber, map status |

**Key Insight**: Most time is spent on metadata management, not content changes!

---

## Common Commands Reference

```bash
# Create new spec
npx lean-spec create <name>

# Update metadata (NEVER edit frontmatter manually!)
npx lean-spec update <spec> --status <status>
npx lean-spec update <spec> --priority <priority>
npx lean-spec update <spec> --tags <tag1,tag2>
npx lean-spec update <spec> --assignee <name>

# Backfill from git history
npx lean-spec backfill                 # Timestamps only
npx lean-spec backfill --assignee      # Include assignee
npx lean-spec backfill --all           # Full metadata
npx lean-spec backfill --dry-run       # Preview

# Validation and viewing
npx lean-spec validate                 # Check for issues
npx lean-spec board                    # Kanban view
npx lean-spec list                     # List all specs
npx lean-spec view <spec>              # View spec content
npx lean-spec stats                    # Project statistics
```

---

## Cleanup

```bash
# Remove test directories when done
rm -rf /tmp/test-spec-kit
rm -rf /tmp/test-openspec
rm -rf /tmp/test-adr
```

---

## Next Steps

After successful migration practice:

1. **Test on real project**: Try migrating your actual specs
2. **Customize workflow**: Adapt patterns to your team's needs
3. **Document process**: Create team-specific migration guide
4. **Train team**: Share learnings with teammates
5. **Iterate**: Refine based on feedback

## Troubleshooting

**Q: "lean-spec backfill" shows no changes**

A: Make sure you've committed files to git first. Backfill extracts metadata from git history.

**Q: Validation fails with "missing required fields"**

A: Run `npx lean-spec backfill` first, then set missing fields with `npx lean-spec update`.

**Q: Status values from ADR not recognized**

A: ADR uses different status names. Map them:
- "Accepted" → `--status complete`
- "Proposed" → `--status planned`
- "Deprecated" → `--status archived`

**Q: Can't find lean-spec command**

A: Install globally: `npm install -g lean-spec` or use `npx lean-spec`

---

## Resources

- [README.md](./README.md) - Detailed migration guide
- [EXPECTED-OUTPUT.md](./EXPECTED-OUTPUT.md) - See expected results
- [spec 063](../../specs/063-migration-from-existing-tools/) - Migration spec
- [spec 047](../../specs/047-git-backfill-timestamps/) - Backfill documentation
