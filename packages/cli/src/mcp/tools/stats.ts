/**
 * Stats tool - Get project statistics and metrics
 */

import { z } from 'zod';
import { loadAllSpecs } from '../../spec-loader.js';
import type { SpecStatus, SpecPriority } from '../../frontmatter.js';
import { formatErrorMessage, specToData } from '../helpers.js';
import type { ToolDefinition, StatsData } from '../types.js';

/**
 * Get project statistics
 */
export async function getStatsData(): Promise<StatsData> {
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
 * Stats tool definition
 */
export function statsTool(): ToolDefinition {
  return [
    'stats',
    {
      title: 'Get Statistics',
      description: 'Get project statistics and metrics. Use this to understand project completion, workload distribution, or get a high-level overview. Returns counts by status, priority, tags, and recent activity.',
      inputSchema: {},
      outputSchema: {
        stats: z.any(),
      },
    },
    async (_input, _extra) => {
      try {
        const stats = await getStatsData();
        const output = { stats };
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error getting stats', error);
        return {
          content: [{ type: 'text' as const, text: errorMessage }],
          isError: true,
        };
      }
    }
  ];
}
