import { parseArgs } from 'node:util';
import { createSpec, archiveSpec, listSpecs } from './commands.js';

const USAGE = `lspec - Manage LeanSpec documents

Usage: lspec <command> [args]

Commands:
  create <name>           Create new spec in today's directory
  archive <spec-path>     Move spec to archived/
  list [--archived]       List all specs

Structure: specs/YYYYMMDD/NNN-name.md (NNN starts at 001 per day)

Examples:
  lspec create user-export
  lspec list
  lspec archive specs/20251031/001-user-export.md
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
      case 'create': {
        const name = args[1];
        if (!name) {
          console.error('Error: Name required');
          process.exit(1);
        }
        await createSpec(name);
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
