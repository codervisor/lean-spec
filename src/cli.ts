import { parseArgs } from 'node:util';
import { createSpec, archiveSpec, listSpecs, listTemplates, initProject } from './commands.js';

const USAGE = `lspec - Manage LeanSpec documents

Usage: lspec <command> [args]

Commands:
  init                                 Initialize LeanSpec in current directory
  create <name> [options]              Create new spec in folder structure
    --title <title>                    Optional: Set custom title
    --description <desc>               Optional: Set initial description
  archive <spec-path>                  Move spec to archived/
  list [--archived]                    List all specs
  templates                            List available templates

Structure: specs/YYYYMMDD/NNN-name/ (folders, not files)

Examples:
  lspec init
  lspec create user-export
  lspec create user-export --title "User Data Export" --description "Add CSV export"
  lspec list
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
        const showArchived = args.includes('--archived');
        await listSpecs(showArchived);
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
