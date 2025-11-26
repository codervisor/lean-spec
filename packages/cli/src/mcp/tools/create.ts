/**
 * Create tool - Create a new specification
 */

import { z } from 'zod';
import { createSpec } from '../../commands/index.js';
import type { SpecPriority } from '../../frontmatter.js';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Create tool definition
 */
export function createTool(): ToolDefinition {
  return [
    'create',
    {
      title: 'Create Spec',
      description: 'Create a new specification for a feature, design, or project. Use this when starting new work that needs documentation. The system auto-generates the sequence number.',
      inputSchema: {
        name: z.string().describe('The spec name/slug only (e.g., "unified-dashboard"). Do NOT include sequence numbers like "045-". The system automatically prepends the next sequence number.'),
        title: z.string().optional().describe('Human-readable title for the spec. If omitted, the name is used as the title.'),
        description: z.string().optional().describe('Initial description text to add to the Overview section.'),
        tags: z.array(z.string()).optional().describe('Tags to categorize the spec (e.g., ["api", "frontend", "v2.0"]).'),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Priority level for the spec. Defaults to "medium" if not specified.'),
        assignee: z.string().optional().describe('Person responsible for this spec.'),
        template: z.string().optional().describe('Template name to use (e.g., "minimal", "enterprise"). Uses default template if omitted.'),
      },
      outputSchema: {
        success: z.boolean(),
        path: z.string(),
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

        await createSpec(input.name, {
          title: input.title,
          description: input.description,
          tags: input.tags,
          priority: input.priority as SpecPriority | undefined,
          assignee: input.assignee,
          template: input.template,
        });

        const output = {
          success: true,
          path: capturedOutput.includes('Created:') ? capturedOutput.split('Created:')[1].split('\n')[0].trim() : '',
          message: `Spec '${input.name}' created successfully`,
          reminder: "💡 Remember to update status to 'in-progress' when you start implementing! Use: update tool with status='in-progress'",
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const output = {
          success: false,
          path: '',
          message: formatErrorMessage('Error creating spec', error),
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
