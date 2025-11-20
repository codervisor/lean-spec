/**
 * Prompt registry - Register all MCP prompts
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { planProjectRoadmapPrompt } from './plan-project-roadmap.js';
import { projectProgressOverviewPrompt } from './project-progress-overview.js';
import { updateSpecStatusPrompt } from './update-spec-status.js';

/**
 * Register all prompts with the MCP server
 */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(...projectProgressOverviewPrompt());
  server.registerPrompt(...planProjectRoadmapPrompt());
  server.registerPrompt(...updateSpecStatusPrompt());
}
