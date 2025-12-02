/**
 * Check tool - Check for sequence number conflicts
 */

import { z } from 'zod';
import { checkSpecs } from '../../commands/index.js';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Check tool definition
 */
export function checkTool(): ToolDefinition {
  return [
    'check',
    {
      title: 'Check Sequence Conflicts',
      description: 'Check for sequence number conflicts in the specs directory. Use this to detect duplicate sequence numbers or naming issues. Returns list of conflicts if any.',
      inputSchema: {},
      outputSchema: {
        hasConflicts: z.boolean(),
        conflicts: z.array(z.any()).optional(),
        message: z.string(),
      },
    },
    async (_input, _extra) => {
      const originalLog = console.log;
      const originalError = console.error;
      try {
        let capturedOutput = '';
        console.log = (...args: any[]) => {
          capturedOutput += args.join(' ') + '\n';
        };
        console.error = (...args: any[]) => {
          capturedOutput += args.join(' ') + '\n';
        };

        const hasNoConflicts = await checkSpecs({ quiet: false });

        const output = {
          hasConflicts: !hasNoConflicts,
          message: hasNoConflicts ? 'No sequence conflicts found' : 'Sequence conflicts detected',
          conflicts: !hasNoConflicts ? capturedOutput.split('\n').filter(l => l.trim()) : undefined,
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error checking specs', error);
        return {
          content: [{ type: 'text' as const, text: errorMessage }],
          isError: true,
        };
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    }
  ];
}
