import { parseArgs } from 'node:util';
import { createSpec, archiveSpec, listSpecs, listTemplates, initProject, updateSpec } from './commands.js';
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
        const options: { title?: string; description?: string } = {};
        for (let i = 2; i < args.length; i++) {
          if (args[i] === '--title' && args[i + 1]) {
            options.title = args[i + 1];
            i++;
          } else if (args[i] === '--description' && args[i + 1]) {
            options.description = args[i + 1];
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
