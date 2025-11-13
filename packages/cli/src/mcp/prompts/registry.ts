/**
 * Prompt registry - Register all MCP prompts
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createFeatureSpecPrompt } from './create-feature-spec.js';
import { findRelatedSpecsPrompt } from './find-related-specs.js';
import { updateSpecStatusPrompt } from './update-spec-status.js';

/**
 * Register all prompts with the MCP server
 */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(...createFeatureSpecPrompt());
  server.registerPrompt(...findRelatedSpecsPrompt());
  server.registerPrompt(...updateSpecStatusPrompt());
}
