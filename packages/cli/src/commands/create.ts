import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { Command } from 'commander';
import { loadConfig, extractGroup, resolvePrefix } from '../config.js';
import { getGlobalNextSeq } from '../utils/path-helpers.js';
import { buildVariableContext, resolveVariables, type VariableContext } from '../utils/variable-resolver.js';
import type { SpecPriority } from '../frontmatter.js';
import { normalizeDateFields } from '../frontmatter.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { parseCustomFieldOptions } from '../utils/cli-helpers.js';
import { linkSpec } from './link.js';

/**
 * Create command - create new spec
 */
export function createCommand(): Command {
  return new Command('create')
    .description('Create new spec in folder structure')
    .argument('<name>', 'Name of the spec')
    .option('--title <title>', 'Set custom title')
    .option('--description <desc>', 'Set initial description')
    .option('--tags <tags>', 'Set tags (comma-separated)')
    .option('--priority <priority>', 'Set priority (low, medium, high, critical)')
    .option('--assignee <name>', 'Set assignee')
    .option('--template <template>', 'Use a specific template')
    .option('--field <name=value...>', 'Set custom field (can specify multiple)')
    .option('--no-prefix', 'Skip date prefix even if configured')
    .option('--depends-on <specs>', 'Add dependencies (comma-separated spec numbers or names)')
    .option('--related <specs>', 'Add related specs (comma-separated spec numbers or names)')
    .action(async (name: string, options: {
      title?: string;
      description?: string;
      tags?: string;
      priority?: SpecPriority;
      assignee?: string;
      template?: string;
      field?: string[];
      prefix?: boolean;
      dependsOn?: string;
      related?: string;
    }) => {
      const customFields = parseCustomFieldOptions(options.field);
      const createOptions: {
        title?: string;
        description?: string;
        tags?: string[];
        priority?: SpecPriority;
        assignee?: string;
        template?: string;
        customFields?: Record<string, unknown>;
        noPrefix?: boolean;
        dependsOn?: string[];
        related?: string[];
      } = {
        title: options.title,
        description: options.description,
        tags: options.tags ? options.tags.split(',').map(t => t.trim()) : undefined,
        priority: options.priority,
        assignee: options.assignee,
        template: options.template,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        noPrefix: options.prefix === false,
        dependsOn: options.dependsOn ? options.dependsOn.split(',').map(s => s.trim()) : undefined,
        related: options.related ? options.related.split(',').map(s => s.trim()) : undefined,
      };
      await createSpec(name, createOptions);
    });
}

export async function createSpec(name: string, options: { 
  title?: string; 
  description?: string;
  tags?: string[];
  priority?: SpecPriority;
  assignee?: string;
  template?: string;
  customFields?: Record<string, unknown>;
  noPrefix?: boolean;
  dependsOn?: string[];
  related?: string[];
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

  // Resolve template path from .lean-spec/templates/
  const templatesDir = path.join(cwd, '.lean-spec', 'templates');
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
  
  let templatePath = path.join(templatesDir, templateName);

  // Backward compatibility: If template not found, try spec-template.md then README.md
  try {
    await fs.access(templatePath);
  } catch {
    // Try spec-template.md first (legacy)
    const legacyPath = path.join(templatesDir, 'spec-template.md');
    try {
      await fs.access(legacyPath);
      templatePath = legacyPath;
      templateName = 'spec-template.md';
    } catch {
      // Try README.md as fallback
      const readmePath = path.join(templatesDir, 'README.md');
      try {
        await fs.access(readmePath);
        templatePath = readmePath;
        templateName = 'README.md';
      } catch {
        throw new Error(`Template not found: ${templatePath}. Run: lean-spec init`);
      }
    }
  }

  // Load spec template from .lean-spec/templates/
  let content: string;
  let varContext: VariableContext;
  
  try {
    const template = await fs.readFile(templatePath, 'utf-8');
    const date = new Date().toISOString().split('T')[0];
    const title = options.title || name;
    
    // Build variable context and resolve all variables in template
    varContext = await buildVariableContext(config, { name: title, date });
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
    throw new Error(`Template not found: ${templatePath}. Run: lean-spec init`);
  }

  await fs.writeFile(specFile, content, 'utf-8');

  // For detailed templates, copy any additional sub-spec files
  // Check if there are other .md files in the templates directory
  try {
    const templateFiles = await fs.readdir(templatesDir);
    const additionalFiles = templateFiles.filter(f => 
      f.endsWith('.md') && 
      f !== templateName && 
      f !== 'spec-template.md' && 
      f !== config.structure.defaultFile
    );
    
    if (additionalFiles.length > 0) {
      for (const file of additionalFiles) {
        const srcPath = path.join(templatesDir, file);
        const destPath = path.join(specDir, file);
        
        // Read template file and process variables
        let fileContent = await fs.readFile(srcPath, 'utf-8');
        
        // Replace variables in the file
        fileContent = resolveVariables(fileContent, varContext);
        
        // Write to spec directory
        await fs.writeFile(destPath, fileContent, 'utf-8');
      }
      console.log(chalk.green(`✓ Created: ${sanitizeUserInput(specDir)}/`));
      console.log(chalk.gray(`  Files: ${config.structure.defaultFile}, ${additionalFiles.join(', ')}`));
    } else {
      console.log(chalk.green(`✓ Created: ${sanitizeUserInput(specDir)}/`));
      console.log(chalk.gray(`  Edit: ${sanitizeUserInput(specFile)}`));
    }
  } catch (error) {
    // If reading directory fails, just show the main file
    console.log(chalk.green(`✓ Created: ${sanitizeUserInput(specDir)}/`));
    console.log(chalk.gray(`  Edit: ${sanitizeUserInput(specFile)}`));
  }
  
  // Add dependencies and related specs if specified
  const hasRelationships = (options.dependsOn && options.dependsOn.length > 0) || 
                           (options.related && options.related.length > 0);
  if (hasRelationships) {
    const newSpecName = path.basename(specDir);
    try {
      await linkSpec(newSpecName, {
        dependsOn: options.dependsOn?.join(','),
        related: options.related?.join(','),
      });
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️  Warning: Failed to add relationships: ${error.message}`));
    }
  }
  
  // Auto-check for conflicts after creation
  await autoCheckIfEnabled();
}
