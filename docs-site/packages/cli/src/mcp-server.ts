#!/usr/bin/env node
/**
 * LeanSpec MCP Server
 * 
 * Model Context Protocol server that exposes LeanSpec functionality to AI assistants.
 * This enables AI agents to interact with LeanSpec projects directly from their environment.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerTools } from './mcp/tools/registry.js';
import { registerResources } from './mcp/resources/registry.js';
import { registerPrompts } from './mcp/prompts/registry.js';

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

/**
 * Create the MCP server with all tools, resources, and prompts
 */
async function createMcpServer(): Promise<McpServer> {
  const server = new McpServer({
    name: 'lean-spec',
    version: packageJson.version,
  });

  // Register all components
  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}

/**
 * Main entry point
 */
async function main() {
  try {
    const server = await createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // Log to stderr so it doesn't interfere with MCP protocol on stdout
    console.error('LeanSpec MCP Server started successfully');
  } catch (error) {
    console.error('Failed to start LeanSpec MCP Server:', error);
    process.exit(1);
  }
}

export { createMcpServer };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
