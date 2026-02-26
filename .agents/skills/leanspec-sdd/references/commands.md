# Command Reference

Accurate reference for LeanSpec CLI commands. For details, run `lean-spec --help` or `lean-spec <command> --help`.

## Discovery

```bash
lean-spec board
lean-spec list
lean-spec list --hierarchy
lean-spec search "query"
lean-spec view <spec>
lean-spec files <spec>
```

## Spec Lifecycle

### Create
```bash
lean-spec create <name>
lean-spec create <name> --title "Human Title"
lean-spec create <name> --template default
lean-spec create <name> --status planned
lean-spec create <name> --priority high
lean-spec create <name> --tags api,backend
```

### Update Metadata
```bash
lean-spec update <spec> --status in-progress
lean-spec update <spec> --priority high
lean-spec update <spec> --assignee "Name"
lean-spec update <spec> --add-tags api,backend
lean-spec update <spec> --remove-tags old-tag
lean-spec update <spec> --status complete --force
```

### Archive
```bash
lean-spec archive <spec>
lean-spec archive 001-feature-a 002-feature-b
lean-spec archive <spec> --dry-run
```

## Relationships

Use `rel` as the primary relationship command.

```bash
# View relationships for one spec
lean-spec rel <spec>

# Parent/child relationships
lean-spec rel add <child> --parent <parent>
lean-spec rel add <parent> --child <child-a> <child-b>
lean-spec rel rm <child> --parent
lean-spec children <parent>

# Dependencies
lean-spec rel add <spec> --depends-on <other-spec>
lean-spec rel rm <spec> --depends-on <other-spec>

# Dependency graph traversal
lean-spec deps <spec>
lean-spec deps <spec> --upstream
lean-spec deps <spec> --downstream
lean-spec deps <spec> --depth 5
```

## Validation & Analysis

```bash
lean-spec validate
lean-spec validate <spec>
lean-spec validate --check-deps
lean-spec validate --strict
lean-spec validate --warnings-only

lean-spec tokens
lean-spec tokens <spec>
lean-spec tokens <file-path>
lean-spec tokens <spec> --verbose

lean-spec analyze <spec>
```

## Spec File Management

```bash
lean-spec split <spec> --output "DESIGN.md:100-250"
lean-spec split <spec> --output "API.md:251-400" --update-refs
lean-spec split <spec> --output "TESTING.md:401-520" --dry-run

lean-spec compact <spec> --remove "100-250"
lean-spec compact <spec> --remove "100-250" --remove "300-400"
lean-spec compact <spec> --remove "100-250" --dry-run
```

## Project Overview

```bash
lean-spec board --group-by status
lean-spec board --group-by parent
lean-spec stats
lean-spec stats --detailed
lean-spec timeline --months 6
lean-spec gantt
```

## Utilities

```bash
lean-spec check
lean-spec check --fix
lean-spec open <spec>
lean-spec templates --action list
lean-spec backfill --dry-run
lean-spec backfill --force --assignee --transitions
lean-spec backfill 042 043
```

## Tooling & Environment

```bash
lean-spec init
lean-spec init --yes
lean-spec init --skill

lean-spec mcp
lean-spec ui --port 3000
lean-spec ui --no-open

lean-spec migrate <input-path>
lean-spec migrate <input-path> --dry-run
lean-spec migrate-archived --dry-run

lean-spec examples
lean-spec agent run <spec>
lean-spec session list
```

## Output Format

Most commands support:
```bash
lean-spec <command> ... -o text
lean-spec <command> ... -o json
```

## Notes

- CLI uses kebab-case flags (`--check-deps`, `--group-by`).
- Prefer `rel` for relationship updates; use `children` and `deps` for focused read views.
- `files` supports `--size` (there is no `--type` flag).
