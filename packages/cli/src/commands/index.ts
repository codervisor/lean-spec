// Core commands
export { createSpec } from './create.js';
export { archiveSpec } from './archive.js';
export { listSpecs } from './list.js';
export { updateSpec } from './update.js';
export { checkSpecs } from './check.js';
export { backfillTimestamps } from './backfill.js';
export {
  listTemplates,
  showTemplate,
  addTemplate,
  removeTemplate,
  copyTemplate,
} from './templates.js';
export { initProject } from './init.js';
export { filesCommand } from './files.js';
export { validateCommand } from './validate.js';
export { migrateCommand } from './migrate.js';

// Visualization and analysis commands
export { boardCommand } from './board.js';
export { statsCommand } from './stats.js';
export { searchCommand } from './search.js';
export { depsCommand } from './deps.js';
export { timelineCommand } from './timeline.js';
export { ganttCommand } from './gantt.js';
export { tokensCommand, tokensAllCommand } from './tokens.js';
export { analyzeCommand } from './analyze.js';

// Transformation commands (spec 059)
export { splitCommand } from './split.js';
export { compactCommand } from './compact.js';
export { compressCommand } from './compress.js';
export { isolateCommand } from './isolate.js';

// Viewer commands
export { viewCommand, openCommand } from './viewer.js';

// Server commands
export { mcpCommand } from './mcp.js';
