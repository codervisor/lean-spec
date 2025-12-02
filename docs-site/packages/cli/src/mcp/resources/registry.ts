/**
 * Resource registry - Register all MCP resources
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { boardResource } from './board.js';
import { specResource } from './spec.js';
import { statsResource } from './stats.js';

/**
 * Register all resources with the MCP server
 */
export function registerResources(server: McpServer): void {
  server.registerResource(...boardResource());
  server.registerResource(...specResource());
  server.registerResource(...statsResource());
}
