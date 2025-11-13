import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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
  migrateCommand,
} from './commands/index.js';
import { parseCustomFieldOptions } from './utils/cli-helpers.js';
import type { SpecStatus, SpecPriority } from './frontmatter.js';

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
  
  Core Commands:
    init                          Initialize LeanSpec in current directory
    create <name>                 Create new spec in folder structure
    list                          List all specs
    update <spec>                 Update spec metadata
    archive <spec>                Move spec to archived/
    backfill [specs...]           Backfill timestamps from git history
    migrate <input-path>          Migrate specs from other SDD tools
    
  Viewing & Navigation:
    view <spec>                   View spec content
    open <spec>                   Open spec in editor
    search <query>                Full-text search with metadata filters
    files <spec>                  List files in a spec
    
  Spec Transformation (Spec 059):
    analyze <spec>                Analyze spec complexity and structure
    split <spec>                  Split spec into multiple files
    compact <spec>                Remove specified line ranges
    compress <spec>               Replace content with summaries
    isolate <spec>                Move content to new spec
    tokens [spec]                 Count tokens for LLM context
    
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
  $ lean-spec migrate ./docs/adr
  $ lean-spec migrate ./docs/rfcs --with copilot
  $ lean-spec board --tag backend
  $ lean-spec search "authentication"
  $ lean-spec validate
  $ lean-spec validate --verbose
  $ lean-spec validate --quiet --rule max-lines
  $ lean-spec validate 018 --max-lines 500
  $ lean-spec analyze 059 --json
  $ lean-spec split 045 --output=README.md:1-150 --dry-run
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

// analyze command - for spec 059
program
  .command('analyze <spec>')
  .description('Analyze spec complexity and structure (spec 059)')
  .option('--json', 'Output as JSON for AI agents')
  .option('--verbose', 'Include detailed section breakdown')
  .action(async (specPath: string, options: { json?: boolean; verbose?: boolean }) => {
    const { analyzeCommand } = await import('./commands/index.js');
    await analyzeCommand(specPath, options);
  });

// split command - for spec 059
program
  .command('split <spec>')
  .description('Split spec into multiple files by line ranges (spec 059)')
  .option('--output <file:lines>', 'Output file with line range (e.g., README.md:1-150)', collectOutputs, [])
  .option('--update-refs', 'Update cross-references in README.md')
  .option('--dry-run', 'Show what would be created without making changes')
  .option('--force', 'Overwrite existing files')
  .action(async (specPath: string, options: { 
    output: Array<string>;
    updateRefs?: boolean;
    dryRun?: boolean;
    force?: boolean;
  }) => {
    const { splitCommand } = await import('./commands/index.js');
    
    // Parse outputs into structured format
    const outputs = options.output.map((opt: string) => {
      const [file, lines] = opt.split(':');
      if (!file || !lines) {
        throw new Error(`Invalid --output format: ${opt}. Expected: file.md:1-150`);
      }
      return { file, lines };
    });
    
    await splitCommand(specPath, {
      outputs,
      updateRefs: options.updateRefs,
      dryRun: options.dryRun,
      force: options.force,
    });
  });

