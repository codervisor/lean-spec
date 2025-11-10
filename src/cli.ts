import { Command } from 'commander';
import {
  createSpec,
  archiveSpec,
  listSpecs,
  updateSpec,
  checkSpecs,
  backfillTimestamps,
  listTemplates,
  showTemplate,
  addTemplate,
  removeTemplate,
  copyTemplate,
  initProject,
  statsCommand,
  boardCommand,
  timelineCommand,
  depsCommand,
  searchCommand,
  ganttCommand,
  filesCommand,
  viewCommand,
  openCommand,
  validateCommand,
  mcpCommand,
} from './commands/index.js';
import { parseCustomFieldOptions } from './utils/cli-helpers.js';
import type { SpecStatus, SpecPriority } from './frontmatter.js';

const program = new Command();

program
  .name('lean-spec')
  .description('Manage LeanSpec documents')
  .version('0.1.0');

// Add custom help text with grouped commands
program.addHelpText('after', `
Command Groups:
  
  Core Commands:
    init                          Initialize LeanSpec in current directory
    create <name>                 Create new spec in folder structure
    list                          List all specs
    update <spec>                 Update spec metadata
    archive <spec>                Move spec to archived/
    backfill [specs...]           Backfill timestamps from git history
    
  Viewing & Navigation:
    view <spec>                   View spec content
    open <spec>                   Open spec in editor
    search <query>                Full-text search with metadata filters
    files <spec>                  List files in a spec
    
  Project & Analytics:
    board                         Show Kanban-style board view
    stats                         Show aggregate statistics
    timeline                      Show creation/completion over time
    gantt                         Show timeline with dependencies
    deps <spec>                   Show dependency graph for a spec
    
  Maintenance:
    check                         Check for sequence conflicts
    validate [specs...]           Validate specs for quality issues
    templates                     Manage spec templates
  
  Server:
    mcp                           Start MCP server for AI assistants

Examples:
  $ lean-spec init
  $ lean-spec create my-feature --priority high
  $ lean-spec list --status in-progress
  $ lean-spec view 042
  $ lean-spec backfill --dry-run
  $ lean-spec board --tag backend
  $ lean-spec search "authentication"
  $ lean-spec validate
  $ lean-spec validate --verbose
  $ lean-spec validate --quiet --rule max-lines
  $ lean-spec validate 018 --max-lines 500
`);

// archive command
program
  .command('archive <spec>')
  .description('Move spec to archived/')
  .action(async (specPath: string) => {
    await archiveSpec(specPath);
  });

// backfill command
program
  .command('backfill [specs...]')
  .description('Backfill timestamps from git history')
  .option('--dry-run', 'Show what would be updated without making changes')
  .option('--force', 'Overwrite existing timestamp values')
  .option('--assignee', 'Include assignee from first commit author')
  .option('--transitions', 'Include full status transition history')
  .option('--all', 'Include all optional fields (assignee + transitions)')
  .action(async (specs: string[] | undefined, options: {
    dryRun?: boolean;
    force?: boolean;
    assignee?: boolean;
    transitions?: boolean;
    all?: boolean;
  }) => {
    await backfillTimestamps({
      dryRun: options.dryRun,
      force: options.force,
      includeAssignee: options.assignee || options.all,
      includeTransitions: options.transitions || options.all,
      specs: specs && specs.length > 0 ? specs : undefined,
    });
  });

// board command
program
  .command('board')
    .description('Show Kanban-style board view with project completion summary')
  .option('--complete', 'Include complete specs (default: hidden)')
  .option('--simple', 'Hide completion summary (kanban only)')
  .option('--completion-only', 'Show only completion summary (no kanban)')
  .option('--tag <tag>', 'Filter by tag')
  .option('--assignee <name>', 'Filter by assignee')
  .action(async (options: {
    showComplete?: boolean;
    simple?: boolean;
    completionOnly?: boolean;
    tag?: string;
    assignee?: string;
  }) => {
    await boardCommand(options);
  });

// check command
program
  .command('check')
  .description('Check for sequence conflicts')
  .option('-q, --quiet', 'Brief output')
  .action(async (options: {
    quiet?: boolean;
  }) => {
    const hasNoConflicts = await checkSpecs(options);
    // Exit with 0 (success) if no conflicts, 1 (error) if conflicts found
    process.exit(hasNoConflicts ? 0 : 1);
  });

// validate command
program
  .command('validate [specs...]')
  .description('Validate specs for quality issues')
  .option('--max-lines <number>', 'Custom line limit (default: 400)', parseInt)
  .option('--verbose', 'Show passing specs')
  .option('--quiet', 'Suppress warnings, only show errors')
  .option('--format <format>', 'Output format: default, json, compact', 'default')
  .option('--rule <rule>', 'Filter by specific rule name (e.g., max-lines, frontmatter)')
  .action(async (specs: string[] | undefined, options: {
    maxLines?: number;
    verbose?: boolean;
    quiet?: boolean;
    format?: 'default' | 'json' | 'compact';
    rule?: string;
  }) => {
    const passed = await validateCommand({
      maxLines: options.maxLines,
      specs: specs && specs.length > 0 ? specs : undefined,
      verbose: options.verbose,
      quiet: options.quiet,
      format: options.format,
      rule: options.rule,
    });
    // Exit with 0 (success) if all passed, 1 (error) if any failed
    process.exit(passed ? 0 : 1);
  });

