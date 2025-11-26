/**
 * Board tool - Get Kanban board view
 */

import { z } from 'zod';
import { loadAllSpecs } from '../../spec-loader.js';
import { formatErrorMessage, specToData, getStaleSpecs } from '../helpers.js';
import type { ToolDefinition, BoardData } from '../types.js';

/**
 * Get Kanban board view
 */
export async function getBoardData(): Promise<BoardData> {
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
 * Board tool definition
 */
export function boardTool(): ToolDefinition {
  return [
    'board',
    {
      title: 'Get Kanban Board',
      description: 'Get Kanban board view of all specs organized by status. Use this to visualize workflow, see what\'s in progress, or identify bottlenecks. Returns specs grouped into planned/in-progress/complete/archived columns.',
      inputSchema: {},
      outputSchema: {
        board: z.any(),
        warnings: z.array(z.string()).optional(),
      },
    },
    async (_input, _extra) => {
      try {
        const board = await getBoardData();
        
        // Check for stale specs (in-progress for > 7 days)
        const staleSpecs = getStaleSpecs(board);
        const warnings: string[] = [];
        
        if (staleSpecs.length > 0) {
          for (const spec of staleSpecs) {
            warnings.push(`⚠️ Spec "${spec.name}" has been in-progress for ${spec.daysStale} days. Consider updating status.`);
          }
        }
        
        const output = { 
          board,
          ...(warnings.length > 0 ? { warnings } : {}),
        };
        
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error getting board', error);
        return {
          content: [{ type: 'text' as const, text: errorMessage }],
          isError: true,
        };
      }
    }
  ];
}
