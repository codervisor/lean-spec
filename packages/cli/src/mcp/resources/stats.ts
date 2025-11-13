/**
 * Stats resource - Project statistics overview
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatErrorMessage } from '../helpers.js';
import { getStatsData } from '../tools/stats.js';

/**
 * Stats resource definition
 */
export function statsResource() {
  return [
    'stats',
    new ResourceTemplate('stats://overview', { list: undefined }),
    {
      title: 'Project Statistics',
      description: 'Overview of project statistics',
    },
    async (uri: URL) => {
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
  ] as const;
}
