/**
 * MCP Server Command
 * 
 * Starts the LeanSpec MCP (Model Context Protocol) server for integration
 * with AI assistants like Claude Desktop, Cline, and other MCP clients.
 */

import { createMcpServer } from '../mcp-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export async function mcpCommand(): Promise<void> {
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
