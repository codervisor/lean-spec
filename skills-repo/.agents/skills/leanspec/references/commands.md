# Command Reference

Accurate reference for LeanSpec CLI commands. For details, run `leanspec --help` or `leanspec <command> --help`.

## Discovery

```bash
leanspec board
leanspec list
leanspec list --hierarchy
leanspec search "query"
leanspec view <spec>
leanspec files <spec>
```

## Spec Lifecycle

### Create
```bash
leanspec create <name>
leanspec create <name> --title "Human Title"
leanspec create <name> --template default
leanspec create <name> --status planned
leanspec create <name> --priority high
leanspec create <name> --tags api,backend
leanspec create <name> --parent 250
leanspec create <name> --depends-on 210 211
```

### Update Metadata
```bash
leanspec update <spec> --status in-progress
leanspec update <spec> --priority high
leanspec update <spec> --assignee "Name"
leanspec update <spec> --add-tags api,backend
leanspec update <spec> --remove-tags old-tag
leanspec update <spec> --status complete --force
```

### Archive
```bash
leanspec archive <spec>
leanspec archive 001-feature-a 002-feature-b
leanspec archive <spec> --dry-run
```

## Relationships

Use `rel` as the primary relationship command.

```bash
# View relationships for one spec
leanspec rel <spec>

# Parent/child relationships
leanspec rel add <child> --parent <parent>
leanspec rel add <parent> --child <child-a> <child-b>
leanspec rel rm <child> --parent
leanspec children <parent>

# Dependencies
leanspec rel add <spec> --depends-on <other-spec>
leanspec rel rm <spec> --depends-on <other-spec>

# Dependency graph traversal
leanspec deps <spec>
leanspec deps <spec> --upstream
leanspec deps <spec> --downstream
leanspec deps <spec> --depth 5
```

## Validation & Analysis

```bash
leanspec validate
leanspec validate <spec>
leanspec validate --check-deps
leanspec validate --strict
leanspec validate --warnings-only

leanspec tokens
leanspec tokens <spec>
leanspec tokens <file-path>
leanspec tokens <spec> --verbose

leanspec analyze <spec>
```

## Spec File Management

```bash
leanspec split <spec> --output "DESIGN.md:100-250"
leanspec split <spec> --output "API.md:251-400" --update-refs
leanspec split <spec> --output "TESTING.md:401-520" --dry-run

leanspec compact <spec> --remove "100-250"
leanspec compact <spec> --remove "100-250" --remove "300-400"
leanspec compact <spec> --remove "100-250" --dry-run
```

## Project Overview

```bash
leanspec board --group-by status
leanspec board --group-by parent
leanspec stats
leanspec stats --detailed
leanspec timeline --months 6
leanspec gantt
```

## Utilities

```bash
leanspec check
leanspec check --fix
leanspec open <spec>
leanspec templates --action list
leanspec backfill --dry-run
leanspec backfill --force --assignee --transitions
leanspec backfill 042 043
```

## Tooling & Environment

```bash
leanspec init
leanspec init --yes
leanspec init --skill

leanspec mcp
leanspec ui --port 3000
leanspec ui --no-open

leanspec migrate <input-path>
leanspec migrate <input-path> --dry-run
leanspec migrate-archived --dry-run

leanspec examples
leanspec agent run <spec>
leanspec session list
```

## Output Format

Most commands support:
```bash
leanspec <command> ... -o text
leanspec <command> ... -o json
```

## Notes

- CLI uses kebab-case flags (`--check-deps`, `--group-by`).
- Prefer `rel` for relationship updates; use `children` and `deps` for focused read views.
- `files` supports `--size` (there is no `--type` flag).
