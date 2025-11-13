/**
 * Tool registry - Register all MCP tools in alphabetical order
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { archiveTool } from './archive.js';
import { backfillTool } from './backfill.js';
import { boardTool } from './board.js';
import { checkTool } from './check.js';
import { createTool } from './create.js';
import { depsTool } from './deps.js';
import { filesTool } from './files.js';
import { listTool } from './list.js';
import { searchTool } from './search.js';
import { statsTool } from './stats.js';
import { tokensTool } from './tokens.js';
import { updateTool } from './update.js';
import { validateTool } from './validate.js';
import { viewTool } from './view.js';

/**
 * Register all tools with the MCP server in alphabetical order
 */
export function registerTools(server: McpServer): void {
  // Alphabetically sorted tool registration
  server.registerTool(...archiveTool());
  server.registerTool(...backfillTool());
  server.registerTool(...boardTool());
  server.registerTool(...checkTool());
  server.registerTool(...createTool());
  server.registerTool(...depsTool());
  server.registerTool(...filesTool());
  server.registerTool(...listTool());
  server.registerTool(...searchTool());
  server.registerTool(...statsTool());
  server.registerTool(...tokensTool());
  server.registerTool(...updateTool());
  server.registerTool(...validateTool());
  server.registerTool(...viewTool());
}
