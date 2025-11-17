/**
 * Archive tool - Move a spec to archived directory
 */

import { z } from 'zod';
import { archiveSpec } from '../../commands/index.js';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Archive tool definition
 */
export function archiveTool(): ToolDefinition {
  return [
    'archive',
    {
      title: 'Archive Spec',
      description: 'Move a specification to the archived/ directory. Use this when a spec is complete or no longer active. The spec will be moved but not deleted.',
      inputSchema: {
        specPath: z.string().describe('The spec to archive. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
      },
      outputSchema: {
        success: z.boolean(),
        message: z.string(),
      },
    },
    async (input, _extra) => {
      const originalLog = console.log;
      try {
        let capturedOutput = '';
        console.log = (...args: any[]) => {
          capturedOutput += args.join(' ') + '\n';
        };

        await archiveSpec(input.specPath);

        const output = {
          success: true,
          message: `Spec archived successfully`,
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const output = {
          success: false,
          message: formatErrorMessage('Error archiving spec', error),
        };
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } finally {
        console.log = originalLog;
      }
    }
  ];
}
