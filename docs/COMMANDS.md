# LeanSpec Command Reference

Complete reference for all LeanSpec CLI commands.

## Core Commands

### Initialize Project

```bash
lspec init
```

Initialize LeanSpec in your project with an interactive setup. Provides three paths:

1. **Quick start** - Zero configuration, solo-dev defaults
2. **Choose template** - Pick from solo-dev, team, enterprise, or api-first
3. **Customize everything** - Full control (coming soon)

Each template includes:
- Spec structure and examples
- `AGENTS.md` for AI agent integration
- Supporting files (CONTRIBUTING.md, checklists, etc.)
- Project-specific config

**Integration with existing projects**: If you already have `AGENTS.md`, `.cursorrules`, or other system prompts, `lspec init` will detect them and offer:
- **Merge** - Appends LeanSpec guidance to existing files
- **Backup** - Saves existing files as `.backup`
- **Skip** - Only adds `.lspec` config, keeps files untouched

### Create Spec

```bash
lspec create <name>
```

Create a new spec in `specs/YYYYMMDD/NNN-name/` folder with README.md initialized from your template.

**Options:**
- `--field <key>=<value>` - Set custom frontmatter fields

**Examples:**
```bash
lspec create user-authentication
lspec create payment-api --field epic=PROJ-123 --field sprint=42
```

### List Specs

```bash
lspec list [options]
```

List all specs with filtering options.

**Options:**
- `--status=<value>` - Filter by status (planned, in-progress, complete, archived)
- `--priority=<value>` - Filter by priority (low, medium, high, critical)
- `--tag=<value>` - Filter by tag
- `--field <key>=<value>` - Filter by custom field
- `--json` - Output as JSON

**Examples:**
```bash
lspec list
lspec list --status=in-progress
lspec list --priority=high --tag=api
lspec list --field epic=PROJ-123
lspec list --status=planned --priority=high --tag=api
```

### Update Spec

```bash
lspec update <path> [options]
```

Update spec metadata without editing files manually.

**Options:**
- `--status=<value>` - Update status (auto-adds completion date when set to complete)
- `--priority=<value>` - Update priority
- `--tags=<value>` - Update tags (comma-separated)
- `--field <key>=<value>` - Update custom field

**Examples:**
```bash
lspec update specs/20251031/001-my-feature --status=complete
lspec update specs/20251031/001-my-feature --priority=high
lspec update specs/20251031/001-my-feature --tags=api,backend
lspec update specs/20251031/001-my-feature --field reviewer=alice
```

### Archive Spec

```bash
lspec archive <path>
```

Move a completed spec to the archive directory.

**Example:**
```bash
lspec archive specs/20251031/001-my-feature
```

## Visualization Commands

### Board View

```bash
lspec board [options]
```

Display specs in a Kanban-style board grouped by status.

**Options:**
- `--show-complete` - Include completed items
- `--tag=<value>` - Filter by tag
- `--assignee=<value>` - Filter by assignee (requires custom field)

**Examples:**
```bash
lspec board
lspec board --show-complete
lspec board --tag=api
lspec board --assignee=alice
```

### Statistics

```bash
lspec stats [options]
```

Show aggregate statistics about specs.

**Options:**
- `--tag=<value>` - Stats for specific tag
- `--assignee=<value>` - Stats by assignee (requires custom field)
- `--json` - Output as JSON

**Examples:**
```bash
lspec stats
lspec stats --tag=backend
lspec stats --assignee=bob
lspec stats --json
```

### Timeline View

```bash
lspec timeline [options]
```

Show creation and completion of specs over time.

**Options:**
- `--days=<number>` - Number of days to show (default: 30)
- `--by-tag` - Group by tag
- `--by-assignee` - Group by assignee (requires custom field)

**Examples:**
```bash
lspec timeline
lspec timeline --days=90
lspec timeline --by-tag
lspec timeline --by-assignee
```

### Gantt Chart

```bash
lspec gantt [options]
```

Display timeline view with dependencies.

**Options:**
- `--weeks=<number>` - Number of weeks to show (default: 4)
- `--show-complete` - Include completed specs
- `--critical-path` - Highlight critical path

**Examples:**
```bash
lspec gantt
lspec gantt --weeks=8
lspec gantt --show-complete
lspec gantt --critical-path
```

### Dependency Analysis

```bash
lspec deps <spec-path> [options]
```

Show dependencies for a spec.

**Options:**
- `--depth=<number>` - Show N levels deep (default: 3)
- `--graph` - ASCII graph visualization
- `--json` - Output as JSON

**Examples:**
```bash
lspec deps specs/20251031/001-my-feature
lspec deps specs/20251031/001-my-feature --depth=5
lspec deps specs/20251031/001-my-feature --graph
lspec deps specs/20251031/001-my-feature --json
```

### Full-Text Search

```bash
lspec search "<query>" [options]
```

Search all specs for text content.

**Options:**
- `--status=<value>` - Filter by status
- `--tag=<value>` - Filter by tag
- `--priority=<value>` - Filter by priority
- `--field <key>=<value>` - Filter by custom field

**Examples:**
```bash
lspec search "authentication"
lspec search "API" --status=in-progress
lspec search "security" --tag=backend --priority=high
lspec search "database" --field sprint=42
```

### File Management

```bash
lspec files <spec-path> [options]
```

List files in a spec directory.

**Options:**
- `--tree` - Display as tree structure
- `--type=<value>` - Filter by type (docs, code, tests, config)

**Examples:**
```bash
lspec files specs/20251031/001-my-feature
lspec files specs/20251031/001-my-feature --tree
lspec files specs/20251031/001-my-feature --type=docs
```

## Template Commands

### List Templates

```bash
lspec templates
```

List all available templates.

### Show Template Details

```bash
lspec templates show <name>
```

View detailed information about a template.

**Examples:**
```bash
lspec templates show standard
lspec templates show enterprise
```

## Tips

### Combining Filters

Many commands support combining multiple filters:

```bash
lspec list --status=planned --priority=high --tag=api
lspec search "authentication" --status=in-progress --tag=security
lspec board --tag=backend --assignee=alice
```

### JSON Output

Use `--json` flag for programmatic access:

```bash
lspec stats --json | jq '.byStatus'
lspec list --json | jq '.[] | select(.priority == "high")'
```

### Custom Fields

Custom fields must be defined in `.lspec/config.json` before use. See [FRONTMATTER.md](FRONTMATTER.md) for details.
