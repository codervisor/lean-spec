/**
 * Update spec status prompt
 */

import { z } from 'zod';

/**
 * Update spec status prompt definition
 */
export function updateSpecStatusPrompt() {
  return [
    'update-spec-status',
    {
      title: 'Update Spec Status',
      description: 'Quick workflow to update specification status',
      argsSchema: {
        specPath: z.string(),
        newStatus: z.enum(['planned', 'in-progress', 'complete', 'archived']),
      },
    },
    ({ specPath, newStatus }: { specPath: string; newStatus: string }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Update the status of spec "${specPath}" to "${newStatus}". Use the update tool to make this change.`,
          },
        },
      ],
    })
  ] as const;
}
