import { Command } from 'commander';
import {
  agentCommand,
  analyzeCommand,
  archiveCommand,
  backfillCommand,
  boardCommand,
  checkCommand,
  compactCommand,
  createCommand,
  depsCommand,
  examplesCommand,
  filesCommand,
  ganttCommand,
  initCommand,
  linkCommand,
  listCommand,
  mcpCommand,
  migrateCommand,
  openCommand,
  searchCommand,
  splitCommand,
  statsCommand,
  templatesCommand,
  timelineCommand,
  tokensCommand,
  uiCommand,
  unlinkCommand,
  updateCommand,
  validateCommand,
  viewCommand,
} from './index.js';
import { localizeCommand } from '../utils/i18n.js';

/**
 * Register all commands in alphabetical order
 */
export function registerCommands(program: Command): void {
  // Alphabetically sorted command registration
  program.addCommand(localizeCommand(agentCommand(), 'agent'));
  program.addCommand(localizeCommand(analyzeCommand(), 'analyze'));
  program.addCommand(localizeCommand(archiveCommand(), 'archive'));
  program.addCommand(localizeCommand(backfillCommand(), 'backfill'));
  program.addCommand(localizeCommand(boardCommand(), 'board'));
  program.addCommand(localizeCommand(checkCommand(), 'check'));
  program.addCommand(localizeCommand(compactCommand(), 'compact'));
  program.addCommand(localizeCommand(createCommand(), 'create'));
  program.addCommand(localizeCommand(depsCommand(), 'deps'));
  program.addCommand(localizeCommand(examplesCommand(), 'examples'));
  program.addCommand(localizeCommand(filesCommand(), 'files'));
  program.addCommand(localizeCommand(ganttCommand(), 'gantt'));
  program.addCommand(localizeCommand(initCommand(), 'init'));
  program.addCommand(localizeCommand(linkCommand(), 'link'));
  program.addCommand(localizeCommand(listCommand(), 'list'));
  program.addCommand(localizeCommand(mcpCommand(), 'mcp'));
  program.addCommand(localizeCommand(migrateCommand(), 'migrate'));
  program.addCommand(localizeCommand(openCommand(), 'open'));
  program.addCommand(localizeCommand(searchCommand(), 'search'));
  program.addCommand(localizeCommand(splitCommand(), 'split'));
  program.addCommand(localizeCommand(statsCommand(), 'stats'));
  program.addCommand(localizeCommand(templatesCommand(), 'templates'));
  program.addCommand(localizeCommand(timelineCommand(), 'timeline'));
  program.addCommand(localizeCommand(tokensCommand(), 'tokens'));
  program.addCommand(localizeCommand(uiCommand(), 'ui'));
  program.addCommand(localizeCommand(unlinkCommand(), 'unlink'));
  program.addCommand(localizeCommand(updateCommand(), 'update'));
  program.addCommand(localizeCommand(validateCommand(), 'validate'));
  program.addCommand(localizeCommand(viewCommand(), 'view'));
}
