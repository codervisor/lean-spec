import { parseArgs } from 'node:util';
import { createSpec, archiveSpec, listSpecs, listTemplates, initProject, updateSpec } from './commands.js';
import { statsCommand } from './commands/stats.js';
import { boardCommand } from './commands/board.js';
import { timelineCommand } from './commands/timeline.js';
import { depsCommand } from './commands/deps.js';
import { searchCommand } from './commands/search.js';
import { ganttCommand } from './commands/gantt.js';
import type { SpecStatus, SpecPriority } from './frontmatter.js';

const USAGE = `lspec - Manage LeanSpec documents

Usage: lspec <command> [args]

Commands:
  init                                 Initialize LeanSpec in current directory
  create <name> [options]              Create new spec in folder structure
    --title <title>                    Optional: Set custom title
    --description <desc>               Optional: Set initial description
  archive <spec-path>                  Move spec to archived/
  list [options]                       List all specs
    --archived                         Include archived specs
    --status <status>                  Filter by status (planned, in-progress, complete, archived)
    --tag <tag>                        Filter by tag (can specify multiple)
    --priority <priority>              Filter by priority (low, medium, high, critical)
    --assignee <name>                  Filter by assignee
  update <spec-path> [options]         Update spec metadata
    --status <status>                  Set status (planned, in-progress, complete, archived)
    --priority <priority>              Set priority (low, medium, high, critical)
    --tags <tags>                      Set tags (comma-separated)
    --assignee <name>                  Set assignee
  templates                            List available templates

PM Visualization Commands:
  stats [options]                      Show aggregate statistics
    --tag <tag>                        Filter by tag
    --assignee <name>                  Filter by assignee
    --json                             Output as JSON
  board [options]                      Show Kanban-style board view
    --show-complete                    Expand complete column
    --tag <tag>                        Filter by tag
    --assignee <name>                  Filter by assignee
  timeline [options]                   Show creation/completion over time
    --days <n>                         Show last N days (default: 30)
    --by-tag                           Group by tag
    --by-assignee                      Group by assignee
  deps <spec-path> [options]           Show dependency graph for a spec
    --depth <n>                        Show N levels deep (default: 3)
    --graph                            ASCII graph visualization
    --json                             Output as JSON
  search <query> [options]             Full-text search with metadata filters
    --status <status>                  Filter by status
    --tag <tag>                        Filter by tag
    --priority <priority>              Filter by priority
    --assignee <name>                  Filter by assignee
  gantt [options]                      Show timeline with dependencies
    --weeks <n>                        Show N weeks (default: 4)
    --show-complete                    Include completed specs
    --critical-path                    Highlight critical path

Structure: specs/YYYYMMDD/NNN-name/ (folders, not files)

Examples:
  lspec init
  lspec create user-export
  lspec create user-export --title "User Data Export" --description "Add CSV export"
  lspec list
  lspec list --status=in-progress --tag=api
  lspec list --priority=high
  lspec update specs/20251031/001-user-export --status=complete
  lspec update specs/20251031/001-user-export --priority=high --tags=api,feature
  lspec stats
  lspec board --show-complete
  lspec timeline --days=90 --by-tag
  lspec deps specs/20251101/003-pm-visualization-tools
  lspec search "api" --status=planned --priority=high
  lspec gantt --weeks=8
  lspec templates
  lspec archive specs/20251031/001-user-export
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  const command = args[0];

  try {
    switch (command) {
      case 'init': {
        await initProject();
        break;
      }
      case 'create': {
        const name = args[1];
        if (!name) {
          console.error('Error: Name required');
          process.exit(1);
        }
        
        // Parse optional flags
        const options: { 
          title?: string; 
          description?: string;
          tags?: string[];
          priority?: SpecPriority;
          assignee?: string;
        } = {};
        
        for (let i = 2; i < args.length; i++) {
          const arg = args[i];
          
          if (arg === '--title' && args[i + 1]) {
            options.title = args[i + 1];
            i++;
          } else if (arg === '--description' && args[i + 1]) {
            options.description = args[i + 1];
            i++;
          } else if (arg.startsWith('--tags=')) {
            options.tags = arg.split('=')[1].split(',').map(t => t.trim());
          } else if (arg === '--tags' && args[i + 1]) {
            options.tags = args[i + 1].split(',').map(t => t.trim());
            i++;
          } else if (arg.startsWith('--priority=')) {
            options.priority = arg.split('=')[1] as SpecPriority;
          } else if (arg === '--priority' && args[i + 1]) {
            options.priority = args[i + 1] as SpecPriority;
            i++;
          } else if (arg.startsWith('--assignee=')) {
            options.assignee = arg.split('=')[1];
          } else if (arg === '--assignee' && args[i + 1]) {
            options.assignee = args[i + 1];
            i++;
          }
        }
        
        await createSpec(name, options);
        break;
      }
      case 'archive': {
        const specPath = args[1];
        if (!specPath) {
          console.error('Error: Spec path required');
          process.exit(1);
        }
        await archiveSpec(specPath);
        break;
      }
      case 'list': {
        // Parse filter options
        const options: {
          showArchived?: boolean;
          status?: SpecStatus | SpecStatus[];
          tags?: string[];
          priority?: SpecPriority | SpecPriority[];
          assignee?: string;
        } = {};
        
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          
          if (arg === '--archived') {
            options.showArchived = true;
          } else if (arg.startsWith('--status=')) {
            options.status = arg.split('=')[1] as SpecStatus;
          } else if (arg === '--status' && args[i + 1]) {
            options.status = args[i + 1] as SpecStatus;
            i++;
          } else if (arg.startsWith('--tag=')) {
            if (!options.tags) options.tags = [];
            options.tags.push(arg.split('=')[1]);
          } else if (arg === '--tag' && args[i + 1]) {
            if (!options.tags) options.tags = [];
            options.tags.push(args[i + 1]);
            i++;
          } else if (arg.startsWith('--priority=')) {
            options.priority = arg.split('=')[1] as SpecPriority;
          } else if (arg === '--priority' && args[i + 1]) {
            options.priority = args[i + 1] as SpecPriority;
            i++;
          } else if (arg.startsWith('--assignee=')) {
            options.assignee = arg.split('=')[1];
          } else if (arg === '--assignee' && args[i + 1]) {
            options.assignee = args[i + 1];
            i++;
          }
        }
        
        await listSpecs(options);
        break;
      }
      case 'update': {
        const specPath = args[1];
        if (!specPath) {
          console.error('Error: Spec path required');
          process.exit(1);
        }
        
        // Parse update options
        const updates: {
          status?: SpecStatus;
          priority?: SpecPriority;
          tags?: string[];
          assignee?: string;
        } = {};
        
        for (let i = 2; i < args.length; i++) {
          const arg = args[i];
          
          if (arg.startsWith('--status=')) {
            updates.status = arg.split('=')[1] as SpecStatus;
          } else if (arg === '--status' && args[i + 1]) {
            updates.status = args[i + 1] as SpecStatus;
            i++;
          } else if (arg.startsWith('--priority=')) {
            updates.priority = arg.split('=')[1] as SpecPriority;
          } else if (arg === '--priority' && args[i + 1]) {
            updates.priority = args[i + 1] as SpecPriority;
            i++;
          } else if (arg.startsWith('--tags=')) {
            updates.tags = arg.split('=')[1].split(',').map(t => t.trim());
          } else if (arg === '--tags' && args[i + 1]) {
            updates.tags = args[i + 1].split(',').map(t => t.trim());
            i++;
          } else if (arg.startsWith('--assignee=')) {
            updates.assignee = arg.split('=')[1];
          } else if (arg === '--assignee' && args[i + 1]) {
            updates.assignee = args[i + 1];
            i++;
          }
        }
        
        if (Object.keys(updates).length === 0) {
          console.error('Error: At least one update option required (--status, --priority, --tags, --assignee)');
          process.exit(1);
        }
        
        await updateSpec(specPath, updates);
        break;
      }
      case 'templates': {
        await listTemplates();
        break;
      }
      case 'stats': {
        // Parse options
        const options: { tag?: string; assignee?: string; json?: boolean } = {};
        
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          
          if (arg.startsWith('--tag=')) {
            options.tag = arg.split('=')[1];
          } else if (arg === '--tag' && args[i + 1]) {
            options.tag = args[i + 1];
            i++;
          } else if (arg.startsWith('--assignee=')) {
            options.assignee = arg.split('=')[1];
          } else if (arg === '--assignee' && args[i + 1]) {
            options.assignee = args[i + 1];
            i++;
          } else if (arg === '--json') {
            options.json = true;
          }
        }
        
        await statsCommand(options);
        break;
      }
      case 'board': {
        // Parse options
        const options: { showComplete?: boolean; tag?: string; assignee?: string } = {};
        
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          
          if (arg === '--show-complete') {
            options.showComplete = true;
          } else if (arg.startsWith('--tag=')) {
            options.tag = arg.split('=')[1];
          } else if (arg === '--tag' && args[i + 1]) {
            options.tag = args[i + 1];
            i++;
          } else if (arg.startsWith('--assignee=')) {
            options.assignee = arg.split('=')[1];
          } else if (arg === '--assignee' && args[i + 1]) {
            options.assignee = args[i + 1];
            i++;
          }
        }
        
        await boardCommand(options);
        break;
      }
      case 'timeline': {
        // Parse options
        const options: { days?: number; byTag?: boolean; byAssignee?: boolean } = {};
        
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          
          if (arg.startsWith('--days=')) {
            options.days = parseInt(arg.split('=')[1], 10);
          } else if (arg === '--days' && args[i + 1]) {
            options.days = parseInt(args[i + 1], 10);
            i++;
          } else if (arg === '--by-tag') {
            options.byTag = true;
          } else if (arg === '--by-assignee') {
            options.byAssignee = true;
          }
        }
        
        await timelineCommand(options);
        break;
      }
      case 'deps': {
        const specPath = args[1];
        if (!specPath) {
          console.error('Error: Spec path required');
          process.exit(1);
        }
        
        // Parse options
        const options: { depth?: number; graph?: boolean; json?: boolean } = {};
        
        for (let i = 2; i < args.length; i++) {
          const arg = args[i];
          
          if (arg.startsWith('--depth=')) {
            options.depth = parseInt(arg.split('=')[1], 10);
          } else if (arg === '--depth' && args[i + 1]) {
            options.depth = parseInt(args[i + 1], 10);
            i++;
          } else if (arg === '--graph') {
            options.graph = true;
          } else if (arg === '--json') {
            options.json = true;
          }
        }
        
        await depsCommand(specPath, options);
        break;
      }
      case 'search': {
        const query = args[1];
        if (!query) {
          console.error('Error: Search query required');
          process.exit(1);
        }
        
        // Parse options
        const options: {
          status?: SpecStatus;
          tag?: string;
          priority?: SpecPriority;
          assignee?: string;
        } = {};
        
        for (let i = 2; i < args.length; i++) {
          const arg = args[i];
          
          if (arg.startsWith('--status=')) {
            options.status = arg.split('=')[1] as SpecStatus;
          } else if (arg === '--status' && args[i + 1]) {
            options.status = args[i + 1] as SpecStatus;
            i++;
          } else if (arg.startsWith('--tag=')) {
            options.tag = arg.split('=')[1];
          } else if (arg === '--tag' && args[i + 1]) {
            options.tag = args[i + 1];
            i++;
          } else if (arg.startsWith('--priority=')) {
            options.priority = arg.split('=')[1] as SpecPriority;
          } else if (arg === '--priority' && args[i + 1]) {
            options.priority = args[i + 1] as SpecPriority;
            i++;
          } else if (arg.startsWith('--assignee=')) {
            options.assignee = arg.split('=')[1];
          } else if (arg === '--assignee' && args[i + 1]) {
            options.assignee = args[i + 1];
            i++;
          }
        }
        
        await searchCommand(query, options);
        break;
      }
      case 'gantt': {
        // Parse options
        const options: { weeks?: number; showComplete?: boolean; criticalPath?: boolean } = {};
        
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          
          if (arg.startsWith('--weeks=')) {
            options.weeks = parseInt(arg.split('=')[1], 10);
          } else if (arg === '--weeks' && args[i + 1]) {
            options.weeks = parseInt(args[i + 1], 10);
            i++;
          } else if (arg === '--show-complete') {
            options.showComplete = true;
          } else if (arg === '--critical-path') {
            options.criticalPath = true;
          }
        }
        
        await ganttCommand(options);
        break;
      }
      default:
        console.error(`Error: Unknown command '${command}'`);
        console.log(USAGE);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
