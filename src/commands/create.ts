import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { loadConfig, extractGroup, resolvePrefix } from '../config.js';
import { getGlobalNextSeq } from '../utils/path-helpers.js';
import { buildVariableContext, resolveVariables } from '../utils/variable-resolver.js';
import type { SpecPriority } from '../frontmatter.js';
import { normalizeDateFields } from '../frontmatter.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';

export async function createSpec(name: string, options: { 
  title?: string; 
  description?: string;
  tags?: string[];
  priority?: SpecPriority;
  assignee?: string;
  template?: string;
  customFields?: Record<string, unknown>;
  noPrefix?: boolean;
} = {}): Promise<void> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);

  // Ensure specs directory exists
  await fs.mkdir(specsDir, { recursive: true });

  // Get global next sequence number
  const seq = await getGlobalNextSeq(specsDir, config.structure.sequenceDigits);
  
  // Resolve the spec path based on pattern
  let specRelativePath: string;
  
  if (config.structure.pattern === 'flat') {
    // Flat pattern: optional prefix on folder name
    const prefix = options.noPrefix 
      ? ''
      : config.structure.prefix 
        ? resolvePrefix(config.structure.prefix, config.structure.dateFormat)
        : '';
    specRelativePath = `${prefix}${seq}-${name}`;
  } else if (config.structure.pattern === 'custom') {
    // Custom pattern: extract group from extractor string
    if (!config.structure.groupExtractor) {
      throw new Error('Custom pattern requires structure.groupExtractor in config');
    }
    
    const group = extractGroup(
      config.structure.groupExtractor,
      config.structure.dateFormat,
      options.customFields,
      config.structure.groupFallback
    );
    
    specRelativePath = `${group}/${seq}-${name}`;
  } else {
    // Unknown pattern
    throw new Error(`Unknown pattern: ${config.structure.pattern}`);
  }

  const specDir = path.join(specsDir, specRelativePath);
  const specFile = path.join(specDir, config.structure.defaultFile);

  // Check if directory exists
  try {
    await fs.access(specDir);
    // If we get here, directory exists
    throw new Error(`Spec already exists: ${sanitizeUserInput(specDir)}`);
  } catch (error: any) {
    // If error is ENOENT, directory doesn't exist - that's good, continue
    if (error.code === 'ENOENT') {
      // Directory doesn't exist, continue
    } else {
      // Some other error or the "already exists" error we threw
      throw error;
    }
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
      const available = Object.keys(config.templates || {}).join(', ');
      throw new Error(`Template not found: ${options.template}. Available templates: ${available}`);
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
    
    // Build variable context and resolve all variables in template
    const varContext = await buildVariableContext(config, { name: title, date });
    content = resolveVariables(template, varContext);
    
    // Parse frontmatter to get the resolved values (always needed for variable resolution)
    // Even with no custom options, we need to parse frontmatter to resolve variables like
    // {status}, {priority} in the body content with their default values from the template
    const parsed = matter(content, {
      engines: {
        yaml: (str) => yaml.load(str, { schema: yaml.FAILSAFE_SCHEMA }) as Record<string, unknown>
      }
    });
    
    // Ensure date fields remain as strings (gray-matter auto-parses YYYY-MM-DD as Date objects)
    normalizeDateFields(parsed.data);
    
    // Update frontmatter with provided metadata and custom fields (if any)
    if (options.tags && options.tags.length > 0) {
      parsed.data.tags = options.tags;
    }
    
    if (options.priority) {
      parsed.data.priority = options.priority;
    }
    
    if (options.assignee) {
      parsed.data.assignee = options.assignee;
    }
    
    if (options.customFields) {
      for (const [key, value] of Object.entries(options.customFields)) {
        parsed.data[key] = value;
      }
    }
    
    // Resolve frontmatter variables in the body content
    // This ensures that variables like {status}, {priority}, {tags} in the body
    // are replaced with the actual frontmatter values
    const contextWithFrontmatter = {
      ...varContext,
      frontmatter: parsed.data,
    };
    parsed.content = resolveVariables(parsed.content, contextWithFrontmatter);
    
    // Enrich with timestamps (created_at, etc.)
    const { enrichWithTimestamps } = await import('../frontmatter.js');
    enrichWithTimestamps(parsed.data);
    
    // Stringify back with updated frontmatter and resolved body content
    content = matter.stringify(parsed.content, parsed.data);
    
    // Add description to Overview section if provided
    if (options.description) {
      content = content.replace(
        /## Overview\s+<!-- What are we solving\? Why now\? -->/,
        `## Overview\n\n${options.description}`
      );
    }
  } catch (error) {
    throw new Error(`Template not found: ${templatePath}. Run: lspec init`);
  }

  await fs.writeFile(specFile, content, 'utf-8');

  console.log(chalk.green(`✓ Created: ${sanitizeUserInput(specDir)}/`));
  console.log(chalk.gray(`  Edit: ${sanitizeUserInput(specFile)}`));
  
  // Auto-check for conflicts after creation
  await autoCheckIfEnabled();
}
