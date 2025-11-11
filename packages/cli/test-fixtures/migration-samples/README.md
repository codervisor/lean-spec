# Migration Test Fixtures

Sample projects from different spec tools for testing LeanSpec migration workflows.

## Overview

These fixtures represent realistic spec structures from mainstream SDD tools. Use them for:

- **Manual Migration Testing**: Practice migrating from other tools
- **Automated Testing**: Test `lean-spec migrate` command (when implemented)
- **Documentation**: Illustrate migration examples
- **Training**: Learn migration patterns and best practices

## Sample Projects

### 1. OpenSpec Sample (`openspec-sample/`)

Simulates the [OpenSpec](https://github.com/Fission-AI/OpenSpec) folder structure.

**Structure:**
```
openspec/
├── specs/                    # Current/active specifications
│   ├── auth/
│   │   └── spec.md
│   ├── api-gateway/
│   │   └── spec.md
│   └── user-management/
│       └── spec.md
└── changes/archive/          # Completed changes
    └── 2024-11-15-oauth-integration/
        └── spec.md
```

**Key Characteristics:**
- Separate directories for active specs vs completed changes
- Each spec in its own folder with `spec.md` filename
- No sequence numbering
- Descriptive folder names

**Migration Challenge**: 
- **Primary**: Generate frontmatter metadata (status, priority, tags, timestamps)
- **Secondary**: Merge `specs/` and `changes/archive/` into single `specs/` directory with numbering

**Migration Strategy:**
```bash
# 1. Reorganize folders
mkdir -p specs/001-user-authentication
cp openspec/specs/auth/spec.md specs/001-user-authentication/README.md

mkdir -p specs/002-api-gateway
cp openspec/specs/api-gateway/spec.md specs/002-api-gateway/README.md

mkdir -p specs/003-user-management
cp openspec/specs/user-management/spec.md specs/003-user-management/README.md

# 2. Generate metadata from git history
cd specs/
lean-spec backfill --assignee --all

# 3. Manually adjust status, priority, tags as needed
lean-spec update 001-user-authentication --status complete --priority high
```

---

### 2. spec-kit Sample (`spec-kit-sample/`)

Simulates the [GitHub spec-kit](https://github.com/github/spec-kit) structure.

**Structure:**
```
.specify/                      # Note the dot-prefix!
└── specs/
    ├── 001-task-management/
    │   ├── spec.md           # Main specification
    │   ├── plan.md           # Implementation plan
    │   ├── tasks.md          # Task tracking
    │   └── contracts/
    │       └── tasks-api.yml
    ├── 002-user-authentication/
    │   └── spec.md
    └── 003-notifications/
        └── spec.md
```

**Key Characteristics:**
- Uses `.specify/specs/` directory (dot-prefix)
- Already has sequence numbering (`###-name/`)
- Multiple files per feature (spec.md, plan.md, tasks.md)
- API contracts in separate files
- Very close to LeanSpec structure!

**Migration Challenge**:
- **Primary**: Generate frontmatter metadata (MAIN CHALLENGE)
- **Secondary**: Minimal folder changes (move from `.specify/specs/` to `specs/`, rename `spec.md` → `README.md`)

**Migration Strategy:**
```bash
# 1. Move and rename (easiest migration!)
mv .specify/specs specs/
find specs -name 'spec.md' -execdir mv {} README.md \;

# 2. Generate metadata from git history
cd specs/
lean-spec backfill --assignee --all

# 3. Done! Optionally consolidate multi-file specs
# Keep plan.md, tasks.md as sub-specs OR merge into README.md
```

**Key Insight**: spec-kit is already 90% compatible with LeanSpec! Migration is mostly about metadata extraction via `lean-spec backfill`.

---

### 3. ADR Sample (`adr-sample/`)

Simulates a typical [Architecture Decision Records](https://adr.github.io/) repository.

**Structure:**
```
docs/
└── adr/
    ├── 0001-use-microservices.md
    ├── 0042-event-sourcing-audit.md
    ├── 0105-graphql-api.md
    └── 0203-kubernetes-deployment.md
```

**Key Characteristics:**
- Flat file structure (all in one directory)
- Each ADR is a single markdown file
- Sequential numbering with zero-padding (0001, 0042, etc.)
- Filename includes title (`####-title.md`)
- Standard ADR format (Status, Context, Decision, Consequences)

**Migration Challenge**:
- **Primary**: Generate frontmatter metadata (status, priority, tags, timestamps)
- **Secondary**: Complete reorganization from flat files → folder hierarchy with renumbering

**Migration Strategy:**
```bash
# 1. Create folder for each ADR with renumbering
mkdir -p specs/001-use-microservices
mv docs/adr/0001-use-microservices.md specs/001-use-microservices/README.md

mkdir -p specs/002-event-sourcing-audit
mv docs/adr/0042-event-sourcing-audit.md specs/002-event-sourcing-audit/README.md

mkdir -p specs/003-graphql-api
mv docs/adr/0105-graphql-api.md specs/003-graphql-api/README.md

mkdir -p specs/004-kubernetes-deployment
mv docs/adr/0203-kubernetes-deployment.md specs/004-kubernetes-deployment/README.md

# 2. Generate metadata from git history
cd specs/
lean-spec backfill --assignee --all

# 3. Map ADR status to LeanSpec status
# ADR "Accepted" → LeanSpec "complete"
# ADR "Proposed" → LeanSpec "planned"
# ADR "Deprecated" → LeanSpec "archived"
```

**Note**: ADRs represent architectural decisions (usually completed), so most will have `status: complete`.

---

## Migration Comparison

| Source | Complexity | Main Challenge | Time (20 specs) |
|--------|-----------|----------------|-----------------|
| **spec-kit** | ✅ Easiest | Metadata only | < 5 minutes |
| **OpenSpec** | ⚠️ Moderate | Metadata + folder merge | 15-30 minutes |
| **ADR** | 🔴 Complex | Metadata + full reorganization | 30-60 minutes |

## Key Migration Insight

**The real challenge is METADATA, not content or folder structure!**

All migrations require:
1. **Frontmatter generation** (PRIMARY): Use `lean-spec backfill` to extract:
   - `created_at`, `updated_at`, `completed_at` - from git history
   - `assignee` - from git author (with `--assignee` flag)
   - `status` - inferred from content/git or set manually
   - `priority` - defaults to 'medium', adjust after
   - `tags` - extract from folder names or set manually

2. **Content preservation**: LeanSpec doesn't enforce content format, keep as-is

3. **Folder reorganization** (VARIES):
   - **spec-kit**: Already compatible! Just rename `spec.md` → `README.md`
   - **OpenSpec**: Merge two directories
   - **ADR**: Flat → hierarchy with renumbering

## Using These Fixtures

### Manual Migration Practice

1. **Copy a sample to your test area:**
   ```bash
   cp -r openspec-sample /tmp/test-migration
   cd /tmp/test-migration
   ```

2. **Follow migration strategy from above**

3. **Validate results:**
   ```bash
   lean-spec validate
   lean-spec board
   ```

### Automated Testing (Future)

When `lean-spec migrate` command is implemented:

```bash
# Test OpenSpec migration
lean-spec migrate ./openspec-sample/openspec --dry-run

# Test spec-kit migration
lean-spec migrate ./spec-kit-sample/.specify/specs --dry-run

# Test ADR migration
lean-spec migrate ./adr-sample/docs/adr --dry-run
```

## The `lean-spec backfill` Command

**Most important tool for migration!** Extracts metadata from git history:

```bash
# Basic: Extract timestamps only
lean-spec backfill

# Include assignee from git author
lean-spec backfill --assignee

# Full metadata extraction
lean-spec backfill --all

# Preview before applying
lean-spec backfill --dry-run

# Process specific specs
lean-spec backfill --specs 001,002,003
```

**What it extracts:**
- ✅ `created_at` - First commit timestamp
- ✅ `updated_at` - Last commit timestamp  
- ✅ `completed_at` - When status changed to 'complete'
- ✅ `assignee` - First commit author (with `--assignee`)
- ✅ `transitions` - Status change history (with `--transitions`)

**What you set manually:**
- ⚠️ `status` - Infer from content/history or default to 'planned'
- ⚠️ `priority` - Defaults to 'medium', adjust with `lean-spec update`
- ⚠️ `tags` - Extract from folder names or set with `lean-spec update`

See [spec 047-git-backfill-timestamps](../../specs/047-git-backfill-timestamps/) for complete documentation.

## Sample Contents Summary

### OpenSpec Sample
- **auth/spec.md**: JWT authentication system with OAuth2 and MFA
- **api-gateway/spec.md**: Centralized gateway with Kong/Express
- **user-management/spec.md**: User CRUD and profile management
- **2024-11-15-oauth-integration/**: Completed change for social login

### spec-kit Sample
- **001-task-management/**: Complex multi-file spec with implementation plan, tasks, API contracts
- **002-user-authentication/**: Simple single-file auth spec
- **003-notifications/**: Notification system with multi-channel support

### ADR Sample
- **0001-use-microservices.md**: Decision to adopt microservices architecture
- **0042-event-sourcing-audit.md**: Event sourcing for audit trail
- **0105-graphql-api.md**: Migration from REST to GraphQL
- **0203-kubernetes-deployment.md**: K8s infrastructure deployment

## Related Specs

- [063-migration-from-existing-tools](../../specs/063-migration-from-existing-tools/) - Migration command design
- [047-git-backfill-timestamps](../../specs/047-git-backfill-timestamps/) - Backfill command documentation
- [012-sub-spec-files](../../specs/012-sub-spec-files/) - How to organize complex specs

## Contributing

To add new migration samples:

1. **Choose a realistic source tool** (existing SDD tool or pattern)
2. **Create authentic content** (realistic specs, not minimal examples)
3. **Follow actual tool conventions** (folder structure, naming, format)
4. **Document migration strategy** (update this README)
5. **Add variety** (simple + complex examples)

**Guidelines:**
- 3-5 specs per sample (enough to show patterns, not overwhelming)
- Include at least one complex multi-file spec
- Mix different statuses (planned, in-progress, complete)
- Use realistic technical content (auth, APIs, infrastructure)
- Show edge cases (long ADR numbers, special characters in names)
