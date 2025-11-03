#!/usr/bin/env node

/**
 * LeanSpec MCP Server Entry Point
 * 
 * This script starts the MCP server using stdio transport for
 * communication with MCP clients like Claude Desktop.
 */

import { createMcpServer } from '../dist/mcp-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

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

main();
