/**
 * Deps tool - Analyze spec dependencies
 */

import { z } from 'zod';
import { formatErrorMessage } from '../helpers.js';
import { loadAllSpecs } from '../../spec-loader.js';
import { resolveSpecPath } from '../../utils/path-helpers.js';
import { loadConfig } from '../../config.js';
import { SpecDependencyGraph } from '@leanspec/core';
import type { ToolDefinition } from '../types.js';
import * as path from 'node:path';

/**
 * Get spec dependencies using the complete dependency graph
 */
export async function getDepsData(specPath: string, mode: string = 'complete'): Promise<any> {
  // Resolve spec path
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
  
  if (!resolvedPath) {
    throw new Error(`Spec not found: ${specPath}`);
  }
  
  // Load all specs and build dependency graph
  const allSpecs = await loadAllSpecs({ includeArchived: true });
  const graph = new SpecDependencyGraph(allSpecs);
  
  // Get dependency information based on mode
  const spec = allSpecs.find(s => s.path === resolvedPath);
  if (!spec) {
    throw new Error(`Spec not found: ${specPath}`);
  }
  
  if (mode === 'complete') {
    const completeGraph = graph.getCompleteGraph(spec.path);
    return {
      spec: {
        path: completeGraph.current.path,
        status: completeGraph.current.frontmatter.status,
        priority: completeGraph.current.frontmatter.priority,
      },
      dependsOn: completeGraph.dependsOn.map(s => ({
        path: s.path,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
      requiredBy: completeGraph.requiredBy.map(s => ({
        path: s.path,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
      related: completeGraph.related.map(s => ({
        path: s.path,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
    };
  } else if (mode === 'upstream') {
    const upstream = graph.getUpstream(spec.path, 3);
    return {
      spec: {
        path: spec.path,
        status: spec.frontmatter.status,
        priority: spec.frontmatter.priority,
      },
      dependsOn: upstream.map(s => ({
        path: s.path,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
    };
  } else if (mode === 'downstream') {
    const downstream = graph.getDownstream(spec.path, 3);
    return {
      spec: {
        path: spec.path,
        status: spec.frontmatter.status,
        priority: spec.frontmatter.priority,
      },
      requiredBy: downstream.map(s => ({
        path: s.path,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
    };
  } else if (mode === 'impact') {
    const impact = graph.getImpactRadius(spec.path, 3);
    return {
      spec: {
        path: impact.current.path,
        status: impact.current.frontmatter.status,
        priority: impact.current.frontmatter.priority,
      },
      upstream: impact.upstream.map(s => ({
        path: s.path,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
      downstream: impact.downstream.map(s => ({
        path: s.path,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
      related: impact.related.map(s => ({
        path: s.path,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
      })),
      total: impact.upstream.length + impact.downstream.length + impact.related.length,
    };
  }
  
  // Default to complete
  return getDepsData(specPath, 'complete');
}

/**
 * Deps tool definition
 */
export function depsTool(): ToolDefinition {
  return [
    'deps',
    {
      title: 'Get Dependencies',
      description: 'Analyze complete spec dependency graph (upstream, downstream, bidirectional). Shows which specs this depends on (dependsOn), which depend on this spec (requiredBy), and related work (related). Use this to understand impact of changes and work order.',
      inputSchema: {
        specPath: z.string().describe('The spec to analyze. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), or full folder name (e.g., "045-unified-dashboard").'),
        mode: z.enum(['complete', 'upstream', 'downstream', 'impact']).optional().describe('View mode: complete (all relationships), upstream (dependencies only), downstream (dependents only), impact (full impact radius with summary). Defaults to complete.'),
      },
      outputSchema: {
        dependencies: z.any(),
      },
    },
    async (input, _extra) => {
      const originalLog = console.log;
      try {
        const mode = input.mode || 'complete';
        const deps = await getDepsData(input.specPath, mode);
        const output = { dependencies: deps, mode };
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error getting dependencies', error);
        return {
          content: [{ type: 'text' as const, text: errorMessage }],
          isError: true,
        };
      }
    }
  ];
}
