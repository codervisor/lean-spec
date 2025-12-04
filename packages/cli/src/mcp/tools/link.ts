/**
 * Link tool - Add relationships between specs
 */

import { z } from 'zod';
import { linkSpec } from '../../commands/link.js';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Link tool definition
 */
export function linkTool(): ToolDefinition {
  return [
    'link',
    {
      title: 'Link Specs',
      description: 'Add dependency relationships between specs. Use this after creating a spec to connect it to specs it depends on, or to add dependencies to existing specs.',
      inputSchema: {
        specPath: z.string().describe('The spec to add dependencies to. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
        dependsOn: z.string().describe('Comma-separated specs this depends on (e.g., "045,046" or "api-design,database"). Creates upstream dependencies.'),
      },
      outputSchema: {
        success: z.boolean(),
        message: z.string(),
        updated: z.array(z.string()).optional(),
      },
    },
    async (input, _extra) => {
      const originalLog = console.log;
      try {
        // Validate dependsOn is provided
        if (!input.dependsOn) {
          const output = {
            success: false,
            message: 'dependsOn is required',
          };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
          };
        }

        // Capture output
        const updatedSpecs: string[] = [];
        console.log = (...args: any[]) => {
          const msg = args.join(' ');
          // Parse updated specs from output
          if (msg.includes('Updated:')) {
            const match = msg.match(/Updated:\s*(\S+)/);
            if (match) {
              updatedSpecs.push(match[1]);
            }
          }
        };

        await linkSpec(input.specPath, {
          dependsOn: input.dependsOn,
        });

        const output = {
          success: true,
          message: `Relationships added to spec '${input.specPath}'`,
          updated: updatedSpecs.length > 0 ? updatedSpecs : undefined,
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const output = {
          success: false,
          message: formatErrorMessage('Error linking specs', error),
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
