/**
 * List tool - List all specifications with optional filtering
 */

import { z } from 'zod';
import { loadAllSpecs } from '../../spec-loader.js';
import type { SpecStatus, SpecPriority, SpecFilterOptions } from '../../frontmatter.js';
import { formatErrorMessage, specToData, loadSubSpecMetadata, getStaleSpecs } from '../helpers.js';
import type { ToolDefinition, SpecData, BoardData } from '../types.js';

/**
 * List specs with optional filtering
 */
export async function listSpecsData(options: {
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

  // Convert specs to data and add sub-spec metadata
  const specsData = await Promise.all(
    specs.map(async (spec) => {
      const data = specToData(spec);
      
      // Load sub-spec metadata for progressive disclosure
      const subSpecs = await loadSubSpecMetadata(spec.fullPath);
      if (subSpecs.length > 0) {
        data.subSpecs = subSpecs;
      }
      
      return data;
    })
  );

  return specsData;
}

/**
 * List tool definition
 */
export function listTool(): ToolDefinition {
  return [
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
        warnings: z.array(z.string()).optional(),
      },
    },
    async (input, _extra) => {
      const originalLog = console.log;
      try {
        const specs = await listSpecsData({
          status: input.status as SpecStatus | undefined,
          tags: input.tags,
          priority: input.priority as SpecPriority | undefined,
          assignee: input.assignee,
          includeArchived: input.includeArchived,
        });

        // Check for stale specs (only when not filtering by status)
        const warnings: string[] = [];
        if (!input.status) {
          // Build a minimal board structure for stale detection
          const inProgressSpecs = specs.filter(s => s.status === 'in-progress');
          const mockBoard: BoardData = {
            columns: {
              planned: [],
              'in-progress': inProgressSpecs,
              complete: [],
              archived: [],
            },
          };
          const staleSpecs = getStaleSpecs(mockBoard);
          for (const spec of staleSpecs) {
            warnings.push(`⚠️ Spec "${spec.name}" has been in-progress for ${spec.daysStale} days. Consider updating status.`);
          }
        }

        const output = { 
          specs,
          ...(warnings.length > 0 ? { warnings } : {}),
        };
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error listing specs', error);
        return {
          content: [{ type: 'text' as const, text: errorMessage }],
          isError: true,
        };
      }
    }
  ];
}
