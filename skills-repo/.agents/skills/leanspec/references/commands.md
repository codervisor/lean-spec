# Command Reference

The `leanspec` CLI is in the middle of a pivot (see
[adapters.md](./adapters.md)): the **adapter abstraction** and the new
`leanspec capabilities` command are in place, but most existing commands
(`list`, `board`, `view`, `create`, `update`, `stats`, `gantt`, etc.) are
still markdown-specific and use frontmatter-level vocabulary. Generalising
them to go through the `Adapter` trait is a follow-up. In the meantime:

- **Always call `leanspec capabilities` first.** It is fully adapter-aware
  and returns the active adapter's fields, enum values, and link types.
- When passing values to markdown-backed commands, use the values the
  adapter's capabilities advertise.
- A few commands (`backfill`, `compact`, `analyze`, `split`, `migrate`,
  `tokens`) are inherently markdown-only and are noted as such below.

Run `leanspec --help` or `leanspec <command> --help` for authoritative flag
documentation.

## Session start — always

```bash
leanspec capabilities -o json   # discover the adapter's vocabulary
leanspec board                  # see the current project state
```

## Discovery

```bash
leanspec board
leanspec list
leanspec list --hierarchy
leanspec search "query"
leanspec view <spec>
```

## Create

```bash
leanspec create <slug>
leanspec create <slug> --title "Human readable title"
leanspec create <slug> --content "<full markdown body>"
```

Pass every known field in the same call. Field keys and allowed values come
from `leanspec capabilities` — never hard-code them. When the adapter is
markdown, the following flags are the common shorthand:

```bash
leanspec create <slug> --status <adapter-status-value>
leanspec create <slug> --priority <adapter-priority-value>
leanspec create <slug> --tags api,backend
leanspec create <slug> --parent <parent-id>
leanspec create <slug> --depends-on <id-a> <id-b>
leanspec create <slug> --assignee "Name"
```

## Update

```bash
leanspec update <id> --status <adapter-status-value>
leanspec update <id> --priority <adapter-priority-value>
leanspec update <id> --assignee "Name"
leanspec update <id> --add-tags api,backend
leanspec update <id> --remove-tags legacy
```

## Close / archive

```bash
leanspec archive <id>
leanspec archive <id-a> <id-b>
leanspec archive <id> --dry-run
```

Adapters differ: markdown transitions the item to its archived state;
future GitHub/ADO/Jira adapters will close the issue/work item.

## Relationships

```bash
leanspec rel <id>
leanspec rel add <child> --parent <parent>
leanspec rel add <parent> --child <child-a> <child-b>
leanspec rel rm <child> --parent
leanspec rel add <id> --depends-on <other>
leanspec rel rm <id> --depends-on <other>

leanspec children <parent>
leanspec deps <id>
leanspec deps <id> --upstream
leanspec deps <id> --downstream
leanspec deps <id> --depth 5
```

The legal link-type names come from `capabilities.link_types` — if the
adapter doesn't declare `depends_on`, for instance, that command will error.

## Validation & project overview

```bash
leanspec validate
leanspec validate <id>
leanspec validate --strict
leanspec validate --warnings-only

leanspec stats
leanspec stats --detailed
leanspec timeline --months 6
leanspec gantt
leanspec board --group-by status
leanspec board --group-by parent
```

## Utilities

```bash
leanspec check            # detect id/sequence conflicts
leanspec check --fix
leanspec open <id>        # open in editor (markdown adapter)
```

## Markdown-only commands

These operate on local files and only run against the markdown adapter.
They error cleanly on any other adapter.

```bash
leanspec tokens
leanspec tokens <id>
leanspec tokens <id> --verbose

leanspec analyze <id>

leanspec split <id> --output "DESIGN.md:100-250"
leanspec compact <id> --remove "100-250"

leanspec backfill --dry-run
leanspec backfill --force --assignee --transitions

leanspec migrate <input-path>
```

## Tooling & environment

```bash
leanspec init
leanspec init --yes

leanspec ui --port 3000
leanspec ui --no-open
```

## Output

Every command supports text and JSON:

```bash
leanspec <command> -o text     # default
leanspec <command> -o json     # parseable
```

## Notes

- Flags are kebab-case (`--check-deps`, `--group-by`).
- Use `rel` to mutate relationships; `children` and `deps` are read-only views.
- `files` supports `--size`; there is no `--type` flag.
