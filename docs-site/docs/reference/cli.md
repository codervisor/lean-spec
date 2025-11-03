---
id: 'cli'
title: 'CLI Reference'
sidebar_position: 1
---
# CLI Commands

Complete reference for all LeanSpec CLI commands.

## Global Options

Available for all commands:

- `--help` - Show help for a command
- `--version` - Show LeanSpec version

## Commands

### `lspec init`

Initialize LeanSpec in your project.

```bash
lspec init
```

**Interactive prompts:**
1. Choose setup path (quick start, choose template, or customize)
2. Handle existing files (merge, backup, or skip)
3. Configure initial settings

**What it creates:**
- `.lspec/config.json` - Configuration file
- `.lspec/templates/` - Custom templates directory
- `specs/` - Specs directory
- `AGENTS.md` - AI agent integration guidance (if not present)

**Options:**
- None (fully interactive)

---

### `lspec create`

Create a new spec.

```bash
lspec create <name> [options]
```

**Arguments:**
- `<name>` - Spec name (required)

**Options:**
- `--status <status>` - Set initial status (default: `planned`)
- `--priority <priority>` - Set priority (`low`, `medium`, `high`, `critical`)
- `--tags <tags>` - Comma-separated tags
- `--field <key=value>` - Set custom field (can be used multiple times)

**Examples:**

```bash
# Basic spec
lspec create user-authentication

# Spec with metadata
lspec create user-auth --status=planned --priority=high --tags=security,api

# Spec with custom fields
lspec create user-auth --field epic=PROJ-123 --field sprint=42
```

**Output:**
```
✓ Created: specs/001-user-authentication/
  Edit: specs/001-user-authentication/README.md
```

**Behavior:**
- Creates `specs/NNN-name/` directory (flat structure with global numbering)
- Generates `README.md` from template
- Assigns sequential number (NNN) globally across all specs
- Sets frontmatter with metadata

**Note**: Default is flat structure. For date-based grouping, configure `pattern: "custom"` in `.lspec/config.json`.

---

### `lspec list`

List all specs with optional filtering.

```bash
lspec list [options]
```

**Options:**
- `--status <status>` - Filter by status
- `--priority <priority>` - Filter by priority
- `--tag <tag>` - Filter by tag
- `--field <key=value>` - Filter by custom field

**Examples:**

```bash
# List all specs
lspec list

# Filter by status
lspec list --status=in-progress
lspec list --status=planned

# Filter by priority
lspec list --priority=high

# Filter by tag
lspec list --tag=api

# Combine filters
lspec list --status=planned --priority=high --tag=api

# Filter by custom field
lspec list --field epic=PROJ-123
```

**Output:**
```
=== Specs ===

📅 specs/20251102/001-user-authentication
   Created: 2025-11-02 · Priority: high · Tags: security, api

🔨 specs/20251102/002-password-reset
   Created: 2025-11-02 · Priority: medium
```

**Status Icons:**
- 📅 Planned
- 🔨 In progress
- ✅ Complete
- 🚫 Blocked
- ❌ Cancelled

---

### `lspec update`

Update spec metadata.

```bash
lspec update <path> [options]
```

**Arguments:**
- `<path>` - Path to spec (required)

**Options:**
- `--status <status>` - Update status
- `--priority <priority>` - Update priority
- `--tags <tags>` - Update tags (replaces existing)
- `--field <key=value>` - Update custom field (can be used multiple times)

**Examples:**

```bash
# Update status
lspec update specs/20251102/001-user-auth --status=in-progress

# Update priority
lspec update specs/20251102/001-user-auth --priority=critical

# Update tags
lspec update specs/20251102/001-user-auth --tags=security,api,mvp

# Update custom fields
lspec update specs/20251102/001-user-auth --field epic=PROJ-123

# Update multiple fields
lspec update specs/20251102/001-user-auth --status=complete --priority=high
```

**Output:**
```
✓ Updated: specs/20251102/001-user-auth
  Fields: status, priority
```

**Special Behavior:**
- Setting status to `complete` automatically adds `completed` timestamp
- Visual badges in README.md are auto-updated
- Both frontmatter and badges stay in sync

---

### `lspec search`

Full-text search across all specs.

```bash
lspec search <query> [options]
```

