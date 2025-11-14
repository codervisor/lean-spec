## Essential Commands

**Discovery:**
- `lean-spec list` - See all specs
- `lean-spec search "<query>"` - Find relevant specs

**Viewing specs:**
- `lean-spec view <spec>` - View a spec (formatted)
- `lean-spec view <spec> --raw` - Get raw markdown
- `lean-spec open <spec>` - Open spec in editor
- `lean-spec files <spec>` - List all files in a spec

**Project Overview:**
- `lean-spec board` - Kanban view with project health summary
- `lean-spec stats` - Quick project metrics

**Working with specs:**
- `lean-spec create <name>` - Create a new spec
- `lean-spec update <spec> --status <status>` - Update spec status
- `lean-spec update <spec> --priority <priority>` - Update spec priority
- `lean-spec update <spec> --tags <tag1,tag2>` - Update spec tags
- `lean-spec deps <spec>` - Show dependencies and relationships

**Token Management:**
- `lean-spec tokens <spec>` - Count tokens in a spec
- `lean-spec tokens` - Show token counts for all specs

**When in doubt:** Run `lean-spec --help` or `lean-spec <command> --help` to discover available commands.
