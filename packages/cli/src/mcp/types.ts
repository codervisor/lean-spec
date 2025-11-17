/**
 * Type definitions for MCP server modules
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';
import type { z } from 'zod';

/**
 * Sub-spec file reference for progressive disclosure
 * See spec 084: Sub-Spec File Visibility in MCP Tools and Commands
 */
export type SubSpecReference = {
  name: string;           // "DESIGN.md"
  tokens: number;         // Token count for context economy decisions
  summary?: string;       // First H1 heading or first 100 chars
  size?: number;          // File size in bytes (optional)
};

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
  subSpecs?: SubSpecReference[];  // Only when viewing main spec
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
  handler: (input: any, extra: any) => Promise<{
    content: Array<{ type: string; text: string }>;
    structuredContent?: any;
    isError?: boolean;
  }>
];
