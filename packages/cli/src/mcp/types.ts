/**
 * Type definitions for MCP server modules
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';
import type { z } from 'zod';

/**
 * Serializable spec metadata for MCP responses
 */
export type SpecData = {
  name: string;
  path: string;
  status: SpecStatus;
  created: string;
  title?: string;
  tags?: string[];
  priority?: SpecPriority;
  assignee?: string;
  description?: string;
  customFields?: Record<string, unknown>;
};

/**
 * Project statistics for MCP responses
 */
export type StatsData = {
  total: number;
  byStatus: Record<SpecStatus, number>;
  byPriority: Record<SpecPriority, number>;
  byTag: Record<string, number>;
  recentlyUpdated: SpecData[];
};

/**
 * Kanban board data structure
 */
export type BoardData = {
  columns: {
    [key in SpecStatus]: SpecData[];
  };
};

/**
 * Tool definition structure
 */
export type ToolDefinition = [
  name: string,
  config: {
    title: string;
    description: string;
    inputSchema: Record<string, z.ZodTypeAny>;
    outputSchema: Record<string, z.ZodTypeAny>;
  },
  handler: (input: any) => Promise<{
    content: Array<{ type: string; text: string }>;
    structuredContent?: any;
    isError?: boolean;
  }>
];
