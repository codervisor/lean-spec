---
status: planned
created: 2026-05-14
priority: high
tags:
- cli
- migration
- adapter
- markdown-only-guards
depends_on:
- "391-view-create-commands-migration"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# `update` + `search` + `archive` + `stats` Migration + Markdown-Only Guards

## Overview

Final batch of adapter-aware CLI command migrations, plus the markdown-only
guards for the 15 commands that have no non-markdown equivalent. After this
spec, every CLI command either routes through the adapter layer or clearly
declares itself markdown-specific.

Done when: `update`, `search`, `archive`, `stats` work on both markdown and
GitHub projects; 15 markdown-only commands exit with a clear error when the
active adapter is not markdown; and zero `SpecLoader`/`SpecInfo` imports remain
in `leanspec-cli`.

## Design

### `update` — fetch-transform-push

The `update` command modifies metadata and/or body content. For metadata:

```rust
let mut fields: HashMap<String, FieldValue> = HashMap::new();

if let Some(status) = &params.status {
    let key = schema.key_for_semantic(semantic::STATUS)
        .ok_or(CliError::unsupported("status"))?;
    validate_field_value(key, status, &schema)?;
    fields.insert(key.to_string(), FieldValue::String(status.clone()));
}
// Same for --priority, --assignee, --reviewer
```

For body-manipulation flags (`--replace`, `--check`, `--section`, `--append`):
fetch current doc, apply pure string utility to `fields["content"]`, push back.
Same fetch-transform-push as in spec 387.

For `--add-tags` / `--remove-tags`, fetch current tags list, mutate, push:

```rust
let tags_key = schema.key_for_semantic(semantic::TAGS)
    .ok_or(CliError::unsupported("tags"))?;
let current_tags = doc.fields.get(tags_key)
    .and_then(|v| v.as_strings())
    .unwrap_or(&[])
    .to_vec();
let new_tags = compute_tag_diff(current_tags, &params.add_tags, &params.remove_tags);
fields.insert(tags_key.to_string(), FieldValue::Strings(new_tags));
```

### `search` — adapter.search()

```rust
let hits = adapter.search(&params.query, &SearchOptions {
    limit: params.limit.unwrap_or(20),
    include_archived: params.include_archived.unwrap_or(false),
    schema_id: None,
})?;
```

Display: each hit shows `id`, `title`, and a content snippet. The snippet comes
from `hit.excerpt` (the `SearchHit` struct already has this field).

### `archive` — adapter.delete()

```rust
// Confirm if not --force
if !params.force {
    print!("Archive {}? [y/N] ", id);
    // read stdin
}
adapter.delete(&id)?;
println!("Archived {id}.");
```

For adapters where `delete()` = close (GitHub), the confirmation message is:
"Close issue #{id}? [y/N]". Adapter name shown: `(via {caps.name} adapter)`.

### `stats` — semantic hint grouping

Status distribution: group docs by `schema.key_for_semantic(semantic::STATUS)`.
Priority distribution: group by `schema.key_for_semantic(semantic::PRIORITY)`.
Token count: sum `fields["content"]` string lengths (adapter-agnostic proxy).

For markdown projects the existing detailed stats (token breakdown by section,
etc.) are preserved — the markdown adapter returns a `content` field that the
existing `TokenCounter` can operate on.

If an adapter has no status field, status distribution is omitted from output.

### Markdown-only guards

These 15 commands are explicitly markdown-specific and must fail clearly when
the active adapter is not markdown:

`backfill`, `compact`, `analyze`, `split`, `tokens`, `validate`, `deps`,
`check`, `gantt`, `timeline`, `rel`, `templates`, `backfill`, `config`,
`update --replace` / `--section` (body manipulation flags only — metadata
update still works for any adapter)

Guard helper:

```rust
fn require_markdown_adapter(caps: &AdapterCapabilities) -> Result<(), CliError> {
    if caps.name != "markdown" {
        return Err(CliError::MarkdownOnly {
            command: caps.name.clone(),
            adapter: caps.name.clone(),
        });
    }
    Ok(())
}
```

