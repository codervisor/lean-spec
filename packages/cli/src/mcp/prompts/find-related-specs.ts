/**
 * Find related specs prompt
 */

import { z } from 'zod';

/**
 * Find related specs prompt definition
 */
export function findRelatedSpecsPrompt() {
  return [
    'find-related-specs',
    {
      title: 'Find Related Specs',
      description: 'Discover specifications related to a topic or feature',
      argsSchema: {
        topic: z.string(),
      },
    },
    ({ topic }: { topic: string }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Find all specifications related to: ${topic}\n\nPlease search for this topic and show me the dependencies between related specs.`,
          },
        },
      ],
    })
  ] as const;
}