// create command
program
  .command('create <name>')
  .description('Create new spec in folder structure')
  .option('--title <title>', 'Set custom title')
  .option('--description <desc>', 'Set initial description')
  .option('--tags <tags>', 'Set tags (comma-separated)')
  .option('--priority <priority>', 'Set priority (low, medium, high, critical)')
  .option('--assignee <name>', 'Set assignee')
  .option('--template <template>', 'Use a specific template')
  .option('--field <name=value...>', 'Set custom field (can specify multiple)')
  .option('--no-prefix', 'Skip date prefix even if configured')
  .action(async (name: string, options: {
    title?: string;
    description?: string;
    tags?: string;
    priority?: SpecPriority;
    assignee?: string;
    template?: string;
    field?: string[];
    prefix?: boolean;
  }) => {
    // Parse custom fields from --field options
    const customFields = parseCustomFieldOptions(options.field);
    
    const createOptions: {
      title?: string;
      description?: string;
      tags?: string[];
      priority?: SpecPriority;
      assignee?: string;
      template?: string;
      customFields?: Record<string, unknown>;
      noPrefix?: boolean;
    } = {
      title: options.title,
      description: options.description,
      tags: options.tags ? options.tags.split(',').map(t => t.trim()) : undefined,
      priority: options.priority,
      assignee: options.assignee,
      template: options.template,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      noPrefix: options.prefix === false,
    };
    await createSpec(name, createOptions);
  });

// deps command
program
  .command('deps <spec>')
  .description('Show dependency graph for a spec. Related specs (⟷) are shown bidirectionally, depends_on (→) are directional.')
  .option('--depth <n>', 'Show N levels deep (default: 3)', parseInt)
  .option('--graph', 'ASCII graph visualization')
  .option('--json', 'Output as JSON')
  .action(async (specPath: string, options: {
    depth?: number;
    graph?: boolean;
    json?: boolean;
  }) => {
    await depsCommand(specPath, options);
  });

// files command
program
  .command('files <spec>')
  .description('List files in a spec')
  .option('--type <type>', 'Filter by type: docs, assets')
  .option('--tree', 'Show tree structure')
  .action(async (specPath: string, options: {
    type?: 'docs' | 'assets';
    tree?: boolean;
  }) => {
    await filesCommand(specPath, options);
  });

// gantt command
program
  .command('gantt')
  .description('Show timeline with dependencies')
  .option('--weeks <n>', 'Show N weeks (default: 4)', parseInt)
  .option('--show-complete', 'Include completed specs')
  .option('--critical-path', 'Highlight critical path')
  .action(async (options: {
    weeks?: number;
    showComplete?: boolean;
    criticalPath?: boolean;
  }) => {
    await ganttCommand(options);
  });

// init command
program
  .command('init')
  .description('Initialize LeanSpec in current directory')
  .action(async () => {
    await initProject();
  });

