/**
 * MCP Server Command
 * 
 * Starts the LeanSpec MCP (Model Context Protocol) server for integration
 * with AI assistants like Claude Desktop, Cline, and other MCP clients.
 */

import { Command } from 'commander';
import { createMcpServer } from '../mcp-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * MCP command - start MCP server
 */
export function mcpCommand(): Command {
  return new Command('mcp')
    .description('Start MCP server for AI assistants (Claude Desktop, Cline, etc.)')
    .action(async () => {
      await startMcpServer();
    });
}

export async function startMcpServer(): Promise<void> {
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
