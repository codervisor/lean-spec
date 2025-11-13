/**
 * Validate tool - Validate specs for quality issues
 */

import { z } from 'zod';
import { validateSpecs } from '../../commands/validate.js';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Validate tool definition
 */
export function validateTool(): ToolDefinition {
  return [
    'validate',
    {
      title: 'Validate Specs',
      description: 'Validate specifications for quality issues like excessive length, missing sections, or complexity problems. Use this before committing changes or for project health checks.',
      inputSchema: {
        specs: z.array(z.string()).optional().describe('Specific specs to validate. If omitted, validates all specs in the project.'),
        maxLines: z.number().optional().describe('Custom line limit for complexity checks (default: 400 lines).'),
      },
      outputSchema: {
        passed: z.boolean(),
        issues: z.array(z.any()).optional(),
        message: z.string(),
      },
    },
    async (input) => {
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

        const passed = await validateSpecs({
          maxLines: input.maxLines,
          specs: input.specs,
        });

        const output = {
          passed,
          message: passed ? 'All specs passed validation' : 'Some specs have validation issues',
          issues: !passed ? capturedOutput.split('\n').filter(l => l.trim()) : undefined,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error validating specs', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    }
  ];
}