// list command
program
  .command('list')
  .description('List all specs')
  .option('--archived', 'Include archived specs')
  .option('--status <status>', 'Filter by status (planned, in-progress, complete, archived)')
  .option('--tag <tag...>', 'Filter by tag (can specify multiple)')
  .option('--priority <priority>', 'Filter by priority (low, medium, high, critical)')
  .option('--assignee <name>', 'Filter by assignee')
  .option('--field <name=value...>', 'Filter by custom field (can specify multiple)')
  .option('--sort <field>', 'Sort by field (id, created, name, status, priority)', 'id')
  .option('--order <order>', 'Sort order (asc, desc)', 'desc')
  .action(async (options: {
    archived?: boolean;
    status?: SpecStatus;
    tag?: string[];
    priority?: SpecPriority;
    assignee?: string;
    field?: string[];
    sort?: string;
    order?: string;
  }) => {
    // Parse custom field filters from --field options
    const customFields = parseCustomFieldOptions(options.field);
    
    const listOptions: {
      showArchived?: boolean;
      status?: SpecStatus;
      tags?: string[];
      priority?: SpecPriority;
      assignee?: string;
      customFields?: Record<string, unknown>;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {
      showArchived: options.archived,
      status: options.status,
      tags: options.tag,
      priority: options.priority,
      assignee: options.assignee,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      sortBy: options.sort || 'id',
      sortOrder: (options.order as 'asc' | 'desc') || 'desc',
    };
    await listSpecs(listOptions);
  });

// open command
program
  .command('open <spec>')
  .description('Open spec in editor')
  .option('--editor <editor>', 'Specify editor command')
  .action(async (specPath: string, options: {
    editor?: string;
  }) => {
    try {
      await openCommand(specPath, {
        editor: options.editor,
      });
    } catch (error) {
      console.error('\x1b[31mError:\x1b[0m', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// search command
program
  .command('search <query>')
  .description('Full-text search with metadata filters')
  .option('--status <status>', 'Filter by status')
  .option('--tag <tag>', 'Filter by tag')
  .option('--priority <priority>', 'Filter by priority')
  .option('--assignee <name>', 'Filter by assignee')
  .option('--field <name=value...>', 'Filter by custom field (can specify multiple)')
  .action(async (query: string, options: {
    status?: SpecStatus;
    tag?: string;
    priority?: SpecPriority;
    assignee?: string;
    field?: string[];
  }) => {
    // Parse custom field filters from --field options
    const customFields = parseCustomFieldOptions(options.field);
    
    await searchCommand(query, {
      status: options.status,
      tag: options.tag,
      priority: options.priority,
      assignee: options.assignee,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  });

// stats command
program
  .command('stats')
  .description('Show aggregate statistics (default: simplified view)')
  .option('--tag <tag>', 'Filter by tag')
  .option('--assignee <name>', 'Filter by assignee')
  .option('--full', 'Show full detailed analytics (all sections)')
  .option('--timeline', 'Show only timeline section')
  .option('--velocity', 'Show only velocity section')
  .option('--json', 'Output as JSON')
  .action(async (options: {
    tag?: string;
    assignee?: string;
    full?: boolean;
    timeline?: boolean;
    velocity?: boolean;
    json?: boolean;
  }) => {
    await statsCommand(options);
  });

// templates command and subcommands
const templatesCmd = program
  .command('templates')
  .description('Manage spec templates');

templatesCmd
  .command('list')
  .description('List available templates')
  .action(async () => {
    await listTemplates();
  });

templatesCmd
  .command('show <name>')
  .description('Show template content')
  .action(async (name: string) => {
    await showTemplate(name);
  });

templatesCmd
  .command('add <name> <file>')
  .description('Register a template')
  .action(async (name: string, file: string) => {
    await addTemplate(name, file);
  });

templatesCmd
  .command('remove <name>')
  .description('Unregister a template')
  .action(async (name: string) => {
    await removeTemplate(name);
  });

templatesCmd
  .command('copy <source> <target>')
  .description('Copy a template to create a new one')
  .action(async (source: string, target: string) => {
    await copyTemplate(source, target);
  });

// Default action for templates (list)
templatesCmd
  .action(async () => {
    await listTemplates();
  });

// timeline command
program
  .command('timeline')
  .description('Show creation/completion over time')
  .option('--days <n>', 'Show last N days (default: 30)', parseInt)
  .option('--by-tag', 'Group by tag')
  .option('--by-assignee', 'Group by assignee')
  .action(async (options: {
    days?: number;
    byTag?: boolean;
    byAssignee?: boolean;
  }) => {
    await timelineCommand(options);
  });

// update command
program
  .command('update <spec>')
  .description('Update spec metadata')
  .option('--status <status>', 'Set status (planned, in-progress, complete, archived)')
  .option('--priority <priority>', 'Set priority (low, medium, high, critical)')
  .option('--tags <tags>', 'Set tags (comma-separated)')
  .option('--assignee <name>', 'Set assignee')
  .option('--field <name=value...>', 'Set custom field (can specify multiple)')
  .action(async (specPath: string, options: {
    status?: SpecStatus;
    priority?: SpecPriority;
    tags?: string;
    assignee?: string;
    field?: string[];
  }) => {
    // Parse custom fields from --field options
    const customFields = parseCustomFieldOptions(options.field);
    
    const updates: {
      status?: SpecStatus;
      priority?: SpecPriority;
      tags?: string[];
      assignee?: string;
      customFields?: Record<string, unknown>;
    } = {
      status: options.status,
      priority: options.priority,
      tags: options.tags ? options.tags.split(',').map(t => t.trim()) : undefined,
      assignee: options.assignee,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };
    
    // Filter out undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof typeof updates] === undefined) {
        delete updates[key as keyof typeof updates];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      console.error('Error: At least one update option required (--status, --priority, --tags, --assignee, --field)');
      process.exit(1);
    }
    
    await updateSpec(specPath, updates);
  });

// view command (primary viewer)
program
  .command('view <spec>')
  .description('View spec content (supports sub-specs like "045/DESIGN.md")')
  .option('--raw', 'Output raw markdown (for piping/scripting)')
  .option('--json', 'Output as JSON')
  .option('--no-color', 'Disable colors')
  .action(async (specPath: string, options: {
    raw?: boolean;
    json?: boolean;
    color?: boolean;
  }) => {
    try {
      await viewCommand(specPath, {
        raw: options.raw,
        json: options.json,
        noColor: options.color === false,
      });
    } catch (error) {
      console.error('\x1b[31mError:\x1b[0m', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// mcp command
program
  .command('mcp')
  .description('Start MCP server for AI assistants (Claude Desktop, Cline, etc.)')
  .action(async () => {
    await mcpCommand();
  });

// Parse and execute
program.parse();
