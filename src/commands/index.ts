// Core commands
export { createSpec } from './create.js';
export { archiveSpec } from './archive.js';
export { listSpecs } from './list.js';
export { updateSpec } from './update.js';
export { checkSpecs } from './check.js';
export {
  listTemplates,
  showTemplate,
  addTemplate,
  removeTemplate,
  copyTemplate,
} from './templates.js';
export { initProject } from './init.js';
export { filesCommand } from './files.js';

// Visualization and analysis commands
export { boardCommand } from './board.js';
export { statsCommand } from './stats.js';
export { searchCommand } from './search.js';
export { depsCommand } from './deps.js';
export { timelineCommand } from './timeline.js';
export { ganttCommand } from './gantt.js';

// Viewer commands
export { viewCommand, openCommand } from './viewer.js';
