import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { loadConfig, getToday } from '../config.js';
import { getNextSeq } from '../utils/path-helpers.js';
import type { SpecPriority } from '../frontmatter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

export async function createSpec(name: string, options: { 
  title?: string; 
  description?: string;
  tags?: string[];
  priority?: SpecPriority;
  assignee?: string;
} = {}): Promise<void> {
  const config = await loadConfig();
  const cwd = process.cwd();
  
  const today = getToday(config.structure.dateFormat);
  const specsDir = path.join(cwd, config.specsDir);
  const dateDir = path.join(specsDir, today);

  await fs.mkdir(dateDir, { recursive: true });

  const seq = await getNextSeq(dateDir, config.structure.sequenceDigits);
  const specDir = path.join(dateDir, `${seq}-${name}`);
  const specFile = path.join(specDir, config.structure.defaultFile);

  // Check if directory exists
  try {
    await fs.access(specDir);
    console.log(chalk.yellow(`Warning: Spec already exists: ${specDir}`));
    process.exit(1);
  } catch {
    // Directory doesn't exist, continue
  }

  // Create spec directory
  await fs.mkdir(specDir, { recursive: true });

  // Load spec template from configured template
  const templatePath = path.join(TEMPLATES_DIR, config.template, 'spec-template.md');
  let content: string;
  
  try {
    const template = await fs.readFile(templatePath, 'utf-8');
    const date = new Date().toISOString().split('T')[0];
    const title = options.title || name;
    
    content = template
      .replace(/{name}/g, title)
      .replace(/{date}/g, date);
    
    // Update frontmatter with provided metadata
    if (options.tags || options.priority || options.assignee) {
      // Parse existing frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        let frontmatter = frontmatterMatch[1];
        
        // Add tags if provided
        if (options.tags && options.tags.length > 0) {
          // Replace empty tags array
          frontmatter = frontmatter.replace(/tags: \[\]/, `tags: [${options.tags.join(', ')}]`);
        }
        
        // Add priority if provided
        if (options.priority) {
          frontmatter = frontmatter.replace(/priority: medium/, `priority: ${options.priority}`);
        }
        
        // Add assignee if provided
        if (options.assignee) {
          // Add assignee field after priority
          frontmatter = frontmatter.replace(/(priority: \w+)/, `$1\nassignee: ${options.assignee}`);
        }
        
        content = content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
      }
    }
    
    // Add description to Overview section if provided
    if (options.description) {
      content = content.replace(
        /## Overview\s+<!-- What are we solving\? Why now\? -->/,
        `## Overview\n\n${options.description}`
      );
    }
  } catch {
    // Fallback to basic template if template file not found
    const title = options.title || name;
    const overview = options.description || '<!-- What problem does this solve? Why now? -->';
    
    content = `# ${title}

**Status**: 📅 Planned  
**Created**: ${new Date().toISOString().split('T')[0]}

## Goal

${overview}

## Key Points

- 
- 
- 

## Non-Goals

- 
- 

## Notes

<!-- Decisions, constraints, open questions -->
`;
  }

  await fs.writeFile(specFile, content, 'utf-8');

  console.log(chalk.green(`✓ Created: ${specDir}/`));
  console.log(chalk.gray(`  Edit: ${specFile}`));
}
