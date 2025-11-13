/**
 * Files tool - List all files in a specification directory
 */

import { z } from 'zod';
import { showFiles } from '../../commands/files.js';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Files tool definition
 */
export function filesTool(): ToolDefinition {
  return [
    'files',
    {
      title: 'List Spec Files',
      description: 'List all files in a specification directory. Use this to explore sub-specs, assets, or supplementary documentation in complex specs.',
      inputSchema: {
        specPath: z.string().describe('The spec to list files for. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
        type: z.enum(['docs', 'assets']).optional().describe('Filter by file type: "docs" for markdown files, "assets" for images/diagrams.'),
      },
      outputSchema: {
        files: z.array(z.any()),
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

        await showFiles(input.specPath, {
          type: input.type as 'docs' | 'assets' | undefined,
          tree: false,
        });

        // Parse the captured output to extract file list
        const lines = capturedOutput.split('\n').filter(l => l.trim());
        const files = lines
          .filter(l => l.includes('├──') || l.includes('└──') || l.match(/^\s*[-•]/))
          .map(l => l.replace(/[├└│─•-]\s*/g, '').trim());

        const output = { files };
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error listing files', error);
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
