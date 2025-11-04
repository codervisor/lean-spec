#!/usr/bin/env node
/**
 * LeanSpec MCP Server
 * 
 * Model Context Protocol server that exposes LeanSpec functionality to AI assistants.
 * This enables AI agents to interact with LeanSpec projects directly from their environment.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadAllSpecs } from './spec-loader.js';
import { loadConfig } from './config.js';
import { createSpec, listSpecs, updateSpec, archiveSpec } from './commands/index.js';
import { parseFrontmatter } from './frontmatter.js';
import type { SpecStatus, SpecPriority, SpecFilterOptions } from './frontmatter.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Type definitions for better type safety
type SpecData = {
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

type StatsData = {
  total: number;
  byStatus: Record<SpecStatus, number>;
  byPriority: Record<SpecPriority, number>;
  byTag: Record<string, number>;
  recentlyUpdated: SpecData[];
};

type BoardData = {
  columns: {
    [key in SpecStatus]: SpecData[];
  };
};

/**
 * Helper function to convert spec info to serializable format
 */
function specToData(spec: any): SpecData {
  return {
    name: spec.name,
    path: spec.path,
    status: spec.frontmatter.status,
    created: spec.frontmatter.created,
    title: spec.frontmatter.title,
    tags: spec.frontmatter.tags,
    priority: spec.frontmatter.priority,
    assignee: spec.frontmatter.assignee,
    description: spec.frontmatter.description,
    customFields: spec.frontmatter.custom,
  };
}

/**
 * List specs with optional filtering
 */
async function listSpecsData(options: {
  status?: SpecStatus | SpecStatus[];
  tags?: string[];
  priority?: SpecPriority | SpecPriority[];
  assignee?: string;
  customFields?: Record<string, unknown>;
  includeArchived?: boolean;
}): Promise<SpecData[]> {
  const filter: SpecFilterOptions = {};
  if (options.status) filter.status = options.status;
  if (options.tags) filter.tags = options.tags;
  if (options.priority) filter.priority = options.priority;
  if (options.assignee) filter.assignee = options.assignee;
  if (options.customFields) filter.customFields = options.customFields;

  const specs = await loadAllSpecs({
    includeArchived: options.includeArchived || false,
    filter,
  });

  return specs.map(specToData);
}

/**
 * Search specs for a query
 */
async function searchSpecsData(query: string, options: {
  status?: SpecStatus;
  tags?: string[];
  priority?: SpecPriority;
  assignee?: string;
  customFields?: Record<string, unknown>;
}): Promise<Array<{ spec: SpecData; matches: string[] }>> {
  const filter: SpecFilterOptions = {};
  if (options.status) filter.status = options.status;
  if (options.tags) filter.tags = options.tags;
  if (options.priority) filter.priority = options.priority;
  if (options.assignee) filter.assignee = options.assignee;
  if (options.customFields) filter.customFields = options.customFields;

  const specs = await loadAllSpecs({
    includeArchived: true,
    includeContent: true,
    filter,
  });

  const results: Array<{ spec: SpecData; matches: string[] }> = [];
  const queryLower = query.toLowerCase();

  for (const spec of specs) {
    if (!spec.content) continue;

    const matches: string[] = [];
    const lines = spec.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes(queryLower)) {
        matches.push(line.trim());
        if (matches.length >= 5) break; // Limit matches per spec
      }
    }

    if (matches.length > 0) {
      results.push({ spec: specToData(spec), matches });
    }
  }

  return results;
}

/**
 * Read full spec content
 */
async function readSpecData(specPath: string): Promise<{ spec: SpecData; content: string }> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  const specs = await loadAllSpecs({
    includeArchived: true,
    includeContent: true,
  });

  // Find spec by partial path match
  const spec = specs.find(s => 
    s.path.includes(specPath) || 
    s.name.includes(specPath) ||
    s.path.endsWith(specPath)
  );

  if (!spec) {
    throw new Error(`Spec not found: ${specPath}`);
  }

  return {
    spec: specToData(spec),
    content: spec.content || '',
  };
}

/**
 * Get project statistics
 */
