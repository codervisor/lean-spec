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
import { loadAllSpecs, getSpec } from './spec-loader.js';
import { loadConfig } from './config.js';
import { createSpec, listSpecs, updateSpec, archiveSpec } from './commands/index.js';
import { parseFrontmatter } from './frontmatter.js';
import type { SpecStatus, SpecPriority, SpecFilterOptions } from './frontmatter.js';
import { resolveSpecPath } from './utils/path-helpers.js';
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
 * Helper function to format error messages
 */
function formatErrorMessage(prefix: string, error: unknown): string {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${errorMsg}`;
}

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
  
  // Use resolveSpecPath to handle numbers like "14" or "014"
  const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
  
  if (!resolvedPath) {
    throw new Error(`Spec not found: ${specPath}`);
  }
  
  // Get the spec using the resolved path
  const specInfo = await getSpec(resolvedPath);
  
  if (!specInfo) {
    throw new Error(`Spec not found: ${specPath}`);
  }

  return {
    spec: specToData(specInfo),
    content: specInfo.content || '',
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

  // Tool: list
  server.registerTool(
    'list',
    {
      title: 'List Specs',
      description: 'List all specifications with optional filtering. Use this to get an overview of the project, find specs by status/priority, or discover what specs exist. Returns basic metadata for each spec.',
      inputSchema: {
        status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional().describe('Filter by spec status. Use to find specs in a specific state.'),
        tags: z.array(z.string()).optional().describe('Filter by tags (e.g., ["api", "frontend"]). Only specs with ALL specified tags will be returned.'),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Filter by priority level. Use to find urgent or important specs.'),
        assignee: z.string().optional().describe('Filter by assignee name. Use to find specs assigned to a specific person.'),
        includeArchived: z.boolean().optional().describe('Include archived specs in results (default: false). Set to true to see completed/archived work.'),
      },
      outputSchema: {
        specs: z.array(z.any()),
      },
    },
    async (input) => {
      try {
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
      } catch (error) {
        const errorMessage = formatErrorMessage('Error listing specs', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    }
  );

  // Tool: search
  server.registerTool(
    'search',
    {
      title: 'Search Specs',
      description: 'Full-text search across all specification content. Use this when you need to find specs by keyword, topic, or concept. Returns matching specs with relevant excerpts.',
      inputSchema: {
        query: z.string().describe('Search term or phrase to find in spec content. Searches across titles, descriptions, and body text.'),
        status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional().describe('Limit search to specs with this status.'),
        tags: z.array(z.string()).optional().describe('Limit search to specs with these tags.'),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Limit search to specs with this priority.'),
      },
      outputSchema: {
        results: z.array(z.any()),
      },
    },
    async (input) => {
      try {
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
      } catch (error) {
        const errorMessage = formatErrorMessage('Error searching specs', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    }
  );

  // Tool: view
  server.registerTool(
    'view',
    {
      title: 'View Spec',
      description: 'Read the complete content of a specification. Use this to understand spec details, review design decisions, or check implementation status. Returns metadata and full content.',
      inputSchema: {
        specPath: z.string().describe('The spec to view. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
        raw: z.boolean().optional().describe('Output raw markdown instead of formatted'),
        json: z.boolean().optional().describe('Output as JSON instead of formatted'),
      },
      outputSchema: {
        spec: z.any(),
        content: z.string(),
      },
    },
    async (input) => {
      try {
        const result = await readSpecData(input.specPath);
        
        // If json flag is set, return structured data
        if (input.json) {
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
          };
        }
        
        // If raw flag is set, return raw markdown
        if (input.raw) {
          const rawMarkdown = `---\nstatus: ${result.spec.status}\ncreated: ${result.spec.created}\n${result.spec.priority ? `priority: ${result.spec.priority}\n` : ''}${result.spec.tags ? `tags:\n${result.spec.tags.map(t => `  - ${t}`).join('\n')}\n` : ''}${result.spec.assignee ? `assignee: ${result.spec.assignee}\n` : ''}---\n\n${result.content}`;
          return {
            content: [{ type: 'text', text: rawMarkdown }],
          };
        }
        
        // Default: formatted output
        const formatted = `# ${result.spec.name}\n\nStatus: ${result.spec.status}\nCreated: ${result.spec.created}\n${result.spec.priority ? `Priority: ${result.spec.priority}\n` : ''}${result.spec.tags ? `Tags: ${result.spec.tags.join(', ')}\n` : ''}${result.spec.assignee ? `Assignee: ${result.spec.assignee}\n` : ''}\n\n${result.content}`;
        return {
          content: [{ type: 'text', text: formatted }],
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error viewing spec', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    }
  );

  // Tool: create
  server.registerTool(
    'create',
    {
      title: 'Create Spec',
      description: 'Create a new specification for a feature, design, or project. Use this when starting new work that needs documentation. The system auto-generates the sequence number.',
      inputSchema: {
        name: z.string().describe('The spec name/slug only (e.g., "unified-dashboard"). Do NOT include sequence numbers like "045-". The system automatically prepends the next sequence number.'),
        title: z.string().optional().describe('Human-readable title for the spec. If omitted, the name is used as the title.'),
        description: z.string().optional().describe('Initial description text to add to the Overview section.'),
        tags: z.array(z.string()).optional().describe('Tags to categorize the spec (e.g., ["api", "frontend", "v2.0"]).'),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Priority level for the spec. Defaults to "medium" if not specified.'),
        assignee: z.string().optional().describe('Person responsible for this spec.'),
        template: z.string().optional().describe('Template name to use (e.g., "minimal", "enterprise"). Uses default template if omitted.'),
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
          message: formatErrorMessage('Error creating spec', error),
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

  // Tool: update
  server.registerTool(
    'update',
    {
      title: 'Update Spec',
      description: 'Update specification metadata (status, priority, tags, assignee). Use this to track progress, change priorities, or reassign work. Does NOT modify the spec content itself.',
      inputSchema: {
        specPath: z.string().describe('The spec to update. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
        status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional().describe('Update the spec status. Use "in-progress" when work starts, "complete" when done.'),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Update the priority level.'),
        tags: z.array(z.string()).optional().describe('Replace tags entirely with this new array. To add/remove individual tags, read first then update.'),
        assignee: z.string().optional().describe('Update who is responsible for this spec.'),
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
          message: formatErrorMessage('Error updating spec', error),
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

  // Tool: stats
  server.registerTool(
    'stats',
    {
      title: 'Get Statistics',
      description: 'Get project statistics and metrics. Use this to understand project completion, workload distribution, or get a high-level overview. Returns counts by status, priority, tags, and recent activity.',
      inputSchema: {},
      outputSchema: {
        stats: z.any(),
      },
    },
    async () => {
      try {
        const stats = await getStatsData();
        const output = { stats };
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error getting stats', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    }
  );

  // Tool: board
  server.registerTool(
    'board',
    {
      title: 'Get Kanban Board',
      description: 'Get Kanban board view of all specs organized by status. Use this to visualize workflow, see what\'s in progress, or identify bottlenecks. Returns specs grouped into planned/in-progress/complete/archived columns.',
      inputSchema: {},
      outputSchema: {
        board: z.any(),
      },
    },
    async () => {
      try {
        const board = await getBoardData();
        const output = { board };
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error getting board', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    }
  );

  // Tool: deps
  server.registerTool(
    'deps',
    {
      title: 'Get Dependencies',
      description: 'Analyze spec dependencies and relationships. Use this to understand which specs depend on or are referenced by a given spec. Helps identify impact of changes and work order.',
      inputSchema: {
        specPath: z.string().describe('The spec to analyze. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
      },
      outputSchema: {
        dependencies: z.any(),
      },
    },
    async (input) => {
      try {
        const deps = await getDepsData(input.specPath);
        const output = { dependencies: deps };
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error getting dependencies', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
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
      try {
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
      } catch (error) {
        throw new Error(formatErrorMessage('Failed to read spec resource', error));
      }
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
      try {
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
      } catch (error) {
        throw new Error(formatErrorMessage('Failed to get board resource', error));
      }
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
      try {
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
      } catch (error) {
        throw new Error(formatErrorMessage('Failed to get stats resource', error));
      }
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
            text: `Update the status of spec "${specPath}" to "${newStatus}". Use the update tool to make this change.`,
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