Error message:
```
This command requires a markdown adapter.
Active adapter: github

Run `leanspec capabilities` to see what operations are available.
```

Note: `update` body-manipulation flags (`--replace`, `--section`, `--append`,
`--check`) work for any adapter that stores content as markdown (GitHub body,
ADO description). Only the truly markdown-specific commands (frontmatter
manipulation, file-level operations) get the hard guard. The guard is in the
*command*, not in the adapter — each command declares its own requirements.

Actually, body manipulation works via fetch-transform-push for any adapter, so
`update --section` does NOT need a markdown guard. Only commands operating on
the filesystem directly (backfill, compact, etc.) need it.

## Plan

**`update` command:**
- [ ] Rewrite `commands/update.rs` — adapter-based metadata update
- [ ] Implement tag diff logic (`compute_tag_diff`)
- [ ] Body manipulation flags: fetch-transform-push via content utilities
- [ ] Remove `SpecLoader`, `SpecWriter`, `SpecInfo`, `SpecStatus` imports

**`search` command:**
- [ ] Rewrite `commands/search.rs` — `adapter.search()`
- [ ] Display `SearchHit.excerpt` in results
- [ ] Remove `SpecLoader`, legacy `search_specs` import

**`archive` command:**
- [ ] Rewrite `commands/archive.rs` — `adapter.delete()` with confirmation
- [ ] Adapter-aware confirmation message
- [ ] Remove `SpecArchiver` import

**`stats` command:**
- [ ] Rewrite `commands/stats.rs` — semantic-hint grouping for generic adapters
- [ ] Preserve detailed markdown stats path for markdown projects
- [ ] Remove `SpecLoader`, `SpecInfo`, `SpecStatus`, `SpecPriority` imports

**Markdown-only guards:**
- [ ] Add `require_markdown_adapter(caps)` helper to `commands/shared.rs`
- [ ] Add guard to: `backfill`, `compact`, `analyze`, `split`, `tokens`,
  `validate`, `deps`, `check`, `gantt`, `timeline`, `rel`, `templates`
- [ ] Each guard placed at the top of `run()` before any other work

**Final cleanup:**
- [ ] `cargo check -p leanspec-cli` — zero errors
- [ ] `grep -r "SpecLoader\|SpecInfo\|SpecStatus\|SpecPriority" rust/leanspec-cli/src/` — zero matches

## Test

- [ ] All existing `tests/` E2E tests pass
- [ ] `leanspec update <id> --status in-progress` on GitHub: issue state/label updated
- [ ] `leanspec update <id> --add-tags bug` on GitHub: label added
- [ ] `leanspec update <id> --section "## Notes" "new content"` on GitHub: body section replaced
- [ ] `leanspec search "keyword"` on GitHub: returns matching issues
- [ ] `leanspec archive <id>` on GitHub: closes issue with confirmation
- [ ] `leanspec archive <id> --force` on GitHub: closes without prompt
- [ ] `leanspec stats` on GitHub: shows open/closed counts by status
- [ ] `leanspec validate` on GitHub project: exits with clear markdown-only error
- [ ] `leanspec gantt` on GitHub project: exits with clear markdown-only error
- [ ] Zero `SpecLoader`, `SpecInfo`, `SpecStatus`, `SpecPriority` imports in `leanspec-cli/src/`

## Notes

### `config` command

`leanspec config` reads/writes `.lean-spec/config.json`. This is markdown-only
(the config file is the markdown adapter's configuration). Add markdown-only guard.
For non-markdown projects, adapter configuration is in `leanspec.adapter.yaml`
and is not yet editable via CLI (future spec).

### Completion after this spec

After spec 392, the CLI migration is complete. Validate with:
```
cargo check --workspace
grep -r "SpecLoader\|SpecInfo\|SpecStatus\|SpecPriority\|SpecFrontmatter\|spec_ops" \
  rust/leanspec-cli/src/ rust/leanspec-http/src/ \
  | grep -v "adapters/markdown"
```
Expected: zero matches.
