import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig, getToday } from '../config.js';
import { getNextSeq } from '../utils/path-helpers.js';
import type { SpecPriority } from '../frontmatter.js';

export async function createSpec(name: string, options: { 
  title?: string; 
  description?: string;
  tags?: string[];
  priority?: SpecPriority;
  assignee?: string;
  template?: string;
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

  // Resolve template path from .lspec/templates/
  const templatesDir = path.join(cwd, '.lspec', 'templates');
  let templateName: string;
  
  // Determine which template to use
  if (options.template) {
    // User specified a template
    if (config.templates?.[options.template]) {
      templateName = config.templates[options.template];
    } else {
      console.error(chalk.red(`Template not found: ${options.template}`));
      console.error(chalk.gray(`Available templates: ${Object.keys(config.templates || {}).join(', ')}`));
      process.exit(1);
    }
  } else {
    // Use default template
    templateName = config.template || 'spec-template.md';
  }
  
  const templatePath = path.join(templatesDir, templateName);

  // Load spec template from .lspec/templates/
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
  } catch (error) {
    console.error(chalk.red('Error: Template not found!'));
    console.error(chalk.gray(`Expected: ${templatePath}`));
    console.error(chalk.yellow('Run: lspec init'));
    process.exit(1);
  }

  await fs.writeFile(specFile, content, 'utf-8');

  console.log(chalk.green(`✓ Created: ${specDir}/`));
  console.log(chalk.gray(`  Edit: ${specFile}`));
}
