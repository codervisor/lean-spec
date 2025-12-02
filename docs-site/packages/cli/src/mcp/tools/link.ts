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
      description: 'Add relationships between specs (depends_on for dependencies, related for bidirectional links). Use this after creating a spec to connect it to related specs, or to add relationships to existing specs.',
      inputSchema: {
        specPath: z.string().describe('The spec to add relationships to. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
        dependsOn: z.string().optional().describe('Comma-separated specs this depends on (e.g., "045,046" or "api-design,database"). Creates upstream dependencies.'),
        related: z.string().optional().describe('Comma-separated related specs (e.g., "047,frontend"). Creates bidirectional relationships - both specs will reference each other.'),
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
        // Validate at least one relationship type is provided
        if (!input.dependsOn && !input.related) {
          const output = {
            success: false,
            message: 'At least one relationship type required (dependsOn or related)',
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
          related: input.related,
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
