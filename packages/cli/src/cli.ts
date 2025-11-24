import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerCommands } from './commands/registry.js';

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('lean-spec')
  .description('Manage LeanSpec documents')
  .version(packageJson.version);

// Add custom help text with grouped commands
program.addHelpText('after', `
Command Groups:

  Core Workflow:
    archive <spec>                Move spec to archived/
    backfill [specs...]           Backfill timestamps from git history
    create <name>                 Create new spec
    init                          Initialize LeanSpec in current directory
    link <spec>                   Add relationships between specs
    migrate <input-path>          Migrate specs from other SDD tools
    unlink <spec>                 Remove relationships between specs
    update <spec>                 Update spec metadata
    
  Discovery & Search:
    files <spec>                  List files in a spec
    list                          List all specs
    open <spec>                   Open spec in editor
    search <query>                Full-text search with metadata filters
    view <spec>                   View spec content
    
  Project Analytics:
    board                         Show Kanban-style board view
    deps <spec>                   Show dependency graph for a spec
    gantt                         Show timeline with dependencies
    stats                         Show aggregate statistics
    timeline                      Show creation/completion over time
    
  Quality & Optimization:
    analyze <spec>                Analyze spec complexity and structure
    check                         Check for sequence conflicts
    tokens [spec]                 Count tokens for LLM context management
    validate [specs...]           Validate specs for quality issues
    
  Advanced Editing:
    compact <spec>                Remove specified line ranges from spec
    split <spec>                  Split spec into multiple files
    
  Configuration:
    templates                     Manage spec templates
    
  Integration:
    mcp                           Start MCP server for AI assistants
    ui                            Start local web UI for spec management

Examples:
  $ lean-spec init
  $ lean-spec init -y
  $ lean-spec create my-feature --priority high
  $ lean-spec list --status in-progress
  $ lean-spec view 042
  $ lean-spec link 085 --depends-on 042,035
  $ lean-spec link 085 --related 082
  $ lean-spec unlink 085 --depends-on 042
  $ lean-spec deps 085
  $ lean-spec backfill --dry-run
  $ lean-spec migrate ./docs/adr
  $ lean-spec migrate ./docs/rfcs --with copilot
  $ lean-spec board --tag backend
  $ lean-spec search "authentication"
  $ lean-spec validate
  $ lean-spec tokens 059
  $ lean-spec analyze 045 --json
  $ lean-spec split 045 --output README.md:1-150 --output DESIGN.md:151-end
  $ lean-spec ui
  $ lean-spec ui --port 3001 --no-open
  $ lean-spec ui --specs ./docs/specs --dry-run
`);

// Register all commands (alphabetically ordered)
registerCommands(program);

// Parse and execute
program.parse();
