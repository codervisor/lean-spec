/**
 * View tool - Read complete content of a specification
 */

import { z } from 'zod';
import { readSpecContent } from '../../commands/viewer.js';
import { formatErrorMessage, loadSubSpecMetadata } from '../helpers.js';
import type { ToolDefinition, SpecData } from '../types.js';

/**
 * Read full spec content (supports sub-spec files like "045/DESIGN.md")
 */
export async function readSpecData(specPath: string): Promise<{ spec: SpecData; content: string }> {
  const cwd = process.cwd();
  
  // Use readSpecContent which handles both main specs and sub-spec files
  const specContent = await readSpecContent(specPath, cwd);
  
  if (!specContent) {
    throw new Error(`Spec not found: ${specPath}`);
  }

  const spec: SpecData = {
    name: specContent.name,
    path: specContent.path,
    status: specContent.frontmatter.status,
    created: String(specContent.frontmatter.created),
    priority: specContent.frontmatter.priority,
    tags: specContent.frontmatter.tags,
    assignee: specContent.frontmatter.assignee,
  };

  // Only include subSpecs when viewing main spec (not a sub-spec file)
  // Check if the specPath contains a slash (indicates sub-spec file like "045/DESIGN.md")
  const isSubSpecFile = specPath.includes('/') && specPath.split('/')[1].includes('.');
  
  if (!isSubSpecFile && specContent.fullPath) {
    // Load sub-spec metadata for progressive disclosure
    const subSpecs = await loadSubSpecMetadata(specContent.fullPath);
    if (subSpecs.length > 0) {
      spec.subSpecs = subSpecs;
    }
  }

  return {
    spec,
    content: specContent.content,
  };
}

/**
 * View tool definition
 */
export function viewTool(): ToolDefinition {
  return [
    'view',
    {
      title: 'View Spec',
      description: 'Read the complete content of a specification. Use this to understand spec details, review design decisions, or check implementation status. Returns metadata and full content.',
      inputSchema: {
        specPath: z.string().describe('The spec to view. Can be: spec name (e.g., "unified-dashboard"), sequence number (e.g., "045" or "45"), full folder name (e.g., "045-unified-dashboard"), or sub-spec file (e.g., "045/DESIGN.md" or "unified-dashboard/TESTING.md").'),
        raw: z.boolean().optional().describe('Output raw markdown instead of formatted'),
        json: z.boolean().optional().describe('Output as JSON instead of formatted'),
      },
      outputSchema: {
        spec: z.any(),
        content: z.string(),
      },
    },
    async (input) => {
      try {
        const result = await readSpecData(input.specPath);
        
        // If json flag is set, return structured data
        if (input.json) {
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
          };
        }
        
        // If raw flag is set, return raw markdown but include structured content
        if (input.raw) {
          const rawMarkdown = `---\nstatus: ${result.spec.status}\ncreated: ${result.spec.created}\n${result.spec.priority ? `priority: ${result.spec.priority}\n` : ''}${result.spec.tags ? `tags:\n${result.spec.tags.map(t => `  - ${t}`).join('\n')}\n` : ''}${result.spec.assignee ? `assignee: ${result.spec.assignee}\n` : ''}---\n\n${result.content}`;
          return {
            content: [{ type: 'text', text: rawMarkdown }],
            structuredContent: result,
          };
        }
        
        // Default: formatted output with structured content
        const formatted = `# ${result.spec.name}\n\nStatus: ${result.spec.status}\nCreated: ${result.spec.created}\n${result.spec.priority ? `Priority: ${result.spec.priority}\n` : ''}${result.spec.tags ? `Tags: ${result.spec.tags.join(', ')}\n` : ''}${result.spec.assignee ? `Assignee: ${result.spec.assignee}\n` : ''}\n\n${result.content}`;
        return {
          content: [{ type: 'text', text: formatted }],
          structuredContent: result,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error viewing spec', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    }
  ];
}
