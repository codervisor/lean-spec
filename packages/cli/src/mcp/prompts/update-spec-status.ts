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
        status: z.enum(['planned', 'in-progress', 'complete', 'archived']),
      },
    },
    ({ specPath, status }: { specPath: string; status: string }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Update the status of spec "${specPath}" to "${status}".

Use the \`update\` tool: \`update <spec> --status ${status}\``,
          },
        },
      ],
    })
  ] as const;
}
