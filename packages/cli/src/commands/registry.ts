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

/**
 * Register all commands in alphabetical order
 */
export function registerCommands(program: Command): void {
  // Alphabetically sorted command registration
  program.addCommand(agentCommand());
  program.addCommand(analyzeCommand());
  program.addCommand(archiveCommand());
  program.addCommand(backfillCommand());
  program.addCommand(boardCommand());
  program.addCommand(checkCommand());
  program.addCommand(compactCommand());
  program.addCommand(createCommand());
  program.addCommand(depsCommand());
  program.addCommand(examplesCommand());
  program.addCommand(filesCommand());
  program.addCommand(ganttCommand());
  program.addCommand(initCommand());
  program.addCommand(linkCommand());
  program.addCommand(listCommand());
  program.addCommand(mcpCommand());
  program.addCommand(migrateCommand());
  program.addCommand(openCommand());
  program.addCommand(searchCommand());
  program.addCommand(splitCommand());
  program.addCommand(statsCommand());
  program.addCommand(templatesCommand());
  program.addCommand(timelineCommand());
  program.addCommand(tokensCommand());
  program.addCommand(uiCommand());
  program.addCommand(unlinkCommand());
  program.addCommand(updateCommand());
  program.addCommand(validateCommand());
  program.addCommand(viewCommand());
}
