/**
 * Create feature spec prompt
 */

import { z } from 'zod';

/**
 * Create feature spec prompt definition
 */
export function createFeatureSpecPrompt() {
  return [
    'create-feature-spec',
    {
      title: 'Create Feature Spec',
      description: 'Guided workflow to create a new feature specification',
      argsSchema: {
        featureName: z.string(),
        description: z.string().optional(),
      },
    },
    ({ featureName, description }: { featureName: string; description?: string }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Create a new feature specification for: ${featureName}${description ? `\n\nDescription: ${description}` : ''}\n\nPlease create this spec with appropriate metadata (status, priority, tags) and include standard sections like Overview, Design, Plan, and Test.`,
          },
        },
      ],
    })
  ] as const;
}
