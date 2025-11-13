/**
 * Board resource - Kanban board view
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatErrorMessage } from '../helpers.js';
import { getBoardData } from '../tools/board.js';

/**
 * Board resource definition
 */
export function boardResource() {
  return [
    'board',
    new ResourceTemplate('board://kanban', { list: undefined }),
    {
      title: 'Kanban Board',
      description: 'Current Kanban board state organized by status',
    },
    async (uri: URL) => {
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
  ] as const;
}
