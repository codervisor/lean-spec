// Core commands
export { createSpec, createCommand } from './create.js';
export { archiveSpec, archiveCommand } from './archive.js';
export { listSpecs, listCommand } from './list.js';
export { updateSpec, updateCommand } from './update.js';
export { linkSpec, linkCommand } from './link.js';
export { unlinkSpec, unlinkCommand } from './unlink.js';
export { checkSpecs, checkCommand } from './check.js';
export { backfillTimestamps, backfillCommand } from './backfill.js';
export {
  listTemplates,
  showTemplate,
  addTemplate,
  removeTemplate,
  copyTemplate,
  templatesCommand,
} from './templates.js';
export { initProject, initCommand } from './init.js';
export { showFiles, filesCommand } from './files.js';
export { examplesCommand } from './examples.js';
export { validateSpecs, validateCommand } from './validate.js';
export { migrateSpecs, migrateCommand } from './migrate.js';

// Visualization and analysis commands
export { showBoard, boardCommand } from './board.js';
export { showStats, statsCommand } from './stats.js';
export { performSearch, searchCommand } from './search.js';
export { showDeps, depsCommand } from './deps.js';
export { showTimeline, timelineCommand } from './timeline.js';
export { showGantt, ganttCommand } from './gantt.js';
export { countSpecTokens, tokensAllCommand, tokensCommand } from './tokens.js';
export { analyzeSpec, analyzeCommand } from './analyze.js';

// Transformation commands (spec 059)
export { compressCommand } from './compress.js';
export { isolateCommand } from './isolate.js';
export { splitSpec, splitCommand } from './split.js';
export { compactSpec, compactCommand } from './compact.js';

// Viewer commands
export { viewSpec, openSpec, viewCommand, openCommand } from './viewer.js';

// Server commands
export { startMcpServer, mcpCommand } from './mcp.js';
export { startUi, uiCommand } from './ui.js';

// Agent orchestration commands (spec 123)
export {
  agentCommand,
  runAgent,
  showAgentStatus,
  listAgents,
  setDefaultAgent,
  type AgentType,
  type AgentConfig,
  type AgentSession,
} from './agent.js';
