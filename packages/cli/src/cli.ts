import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerCommands } from './commands/registry.js';
import { t } from './lib/i18n/config.js';
import { getCommandMeta } from './utils/i18n.js';

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('lean-spec')
  .description(t('description'))
  .version(packageJson.version);

const helpSections: Array<{ titleKey: string; commands: string[] }> = [
  {
    titleKey: 'commandGroups.coreWorkflow',
    commands: ['archive', 'backfill', 'create', 'examples', 'init', 'link', 'migrate', 'unlink', 'update'],
  },
  {
    titleKey: 'commandGroups.discoverySearch',
    commands: ['files', 'list', 'open', 'search', 'view'],
  },
  {
    titleKey: 'commandGroups.projectAnalytics',
    commands: ['board', 'deps', 'gantt', 'stats', 'timeline'],
  },
  {
    titleKey: 'commandGroups.qualityOptimization',
    commands: ['analyze', 'check', 'tokens', 'validate'],
  },
  {
    titleKey: 'commandGroups.advancedEditing',
    commands: ['compact', 'split'],
  },
  {
    titleKey: 'commandGroups.configuration',
    commands: ['templates'],
  },
  {
    titleKey: 'commandGroups.integration',
    commands: ['agent', 'mcp', 'ui'],
  },
];

const globalOptions: Array<{ flag: string; key: string }> = [
  { flag: '--help', key: 'help' },
  { flag: '-V, --version', key: 'version' },
  { flag: '--status <status>', key: 'status' },
  { flag: '--priority <priority>', key: 'priority' },
  { flag: '--tag <tag...>', key: 'tag' },
  { flag: '--dry-run', key: 'dryRun' },
  { flag: '--json', key: 'json' },
  { flag: '--port <port>', key: 'port' },
  { flag: '--no-open', key: 'noOpen' },
];

const exampleCommands = [
  '$ lean-spec init',
  '$ lean-spec init -y',
  '$ lean-spec init --example dark-theme',
  '$ lean-spec init --example dashboard-widgets --name my-demo',
  '$ lean-spec examples',
  '$ lean-spec create my-feature --priority high',
  '$ lean-spec list --status in-progress',
  '$ lean-spec view 042',
  '$ lean-spec link 085 --depends-on 042,035',
  '$ lean-spec unlink 085 --depends-on 042',
  '$ lean-spec deps 085',
  '$ lean-spec backfill --dry-run',
  '$ lean-spec migrate ./docs/adr',
  '$ lean-spec migrate ./docs/rfcs --with copilot',
  '$ lean-spec board --tag backend',
  '$ lean-spec search "authentication"',
  '$ lean-spec validate',
  '$ lean-spec tokens 059',
  '$ lean-spec analyze 045 --json',
  '$ lean-spec split 045 --output README.md:1-150 --output DESIGN.md:151-end',
  '$ lean-spec agent list',
  '$ lean-spec agent run 045 --agent claude',
  '$ lean-spec agent run 045 047 048 --parallel',
  '$ lean-spec ui',
  '$ lean-spec ui --port 3001 --no-open',
  '$ lean-spec ui --specs ./docs/specs --dry-run',
];

const formatCommandLine = (commandKey: string): string => {
  const { usage, description } = getCommandMeta(commandKey);
  const paddedUsage = usage.padEnd(30, ' ');
  return `    ${paddedUsage}${description}`;
};

const helpLines: string[] = [''];

helpLines.push(`${t('help.commandGroupsTitle')}:`);
helpLines.push('');

for (const section of helpSections) {
  helpLines.push(`  ${t(section.titleKey)}:`);
  section.commands.forEach((commandKey) => helpLines.push(formatCommandLine(commandKey)));
  helpLines.push('');
}

helpLines.push(`${t('help.optionsTitle')}:`);
helpLines.push('');
globalOptions.forEach(({ flag, key }) => {
  const description = t(`options.${key}`);
  helpLines.push(`  ${flag.padEnd(24, ' ')}${description}`);
});
helpLines.push('');

helpLines.push(`${t('help.examplesTitle')}:`);
exampleCommands.forEach((example) => {
  helpLines.push(`  ${example}`);
});
helpLines.push('');

// Add custom help text with grouped commands
program.addHelpText('after', helpLines.join('\n'));

// Register all commands (alphabetically ordered)
registerCommands(program);

// Parse and execute
program.parse();
