/**
 * Spec resource - Read individual specification content
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatErrorMessage } from '../helpers.js';
import { readSpecData } from '../tools/view.js';

/**
 * Spec resource definition
 */
export function specResource() {
  return [
    'spec',
    new ResourceTemplate('spec://{specPath}', { list: undefined }),
    {
      title: 'Spec Content',
      description: 'Read individual specification content by path or name',
    },
    async (uri: URL, { specPath }: { specPath: string | string[] }) => {
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
  ] as const;
}
