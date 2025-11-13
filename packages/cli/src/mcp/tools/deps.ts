/**
 * Deps tool - Analyze spec dependencies
 */

import { z } from 'zod';
import { formatErrorMessage, SPEC_REFERENCE_REGEX } from '../helpers.js';
import { readSpecData } from './view.js';
import type { ToolDefinition, SpecData } from '../types.js';

/**
 * Get spec dependencies
 */
export async function getDepsData(specPath: string): Promise<{
  spec: SpecData;
  dependencies: string[];
  dependents: string[];
}> {
  const { spec, content } = await readSpecData(specPath);
  
  // Simple dependency parsing - looks for references to other specs
  const dependencies: string[] = [];
  let match;
  
  while ((match = SPEC_REFERENCE_REGEX.exec(content)) !== null) {
    dependencies.push(match[1]);
  }

  // For now, we'll skip finding dependents (would require scanning all specs)
  const dependents: string[] = [];

  return {
    spec,
    dependencies: [...new Set(dependencies)],
    dependents,
  };
}

/**
 * Deps tool definition
 */
export function depsTool(): ToolDefinition {
  return [
    'deps',
    {
      title: 'Get Dependencies',
      description: 'Analyze spec dependencies and relationships. Use this to understand which specs depend on or are referenced by a given spec. Helps identify impact of changes and work order.',
      inputSchema: {
        specPath: z.string().describe('The spec to analyze. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
      },
      outputSchema: {
        dependencies: z.any(),
      },
    },
    async (input) => {
      try {
        const deps = await getDepsData(input.specPath);
        const output = { dependencies: deps };
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error getting dependencies', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    }
  ];
}
