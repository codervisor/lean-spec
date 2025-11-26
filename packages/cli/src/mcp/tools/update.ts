/**
 * Update tool - Update specification metadata
 */

import { z } from 'zod';
import { updateSpec } from '../../commands/index.js';
import type { SpecStatus, SpecPriority } from '../../frontmatter.js';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Get contextual reminder based on status change
 */
function getStatusReminder(newStatus?: SpecStatus): string | undefined {
  switch (newStatus) {
    case 'in-progress':
      return "💡 Spec marked in-progress. Remember to document decisions in the spec as you work, and update to 'complete' when done!";
    case 'complete':
      return "✅ Spec marked complete! Consider: Did you document what you learned? Are there follow-up specs needed?";
    case 'planned':
      return "📋 Spec marked as planned. Update to 'in-progress' before you start implementing!";
    default:
      return undefined;
  }
}

/**
 * Update tool definition
 */
export function updateTool(): ToolDefinition {
  return [
    'update',
    {
      title: 'Update Spec',
      description: 'Update specification metadata (status, priority, tags, assignee). Use this to track progress, change priorities, or reassign work. Does NOT modify the spec content itself.',
      inputSchema: {
        specPath: z.string().describe('The spec to update. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
        status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional().describe('Update the spec status. Use "in-progress" when work starts, "complete" when done.'),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Update the priority level.'),
        tags: z.array(z.string()).optional().describe('Replace tags entirely with this new array. To add/remove individual tags, read first then update.'),
        assignee: z.string().optional().describe('Update who is responsible for this spec.'),
      },
      outputSchema: {
        success: z.boolean(),
        message: z.string(),
        reminder: z.string().optional(),
      },
    },
    async (input, _extra) => {
      const originalLog = console.log;
      try {
        // Capture output
        let capturedOutput = '';
        console.log = (...args: any[]) => {
          capturedOutput += args.join(' ') + '\n';
        };

        // Filter out undefined values to prevent YAML serialization errors
        const updates: Record<string, unknown> = {};
        if (input.status !== undefined) updates.status = input.status as SpecStatus;
        if (input.priority !== undefined) updates.priority = input.priority as SpecPriority;
        if (input.tags !== undefined) updates.tags = input.tags;
        if (input.assignee !== undefined) updates.assignee = input.assignee;

        await updateSpec(input.specPath, updates);

        const reminder = getStatusReminder(input.status as SpecStatus | undefined);
        const output = {
          success: true,
          message: `Spec updated successfully`,
          ...(reminder ? { reminder } : {}),
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const output = {
          success: false,
          message: formatErrorMessage('Error updating spec', error),
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