async function getStatsData(): Promise<StatsData> {
  const specs = await loadAllSpecs({
    includeArchived: false,
  });

  const byStatus: Record<SpecStatus, number> = {
    planned: 0,
    'in-progress': 0,
    complete: 0,
    archived: 0,
  };

  const byPriority: Record<SpecPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const byTag: Record<string, number> = {};

  for (const spec of specs) {
    byStatus[spec.frontmatter.status] = (byStatus[spec.frontmatter.status] || 0) + 1;
    if (spec.frontmatter.priority) {
      byPriority[spec.frontmatter.priority] = (byPriority[spec.frontmatter.priority] || 0) + 1;
    }
    if (spec.frontmatter.tags) {
      for (const tag of spec.frontmatter.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
    }
  }

  // Get recently updated (sort by path which includes date in many configs)
  const recentlyUpdated = specs
    .sort((a, b) => b.path.localeCompare(a.path))
    .slice(0, 5)
    .map(specToData);

  return {
    total: specs.length,
    byStatus,
    byPriority,
    byTag,
    recentlyUpdated,
  };
}

/**
 * Get Kanban board view
 */
async function getBoardData(): Promise<BoardData> {
  const specs = await loadAllSpecs({
    includeArchived: false,
  });

  const columns: BoardData['columns'] = {
    planned: [],
    'in-progress': [],
    complete: [],
    archived: [],
  };

  for (const spec of specs) {
    columns[spec.frontmatter.status].push(specToData(spec));
  }

  return { columns };
}

/**
 * Regex pattern for detecting spec references in content.
 * Matches patterns like:
 * - "spec: 001-feature"
 * - "specs: 023-something"
 * - "depends on: 042-dependency"
 * The pattern expects at least 3 digits followed by optional hyphens and word characters.
 */
const SPEC_REFERENCE_REGEX = /(?:spec[s]?[:\s]+|depends on[:\s]+)([0-9]{3,}[-\w]+)/gi;

/**
 * Get spec dependencies
 */
async function getDepsData(specPath: string): Promise<{
  spec: SpecData;
  dependencies: string[];
  dependents: string[];
}> {
  const { spec, content } = await readSpecData(specPath);
  
  // Simple dependency parsing - looks for references to other specs
  const dependencies: string[] = [];
  let match;
  
  while ((match = SPEC_REFERENCE_REGEX.exec(content)) !== null) {
    dependencies.push(match[1]);
  }

  // For now, we'll skip finding dependents (would require scanning all specs)
  const dependents: string[] = [];

  return {
    spec,
    dependencies: [...new Set(dependencies)],
    dependents,
  };
}

/**
 * Create the MCP server
 */
async function createMcpServer(): Promise<McpServer> {
  const server = new McpServer({
    name: 'lean-spec',
    version: '0.1.0',
  });

  // ===== TOOLS =====

  // Tool: lspec_list
  server.registerTool(
    'lspec_list',
    {
      title: 'List Specs',
      description: 'List all specifications with optional filtering by status, tags, priority, or assignee',
      inputSchema: {
        status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional(),
        tags: z.array(z.string()).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        assignee: z.string().optional(),
        includeArchived: z.boolean().optional(),
      },
      outputSchema: {
        specs: z.array(z.any()),
      },
    },
    async (input) => {
      const specs = await listSpecsData({
        status: input.status as SpecStatus | undefined,
        tags: input.tags,
        priority: input.priority as SpecPriority | undefined,
        assignee: input.assignee,
        includeArchived: input.includeArchived,
      });

      const output = { specs };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  // Tool: lspec_search
  server.registerTool(
    'lspec_search',
    {
      title: 'Search Specs',
      description: 'Full-text search across all specifications',
      inputSchema: {
        query: z.string(),
        status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional(),
        tags: z.array(z.string()).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      },
      outputSchema: {
        results: z.array(z.any()),
      },
    },
    async (input) => {
      const results = await searchSpecsData(input.query, {
        status: input.status as SpecStatus | undefined,
        tags: input.tags,
        priority: input.priority as SpecPriority | undefined,
      });

      const output = { results };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  // Tool: lspec_read
  server.registerTool(
    'lspec_read',
    {
      title: 'Read Spec',
      description: 'Read the full content of a specification',
      inputSchema: {
        specPath: z.string(),
      },
      outputSchema: {
        spec: z.any(),
        content: z.string(),
      },
    },
    async (input) => {
      const result = await readSpecData(input.specPath);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );

  // Tool: lspec_create
  server.registerTool(
    'lspec_create',
    {
      title: 'Create Spec',
      description: 'Create a new specification',
      inputSchema: {
        name: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        assignee: z.string().optional(),
        template: z.string().optional(),
      },
      outputSchema: {
        success: z.boolean(),
        path: z.string(),
        message: z.string(),
      },
    },
    async (input) => {
      const originalLog = console.log;
      try {
        // Capture output
        let capturedOutput = '';
        console.log = (...args: any[]) => {
          capturedOutput += args.join(' ') + '\n';
        };

        await createSpec(input.name, {
          title: input.title,
          description: input.description,
          tags: input.tags,
          priority: input.priority as SpecPriority | undefined,
          assignee: input.assignee,
          template: input.template,
        });

        const output = {
          success: true,
          path: capturedOutput.includes('Created:') ? capturedOutput.split('Created:')[1].split('\n')[0].trim() : '',
          message: `Spec '${input.name}' created successfully`,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const output = {
          success: false,
          path: '',
          message: `Error creating spec: ${error instanceof Error ? error.message : String(error)}`,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } finally {
        console.log = originalLog;
      }
    }
  );

  // Tool: lspec_update
  server.registerTool(
    'lspec_update',
    {
      title: 'Update Spec',
      description: 'Update specification metadata (status, priority, tags, etc.)',
      inputSchema: {
        specPath: z.string(),
        status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        tags: z.array(z.string()).optional(),
        assignee: z.string().optional(),
      },
      outputSchema: {
        success: z.boolean(),
        message: z.string(),
      },
    },
    async (input) => {
      const originalLog = console.log;
      try {
        // Capture output
        let capturedOutput = '';
        console.log = (...args: any[]) => {
          capturedOutput += args.join(' ') + '\n';
        };

        // Filter out undefined values to prevent YAML serialization errors
        const updates: Record<string, unknown> = {};
        if (input.status !== undefined) updates.status = input.status as SpecStatus;
        if (input.priority !== undefined) updates.priority = input.priority as SpecPriority;
        if (input.tags !== undefined) updates.tags = input.tags;
        if (input.assignee !== undefined) updates.assignee = input.assignee;

        await updateSpec(input.specPath, updates);

        const output = {
          success: true,
          message: `Spec updated successfully`,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const output = {
          success: false,
          message: `Error updating spec: ${error instanceof Error ? error.message : String(error)}`,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } finally {
        console.log = originalLog;
      }
    }
  );

  // Tool: lspec_stats
  server.registerTool(
    'lspec_stats',
    {
      title: 'Get Statistics',
      description: 'Get project statistics including counts by status, priority, and tags',
      inputSchema: {},
      outputSchema: {
        stats: z.any(),
      },
    },
    async () => {
      const stats = await getStatsData();
      const output = { stats };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  // Tool: lspec_board
  server.registerTool(
    'lspec_board',
    {
      title: 'Get Kanban Board',
      description: 'Get Kanban board view organized by status columns',
      inputSchema: {},
      outputSchema: {
        board: z.any(),
      },
    },
    async () => {
      const board = await getBoardData();
      const output = { board };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  // Tool: lspec_deps
  server.registerTool(
    'lspec_deps',
    {
      title: 'Get Dependencies',
      description: 'Show dependencies and dependents for a specification',
      inputSchema: {
        specPath: z.string(),
      },
      outputSchema: {
        dependencies: z.any(),
      },
    },
    async (input) => {
      const deps = await getDepsData(input.specPath);
      const output = { dependencies: deps };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  // ===== RESOURCES =====

  // Resource: spec://<spec-name>
  server.registerResource(
    'spec',
    new ResourceTemplate('spec://{specPath}', { list: undefined }),
    {
      title: 'Spec Content',
      description: 'Read individual specification content by path or name',
    },
    async (uri, { specPath }) => {
      const pathString = Array.isArray(specPath) ? specPath[0] : specPath;
      const { spec, content } = await readSpecData(pathString);
      return {
        contents: [
          {
            uri: uri.href,
            text: `# ${spec.name}\n\nStatus: ${spec.status}\nCreated: ${spec.created}\n${spec.priority ? `Priority: ${spec.priority}\n` : ''}${spec.tags ? `Tags: ${spec.tags.join(', ')}\n` : ''}\n\n${content}`,
            mimeType: 'text/markdown',
          },
        ],
      };
    }
  );

  // Resource: board://kanban
  server.registerResource(
    'board',
    new ResourceTemplate('board://kanban', { list: undefined }),
    {
      title: 'Kanban Board',
      description: 'Current Kanban board state organized by status',
    },
    async (uri) => {
      const board = await getBoardData();
      const text = Object.entries(board.columns)
        .map(([status, specs]) => {
          const header = `## ${status.toUpperCase()} (${specs.length})`;
          const items = specs.map(s => `- ${s.name} ${s.priority ? `[${s.priority}]` : ''}`).join('\n');
          return `${header}\n${items || '(empty)'}`;
        })
        .join('\n\n');

      return {
        contents: [
          {
            uri: uri.href,
            text,
            mimeType: 'text/markdown',
          },
        ],
      };
    }
  );

  // Resource: stats://overview
  server.registerResource(
    'stats',
    new ResourceTemplate('stats://overview', { list: undefined }),
    {
      title: 'Project Statistics',
      description: 'Overview of project statistics',
    },
    async (uri) => {
      const stats = await getStatsData();
      
      const statusSection = Object.entries(stats.byStatus)
        .map(([status, count]) => `- ${status}: ${count}`)
        .join('\n');
      
      const prioritySection = Object.entries(stats.byPriority)
        .filter(([_, count]) => count > 0)
        .map(([priority, count]) => `- ${priority}: ${count}`)
        .join('\n');
      
      const tagSection = Object.entries(stats.byTag)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => `- ${tag}: ${count}`)
        .join('\n');

      const text = `# Project Statistics

## Total Specs: ${stats.total}

## By Status
${statusSection}

## By Priority
${prioritySection || '(none)'}

## Top Tags
${tagSection || '(none)'}

## Recently Updated
${stats.recentlyUpdated.map(s => `- ${s.name} (${s.status})`).join('\n') || '(none)'}`;

      return {
        contents: [
          {
            uri: uri.href,
            text,
            mimeType: 'text/markdown',
          },
        ],
      };
    }
  );

  // ===== PROMPTS =====

  // Prompt: Create feature spec
  server.registerPrompt(
    'create-feature-spec',
    {
      title: 'Create Feature Spec',
      description: 'Guided workflow to create a new feature specification',
      argsSchema: {
        featureName: z.string(),
        description: z.string().optional(),
      },
    },
    ({ featureName, description }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a new feature specification for: ${featureName}${description ? `\n\nDescription: ${description}` : ''}\n\nPlease create this spec with appropriate metadata (status, priority, tags) and include standard sections like Overview, Design, Plan, and Test.`,
          },
        },
      ],
    })
  );

  // Prompt: Update spec status
  server.registerPrompt(
    'update-spec-status',
    {
      title: 'Update Spec Status',
      description: 'Quick workflow to update specification status',
      argsSchema: {
        specPath: z.string(),
        newStatus: z.enum(['planned', 'in-progress', 'complete', 'archived']),
      },
    },
    ({ specPath, newStatus }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Update the status of spec "${specPath}" to "${newStatus}". Use the lspec_update tool to make this change.`,
          },
        },
      ],
    })
  );

  // Prompt: Find related specs
  server.registerPrompt(
    'find-related-specs',
    {
      title: 'Find Related Specs',
      description: 'Discover specifications related to a topic or feature',
      argsSchema: {
        topic: z.string(),
      },
    },
    ({ topic }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Find all specifications related to: ${topic}\n\nPlease search for this topic and show me the dependencies between related specs.`,
          },
        },
      ],
    })
  );

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
