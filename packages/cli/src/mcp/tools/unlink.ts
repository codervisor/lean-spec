/**
 * Unlink tool - Remove relationships between specs
 */

import { z } from 'zod';
import { unlinkSpec } from '../../commands/unlink.js';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Unlink tool definition
 */
export function unlinkTool(): ToolDefinition {
  return [
    'unlink',
    {
      title: 'Unlink Specs',
      description: 'Remove dependency relationships between specs. Can remove specific dependencies or all dependencies.',
      inputSchema: {
        specPath: z.string().describe('The spec to remove dependencies from. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
        dependsOn: z.string().optional().describe('Comma-separated dependencies to remove (e.g., "045,046"). Leave empty with removeAll=true to remove all dependencies.'),
        removeAll: z.boolean().optional().describe('When true, removes ALL dependencies. Use with dependsOn to clear all.'),
      },
      outputSchema: {
        success: z.boolean(),
        message: z.string(),
        removed: z.number().optional(),
        updated: z.array(z.string()).optional(),
      },
    },
    async (input, _extra) => {
      const originalLog = console.log;
      try {
        // Validate at least one option is provided
        if (!input.dependsOn && !input.removeAll) {
          const output = {
            success: false,
            message: 'Either dependsOn or removeAll is required',
          };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
          };
        }

        // Capture output
        const updatedSpecs: string[] = [];
        let removedCount = 0;
        console.log = (...args: any[]) => {
          const msg = args.join(' ');
          // Parse updated specs from output
          if (msg.includes('Updated:')) {
            const match = msg.match(/Updated:\s*(\S+)/);
            if (match) {
              updatedSpecs.push(match[1]);
            }
          }
          // Parse removed count
          const countMatch = msg.match(/\((\d+) total\)/);
          if (countMatch) {
            removedCount = parseInt(countMatch[1], 10);
          }
        };

        // Build options for unlinkSpec
        const options: {
          dependsOn?: string | boolean;
          all?: boolean;
        } = {
          all: input.removeAll,
        };

        // Handle dependsOn - if removeAll is true and dependsOn is provided but empty, use boolean
        if (input.dependsOn !== undefined) {
          options.dependsOn = input.dependsOn || true;
        } else if (input.removeAll) {
          options.dependsOn = true;
        }

        await unlinkSpec(input.specPath, options);

        const output = {
          success: true,
          message: removedCount > 0 
            ? `Removed ${removedCount} relationship(s) from spec '${input.specPath}'`
            : `No matching relationships found to remove from '${input.specPath}'`,
          removed: removedCount,
          updated: updatedSpecs.length > 0 ? updatedSpecs : undefined,
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const output = {
          success: false,
          message: formatErrorMessage('Error unlinking specs', error),
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
