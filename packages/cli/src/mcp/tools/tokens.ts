/**
 * Tokens tool - Count tokens in spec for LLM context management
 */

import { z } from 'zod';
import * as path from 'node:path';
import { loadConfig } from '../../config.js';
import { resolveSpecPath } from '../../utils/path-helpers.js';
import { TokenCounter } from '@leanspec/core';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Tokens tool definition
 */
export function tokensTool(): ToolDefinition {
  return [
    'tokens',
    {
      title: 'Count Tokens',
      description: 'Count tokens in spec or sub-spec for LLM context management. Use this before loading specs to check if they fit in context budget.',
      inputSchema: {
        specPath: z.string().describe('Spec name, number, or file path (e.g., "059", "unified-dashboard", "059/DESIGN.md")'),
        includeSubSpecs: z.boolean().optional().describe('Include all sub-spec files in count (default: false)'),
        detailed: z.boolean().optional().describe('Return breakdown by content type (code, prose, tables, frontmatter)'),
      },
      outputSchema: {
        spec: z.string(),
        total: z.number(),
        files: z.array(z.any()),
        breakdown: z.any().optional(),
        performance: z.any().optional(),
        recommendation: z.string().optional(),
      },
    },
    async (input) => {
      const counter = new TokenCounter();
      
      try {
        // Resolve spec path
        const config = await loadConfig();
        const cwd = process.cwd();
        const specsDir = path.join(cwd, config.specsDir);
        const resolvedPath = await resolveSpecPath(input.specPath, cwd, specsDir);
        
        if (!resolvedPath) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ 
              error: `Spec not found: ${input.specPath}`,
              code: 'SPEC_NOT_FOUND'
            }, null, 2) }],
            isError: true,
          };
        }

        // Get spec name from path
        const specName = path.basename(resolvedPath);
        
        // Count tokens
        const result = await counter.countSpec(resolvedPath, {
          detailed: input.detailed,
          includeSubSpecs: input.includeSubSpecs,
        });

        // Build response
        const output: any = {
          spec: specName,
          total: result.total,
          files: result.files,
        };

        // Add detailed breakdown if requested
        if (input.detailed && result.breakdown) {
          output.breakdown = result.breakdown;
          
          // Add performance indicators
          const indicators = counter.getPerformanceIndicators(result.total);
          output.performance = {
            level: indicators.level,
            costMultiplier: indicators.costMultiplier,
            effectiveness: indicators.effectiveness,
            recommendation: indicators.recommendation,
          };
        }

        // Add recommendation for large specs
        if (result.total > 5000) {
          output.recommendation = '⚠️ Total >5K tokens - consider loading README.md only';
        } else if (result.total > 3500) {
          output.recommendation = '⚠️ Total >3.5K tokens - consider loading in sections';
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error counting tokens', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      } finally {
        counter.dispose();
      }
    }
  ];
}
