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
      description: 'Remove relationships between specs. Can remove specific relationships or all relationships of a type. Related links are removed bidirectionally (from both specs).',
      inputSchema: {
        specPath: z.string().describe('The spec to remove relationships from. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
        dependsOn: z.string().optional().describe('Comma-separated dependencies to remove (e.g., "045,046"). Leave empty with removeAll=true to remove all dependencies.'),
        related: z.string().optional().describe('Comma-separated related specs to remove (e.g., "047,frontend"). Removes bidirectionally. Leave empty with removeAll=true to remove all.'),
        removeAll: z.boolean().optional().describe('When true, removes ALL relationships of the specified type(s). Use with dependsOn or related to clear all of that type.'),
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
        // Validate at least one relationship type is provided
        if (!input.dependsOn && !input.related && !input.removeAll) {
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
          related?: string | boolean;
          all?: boolean;
        } = {
          all: input.removeAll,
        };

        // Handle dependsOn - if removeAll is true and dependsOn is provided but empty, use boolean
        if (input.dependsOn !== undefined) {
          options.dependsOn = input.dependsOn || true;
        } else if (input.removeAll) {
          // If removeAll without specific field, we need explicit opt-in
        }

        // Handle related similarly
        if (input.related !== undefined) {
          options.related = input.related || true;
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