// Helper function to collect multiple --output options
function collectOutputs(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

// Helper function to collect multiple --remove options
function collectRemoves(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

// Helper function to collect multiple --replace options
function collectReplaces(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

// compact command - for spec 059
program
  .command('compact <spec>')
  .description('Remove specified line ranges from spec (spec 059)')
  .option('--remove <lines>', 'Line range to remove (e.g., 145-153)', collectRemoves, [])
  .option('--dry-run', 'Show what would be removed without making changes')
  .option('--force', 'Skip confirmation')
  .action(async (specPath: string, options: { 
    remove: string[];
    dryRun?: boolean;
    force?: boolean;
  }) => {
    const { compactCommand } = await import('./commands/index.js');
    
    await compactCommand(specPath, {
      removes: options.remove,
      dryRun: options.dryRun,
      force: options.force,
    });
  });

// compress command - for spec 059
program
  .command('compress <spec>')
  .description('Replace line ranges with AI-provided summaries (spec 059)')
  .option('--replace <lines:text>', 'Replace line range with text (e.g., 142-284:"## Summary...")', collectReplaces, [])
  .option('--dry-run', 'Show what would be replaced without making changes')
  .option('--force', 'Skip confirmation')
  .action(async (specPath: string, options: { 
    replace: string[];
    dryRun?: boolean;
    force?: boolean;
  }) => {
    const { compressCommand } = await import('./commands/index.js');
    
    // Parse replace options into structured format
    const replaces = options.replace.map((opt: string) => {
      const colonIndex = opt.indexOf(':');
      if (colonIndex === -1) {
        throw new Error(`Invalid --replace format: ${opt}. Expected format: "142-284:replacement text"`);
      }
      
      const lines = opt.substring(0, colonIndex);
      const text = opt.substring(colonIndex + 1);
      
      return { lines, text };
    });
    
    await compressCommand(specPath, {
      replaces,
      dryRun: options.dryRun,
      force: options.force,
    });
  });

// isolate command - for spec 059
program
  .command('isolate <spec>')
  .description('Move content to a new spec (spec 059)')
  .option('--lines <range>', 'Lines to move (e.g., 401-542)', String)
  .option('--to <new-spec>', 'New spec name (e.g., 060-velocity-algorithm)', String)
  .option('--add-reference', 'Add cross-reference in source spec')
  .option('--dry-run', 'Show what would be created without making changes')
  .option('--force', 'Overwrite existing spec')
  .action(async (specPath: string, options: { 
    lines?: string;
    to?: string;
    addReference?: boolean;
    dryRun?: boolean;
    force?: boolean;
  }) => {
    const { isolateCommand } = await import('./commands/index.js');
    
    if (!options.lines) {
      console.error('Error: --lines option is required');
      process.exit(1);
    }
    
    if (!options.to) {
      console.error('Error: --to option is required');
      process.exit(1);
    }
    
    await isolateCommand(specPath, {
      lines: options.lines,
      to: options.to,
      addReference: options.addReference,
      dryRun: options.dryRun,
      force: options.force,
    });
  });

// tokens command
program
  .command('tokens [spec]')
  .description('Count tokens in spec(s) for LLM context management')
  .option('--detailed', 'Show content type breakdown (code, prose, tables)')
  .option('--include-sub-specs', 'Count all sub-spec files (DESIGN.md, etc.)')
  .option('--all', 'Show all specs (when [spec] is omitted)')
  .option('--sort-by <field>', 'Sort by: tokens, lines, name (default: tokens)')
  .option('--json', 'Output as JSON')
  .action(async (specPath: string | undefined, options: {
    detailed?: boolean;
    includeSubSpecs?: boolean;
    all?: boolean;
    sortBy?: 'tokens' | 'lines' | 'name';
    json?: boolean;
  }) => {
    const { tokensCommand, tokensAllCommand } = await import('./commands/index.js');
    
    if (specPath) {
      // Count specific spec
      await tokensCommand(specPath, options);
    } else {
      // Count all specs
      await tokensAllCommand(options);
    }
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

// migrate command
program
  .command('migrate <input-path>')
  .description('Migrate specs from other SDD tools (ADR, RFC, OpenSpec, spec-kit, etc.)')
  .option('--with <provider>', 'AI-assisted migration (copilot, claude, gemini)')
  .option('--dry-run', 'Preview without making changes')
  .option('--batch-size <n>', 'Process N docs at a time', parseInt)
  .option('--skip-validation', "Don't validate after migration")
  .option('--backfill', 'Auto-run backfill after migration')
  .action(async (inputPath: string, options: {
    with?: string;
    dryRun?: boolean;
    batchSize?: number;
    skipValidation?: boolean;
    backfill?: boolean;
  }) => {
    // Validate AI provider if specified
    if (options.with && !['copilot', 'claude', 'gemini'].includes(options.with)) {
      console.error('\x1b[31m❌ Error:\x1b[0m Invalid AI provider. Use: copilot, claude, or gemini');
      process.exit(1);
    }
    
    await migrateCommand(inputPath, {
      aiProvider: options.with as 'copilot' | 'claude' | 'gemini' | undefined,
      dryRun: options.dryRun,
      batchSize: options.batchSize,
      skipValidation: options.skipValidation,
      backfill: options.backfill,
    });
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