**Arguments:**
- `<query>` - Search query (required)

**Options:**
- `--status <status>` - Filter results by status
- `--tag <tag>` - Filter results by tag
- `--field <key=value>` - Filter results by custom field

**Examples:**

```bash
# Basic search
lspec search "authentication"

# Search with filters
lspec search "JWT token" --status=in-progress
lspec search "API" --tag=security
lspec search "password" --field epic=PROJ-123
```

**Output:**
```
Found 2 specs matching "authentication":

📅 specs/20251102/001-user-authentication
   Created: 2025-11-02
   Matches in: Overview, Key Scenarios

🔨 specs/20251102/003-two-factor-auth
   Created: 2025-11-02
   Matches in: Technical Approach
```

**Search Behavior:**
- Searches in spec content (README.md)
- Case-insensitive
- Searches title, overview, scenarios, criteria, etc.
- Does not search frontmatter metadata

---

### `lspec archive`

Archive completed specs.

```bash
lspec archive <path>
```

**Arguments:**
- `<path>` - Path to spec (required)

**Examples:**

```bash
lspec archive specs/20251102/001-user-auth
```

**Output:**
```
✓ Archived: specs/20251102/001-user-auth
  Moved to: archive/20251102/001-user-auth
```

**Behavior:**
- Moves spec from `specs/` to `archive/`
- Preserves directory structure
- Keeps all metadata
- Spec no longer appears in `lspec list` by default

**Best Practice:**
- Update status to `complete` before archiving
- Archive specs when work is fully done
- Use to keep active workspace clean

---

### `lspec templates`

List available project templates.

```bash
lspec templates
```

**Output:**
```
=== Available Templates ===

solo-dev       Quick setup for solo developers (default)
team           Small team collaboration with workflow guides  
enterprise     Enterprise-grade with governance & compliance
api-first      API-driven development with endpoint specs

Use: lspec init
Then choose "Choose a template" option
```

---

### `lspec stats`

Show statistics about specs.

```bash
lspec stats
```

**Output:**
```
=== Spec Statistics ===

Total Specs: 15
  Planned: 5
  In Progress: 7
  Complete: 3

By Priority:
  Critical: 2
  High: 6
  Medium: 5
  Low: 2

By Tag:
  api: 8
  security: 5
  ui: 3
```

---

### `lspec board`

View specs organized by status (Kanban-style).

```bash
lspec board
```

**Output:**
```
╔═══════════════════════════════════════════════════════════╗
║                    LeanSpec Board                         ║
╠═══════════════════════════════════════════════════════════╣
║ PLANNED          IN PROGRESS         COMPLETE             ║
╠─────────────────┬────────────────────┬────────────────────╣
║ user-auth       │ api-gateway        │ login-ui           ║
║ rate-limiting   │ database-setup     │ password-hash      ║
║ oauth-provider  │ error-handling     │ session-mgmt       ║
║                 │                    │                    ║
║ 3 specs         │ 3 specs            │ 3 specs            ║
╚═════════════════╧════════════════════╧════════════════════╝
```

---

### `lspec deps`

Show dependencies for a spec (coming soon).

```bash
lspec deps <path>
```

**Note:** This feature is planned but not yet implemented.

---

## Path Formats

All commands that accept a `<path>` argument support multiple formats:

```bash
# Full path
specs/20251102/001-user-auth

# Relative path
20251102/001-user-auth

# Just the folder name
001-user-auth

# Spec name (if unique)
user-auth
```

LeanSpec will find the spec regardless of which format you use.

---

## Configuration

Commands respect settings in `.lspec/config.json`:

```json
{
  "specsDir": "specs",
  "archiveDir": "archive",
  "templateFile": ".lspec/templates/spec-template.md",
  "frontmatter": {
    "required": ["status", "created"],
    "optional": ["tags", "priority"],
    "custom": {
      "epic": "string",
      "sprint": "number"
    }
  }
}
```

See [Configuration Reference](/docs/reference/config) for details.

---

## Exit Codes

- `0` - Success
- `1` - Error (invalid arguments, file not found, etc.)
- `2` - User cancelled operation

---

**Next**: Explore [Configuration](/docs/reference/config) or learn about [Custom Fields](/docs/guide/custom-fields).
