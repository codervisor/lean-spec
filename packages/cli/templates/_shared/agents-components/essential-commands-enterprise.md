## Essential Commands

**Discovery:**
- `lean-spec list` - See all specs
- `lean-spec search "<query>"` - Find relevant specs

**Viewing specs:**
- `lean-spec view <spec>` - View a spec (formatted)
- `lean-spec view <spec>/DESIGN.md` - View sub-spec file (DESIGN.md, TESTING.md, etc.)
- `lean-spec view <spec> --raw` - Get raw markdown (for parsing)
- `lean-spec view <spec> --json` - Get structured JSON
- `lean-spec open <spec>` - Open spec in editor
- `lean-spec files <spec>` - List all files in a spec (including sub-specs)

**Project Overview:**
- `lean-spec board` - Kanban view with project health summary
- `lean-spec stats` - Quick project metrics and insights
- `lean-spec stats --full` - Detailed analytics (all sections)

**Working with specs:**
- `lean-spec create <name>` - Create a new spec
- `lean-spec update <spec> --status <status>` - Update spec status (REQUIRED - never edit frontmatter manually)
- `lean-spec update <spec> --priority <priority>` - Update spec priority (REQUIRED - never edit frontmatter manually)
- `lean-spec update <spec> --tags <tag1,tag2>` - Update spec tags (REQUIRED - never edit frontmatter manually)
- `lean-spec update <spec> --assignee <name>` - Update spec assignee (REQUIRED - never edit frontmatter manually)
- `lean-spec deps <spec>` - Show dependencies and relationships

**Token Management:**
- `lean-spec tokens <spec>` - Count tokens in a spec for LLM context management
- `lean-spec tokens` - Show token counts for all specs (sorted by token count)
- `lean-spec tokens <spec> --detailed` - Show content breakdown (prose vs code vs tables)

**Advanced Editing (AI Agent Orchestration):**
- `lean-spec analyze <spec>` - Analyze spec complexity and structure (returns JSON with --json flag)
- `lean-spec split <spec> --output FILE:LINES` - Split spec into multiple files by line ranges (spec 059)
- `lean-spec compact <spec> --remove LINES` - Remove specified line ranges from spec (spec 059)

**When in doubt:** Run `lean-spec --help` or `lean-spec <command> --help` to discover available commands and options.
