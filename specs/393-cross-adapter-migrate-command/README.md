---
status: planned
created: 2026-05-14
priority: high
tags:
- cli
- migration
- adapter
- cross-adapter
depends_on:
- "392-update-search-archive-stats-migration"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# `migrate` Command (Cross-Adapter)

## Overview

`leanspec migrate` currently handles markdown-internal migrations (format
upgrades, frontmatter changes). This spec adds cross-adapter migration:
moving specs from one backend to another while preserving all fields via
semantic hint mapping.

The primary use case is teams graduating from markdown spec files to GitHub
Issues (or ADO / Jira) without losing their spec history.

Done when: `leanspec migrate --to github` successfully creates GitHub Issues
from all local markdown specs, handles partial failures gracefully, and leaves
source files in a clean, declared state.

## Design

### Command syntax

```
leanspec migrate --to <adapter> [--keep-source | --delete-source] [--dry-run] [--limit N]
```

Default source is the currently configured adapter (typically markdown).
Default source handling: **archive** (add `migrated_to:` to frontmatter, move
to `specs/_migrated/`).

Flags:
- `--keep-source`: add `migrated_to:` field to source, leave file in place
- `--delete-source`: delete source file after successful migration (no recovery)
- `--dry-run`: print what would happen, create nothing, move nothing
- `--limit N`: migrate at most N specs (useful for testing)
- `--filter-status <value>`: only migrate specs with this status

### Source file handling (default: archive)

After a spec is successfully migrated to the target adapter:

1. Add `migrated_to: github:123` (or `ado:456`, `jira:PROJ-789`) to the
   markdown frontmatter
2. Move the file to `specs/_migrated/` directory
3. Update any specs that reference the migrated spec's ID to point to the
   new backend ID — or record both IDs in a mapping file

The `_migrated/` directory is created if it does not exist. Files there are
excluded from `leanspec list` by default.

### Field mapping via semantic hints

Fields are transferred using semantic hints, not field key names. This handles
the case where the source adapter uses key `"status"` and the target uses a
different key:

```rust
for semantic in [semantic::STATUS, semantic::PRIORITY, semantic::TAGS,
                 semantic::ASSIGNEE, semantic::DUE_DATE] {
    let source_key = source_schema.key_for_semantic(semantic);
    let target_key = target_schema.key_for_semantic(semantic);
    if let (Some(sk), Some(tk)) = (source_key, target_key) {
        if let Some(value) = source_doc.fields.get(sk) {
            create_fields.insert(tk.to_string(), value.clone());
        }
    }
}
// Always transfer title and content
create_req.title = source_doc.title.clone();
if let Some(content) = source_doc.fields.get("content") {
    create_fields.insert("content".to_string(), content.clone());
}
```

Fields with no semantic hint and no matching key in the target schema are
dropped. A dry-run report shows which fields will be dropped.

### Partial failure handling

Migrate specs one by one. On failure:
- Log the error and continue
- Do not archive/delete the source for failed specs
- Print a final summary: `N migrated, M failed`
- Exit non-zero if any spec failed

Failed specs can be retried by running `migrate` again — already-migrated specs
(those with `migrated_to:` in frontmatter) are skipped automatically.

### Progress output

```
Migrating 42 specs to GitHub Issues (acme/backend)...

  [  1/42] 001-user-auth → #234 ✓
  [  2/42] 002-payments → #235 ✓
  [ 15/42] 015-search-engine → FAILED: 403 Forbidden
  ...

Results: 41 migrated, 1 failed.

Failed specs:
  015-search-engine: 403 Forbidden (check GITHUB_TOKEN permissions)
```

### ID mapping file

After migration, write `specs/.migration-map.json`:

```json
{
  "adapter": "github",
  "migrated_at": "2026-05-14T12:00:00Z",
  "mappings": {
    "001-user-auth": "github:234",
    "002-payments": "github:235"
  }
}
```

This file enables future tooling (e.g. update cross-references in docs).

### `--dry-run` output

```
DRY RUN — no changes will be made.

Would migrate 42 specs:
  001-user-auth → new GitHub Issue (title: "User Auth")
    ✓ status: planned → open label
    ✓ tags: auth, backend → labels
    ✗ priority: high → DROPPED (no priority labels in target repo)
    ✓ content: preserved (1.2 KB)
  ...

Field drop summary: priority (42 specs affected)
Tip: Create priority:high / priority:medium / priority:low labels in GitHub
     to preserve priority during migration.
```

## Plan

- [ ] Add `migrate --to <adapter>` subcommand to `cli_args.rs`
- [ ] `commands/migrate.rs` — new implementation (replace existing markdown-only impl)
  - [ ] Parse `--to`, `--keep-source`, `--delete-source`, `--dry-run`, `--limit`, `--filter-status`
  - [ ] Load source adapter (`AdapterRegistry::from_project()`)
  - [ ] Construct target adapter from `--to` config (prompt for settings if no config exists)
  - [ ] `list_source_specs()` — exclude already-migrated (those with `migrated_to:` field)
  - [ ] For each spec: map fields via semantic hints, build `CreateRequest`
  - [ ] Dry-run: print field mapping report, no actual creation
  - [ ] Live run: `target_adapter.create(req)`, on success update/archive source
  - [ ] `archive_source(doc, target_id)` — add `migrated_to:`, move to `_migrated/`
  - [ ] `keep_source(doc, target_id)` — add `migrated_to:` field only
  - [ ] `delete_source(doc)` — delete file after successful migration
  - [ ] Write `specs/.migration-map.json` on completion
  - [ ] Print progress and final summary
- [ ] Exclude `_migrated/` from `leanspec list` default filter
- [ ] Update markdown-only guard on old `migrate` subcommands (format migrations)
- [ ] E2E test: migrate a temp markdown project to mock GitHub adapter

## Test

- [ ] `leanspec migrate --to github --dry-run`: prints field map report, creates nothing
- [ ] `leanspec migrate --to github`: creates issues, archives source files
- [ ] `leanspec migrate --to github --keep-source`: adds `migrated_to:` field, leaves file
- [ ] `leanspec migrate --to github --delete-source`: deletes file after success
- [ ] Already-migrated specs (have `migrated_to:`) are skipped on re-run
- [ ] Partial failure: migrated specs archived, failed specs left as-is
- [ ] `specs/.migration-map.json` written with correct mappings
- [ ] `leanspec list` after migration does not show archived/migrated specs
- [ ] Field drop warning shown for fields without target semantic hint

## Notes

### Migrating back (github → markdown)

Reverse migration (pull GitHub Issues into local markdown files) is not in
scope for this spec. A future `leanspec pull` or `leanspec clone --from github`
command can address this.

### Links after migration

Cross-spec links (depends_on, parent) reference the source IDs. After migration,
the mapping file can be used to update these references, but that's a separate
post-migration step, not automated in this spec.
