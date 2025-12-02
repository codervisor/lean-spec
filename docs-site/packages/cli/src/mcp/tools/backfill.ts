/**
 * Backfill tool - Backfill missing timestamps from git history
 */

import { z } from 'zod';
import { backfillTimestamps } from '../../commands/index.js';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Backfill tool definition
 */
export function backfillTool(): ToolDefinition {
  return [
    'backfill',
    {
      title: 'Backfill Timestamps',
      description: 'Backfill missing timestamps and metadata from git history. Use this to populate created/completed dates, assignees, or status transitions for specs that lack this data.',
      inputSchema: {
        specs: z.array(z.string()).optional().describe('Specific specs to backfill. If omitted, processes all specs.'),
        dryRun: z.boolean().optional().describe('Preview changes without applying them (default: false).'),
        force: z.boolean().optional().describe('Overwrite existing timestamp values (default: false).'),
        includeAssignee: z.boolean().optional().describe('Backfill assignee from first commit author (default: false).'),
        includeTransitions: z.boolean().optional().describe('Include full status transition history (default: false).'),
      },
      outputSchema: {
        success: z.boolean(),
        updated: z.array(z.string()).optional(),
        message: z.string(),
      },
    },
    async (input, _extra) => {
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

        await backfillTimestamps({
          specs: input.specs,
          dryRun: input.dryRun,
          force: input.force,
          includeAssignee: input.includeAssignee,
          includeTransitions: input.includeTransitions,
        });

        // Parse output to extract updated specs
        const updated = capturedOutput
          .split('\n')
          .filter((l: string) => l.includes('Updated:') || l.includes('✓'))
          .map((l: string) => l.replace(/.*Updated:\s*/, '').replace(/✓\s*/, '').trim())
          .filter(Boolean);

        const output = {
          success: true,
          updated: updated.length > 0 ? updated : undefined,
          message: input.dryRun 
            ? `Dry run complete. ${updated.length} specs would be updated`
            : `Backfill complete. ${updated.length} specs updated`,
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error backfilling timestamps', error);
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
