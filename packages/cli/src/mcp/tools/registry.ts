/**
 * Tool registry - Register all MCP tools in alphabetical order
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { agentListTool, agentRunTool, agentStatusTool } from './agent.js';
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
  // Note: Using any cast to work around MCP SDK type narrowing issues
  
  // Agent tools (spec 123)
  const [agentListName, agentListConfig, agentListHandler] = agentListTool();
  server.registerTool(agentListName, agentListConfig, agentListHandler as any);
  
  const [agentRunName, agentRunConfig, agentRunHandler] = agentRunTool();
  server.registerTool(agentRunName, agentRunConfig, agentRunHandler as any);
  
  const [agentStatusName, agentStatusConfig, agentStatusHandler] = agentStatusTool();
  server.registerTool(agentStatusName, agentStatusConfig, agentStatusHandler as any);
  
  const [name1, config1, handler1] = archiveTool();
  server.registerTool(name1, config1, handler1 as any);
  
  const [name2, config2, handler2] = backfillTool();
  server.registerTool(name2, config2, handler2 as any);
  
  const [name3, config3, handler3] = boardTool();
  server.registerTool(name3, config3, handler3 as any);
  
  const [name4, config4, handler4] = checkTool();
  server.registerTool(name4, config4, handler4 as any);
  
  const [name5, config5, handler5] = createTool();
  server.registerTool(name5, config5, handler5 as any);
  
  const [name6, config6, handler6] = depsTool();
  server.registerTool(name6, config6, handler6 as any);
  
  const [name7, config7, handler7] = filesTool();
  server.registerTool(name7, config7, handler7 as any);
  
  const [name8, config8, handler8] = listTool();
  server.registerTool(name8, config8, handler8 as any);
  
  const [name9, config9, handler9] = searchTool();
  server.registerTool(name9, config9, handler9 as any);
  
  const [name10, config10, handler10] = statsTool();
  server.registerTool(name10, config10, handler10 as any);
  
  const [name11, config11, handler11] = tokensTool();
  server.registerTool(name11, config11, handler11 as any);
  
  const [name12, config12, handler12] = updateTool();
  server.registerTool(name12, config12, handler12 as any);
  
  const [name13, config13, handler13] = validateTool();
  server.registerTool(name13, config13, handler13 as any);
  
  const [name14, config14, handler14] = viewTool();
  server.registerTool(name14, config14, handler14 as any);
}
