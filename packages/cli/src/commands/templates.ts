import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadConfig, saveConfig } from '../config.js';

/**
 * Templates command - manage spec templates
 */
export function templatesCommand(): Command {
  const cmd = new Command('templates')
    .description('Manage spec templates');

  cmd.command('list')
    .description('List available templates')
    .action(async () => {
      await listTemplates();
    });

  cmd.command('show')
    .description('Show template content')
    .argument('<name>', 'Template name')
    .action(async (name: string) => {
      await showTemplate(name);
    });

  cmd.command('add')
    .description('Register a template')
    .argument('<name>', 'Template name')
    .argument('<file>', 'Template file path')
    .action(async (name: string, file: string) => {
      await addTemplate(name, file);
    });

  cmd.command('remove')
    .description('Unregister a template')
    .argument('<name>', 'Template name')
    .action(async (name: string) => {
      await removeTemplate(name);
    });

  cmd.command('copy')
    .description('Copy a template to create a new one')
    .argument('<source>', 'Source template name')
    .argument('<target>', 'Target template name')
    .action(async (source: string, target: string) => {
      await copyTemplate(source, target);
    });

  // Default action (list)
  cmd.action(async () => {
    await listTemplates();
  });

  return cmd;
}

export async function listTemplates(cwd: string = process.cwd()): Promise<void> {
  const config = await loadConfig(cwd);
  const templatesDir = path.join(cwd, '.lean-spec', 'templates');

  console.log('');
  console.log(chalk.green('=== Project Templates ==='));
  console.log('');

  try {
    await fs.access(templatesDir);
  } catch {
    console.log(chalk.yellow('No templates directory found.'));
    console.log(chalk.gray('Run: lean-spec init'));
    console.log('');
    return;
  }

  const entries = await fs.readdir(templatesDir, { withFileTypes: true });
  const templateFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));
  const templateDirs = entries.filter((e) => e.isDirectory());

  if (templateFiles.length === 0 && templateDirs.length === 0) {
    console.log(chalk.yellow('No templates found.'));
    console.log('');
    return;
  }

  // Show registered templates first
  if (config.templates && Object.keys(config.templates).length > 0) {
    console.log(chalk.cyan('Registered:'));
    for (const [name, file] of Object.entries(config.templates)) {
      const isDefault = config.template === file;
      const marker = isDefault ? chalk.green('✓ (default)') : '';
      
      // Check if it's a directory-based template
      const templatePath = path.join(templatesDir, file);
      try {
        const stat = await fs.stat(templatePath);
        if (stat.isDirectory()) {
          // List files in the directory
          const dirFiles = await fs.readdir(templatePath);
          const mdFiles = dirFiles.filter(f => f.endsWith('.md'));
          console.log(`  ${chalk.bold(name)}: ${file}/ ${marker}`);
          console.log(chalk.gray(`    Files: ${mdFiles.join(', ')}`));
        } else {
          console.log(`  ${chalk.bold(name)}: ${file} ${marker}`);
        }
      } catch {
        console.log(`  ${chalk.bold(name)}: ${file} ${marker} ${chalk.red('(missing)')}`);
      }
    }
    console.log('');
  }

  // Show all available template files
  if (templateFiles.length > 0) {
    console.log(chalk.cyan('Available files:'));
    for (const entry of templateFiles) {
      const filePath = path.join(templatesDir, entry.name);
      const stat = await fs.stat(filePath);
      const sizeKB = (stat.size / 1024).toFixed(1);
      console.log(`  ${entry.name} (${sizeKB} KB)`);
    }
    console.log('');
  }

  // Show available template directories (multi-file templates)
  if (templateDirs.length > 0) {
    console.log(chalk.cyan('Available directories (multi-file templates):'));
    for (const entry of templateDirs) {
      const dirPath = path.join(templatesDir, entry.name);
      const dirFiles = await fs.readdir(dirPath);
      const mdFiles = dirFiles.filter(f => f.endsWith('.md'));
      console.log(`  ${entry.name}/ (${mdFiles.length} files: ${mdFiles.join(', ')})`);
    }
    console.log('');
  }

  console.log(chalk.gray('Use templates with: lean-spec create <name> --template=<template-name>'));
  console.log('');
}

export async function showTemplate(
  templateName: string,
  cwd: string = process.cwd(),
): Promise<void> {
  const config = await loadConfig(cwd);

  if (!config.templates?.[templateName]) {
    console.error(chalk.red(`Template not found: ${templateName}`));
    console.error(chalk.gray(`Available: ${Object.keys(config.templates || {}).join(', ')}`));
    process.exit(1);
  }

  const templatesDir = path.join(cwd, '.lean-spec', 'templates');
  const templateFile = config.templates[templateName];
  const templatePath = path.join(templatesDir, templateFile);

  try {
    const stat = await fs.stat(templatePath);
    
    if (stat.isDirectory()) {
      // Directory-based template - show all files
      console.log('');
      console.log(chalk.cyan(`=== Template: ${templateName} (${templateFile}/) ===`));
      console.log('');
      
      const files = await fs.readdir(templatePath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      for (const file of mdFiles) {
        const filePath = path.join(templatePath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        console.log(chalk.yellow(`--- ${file} ---`));
        console.log(content);
        console.log('');
      }
    } else {
      // Single file template
      const content = await fs.readFile(templatePath, 'utf-8');
      console.log('');
      console.log(chalk.cyan(`=== Template: ${templateName} (${templateFile}) ===`));
      console.log('');
      console.log(content);
      console.log('');
    }
  } catch (error) {
    console.error(chalk.red(`Error reading template: ${templateFile}`));
    console.error(error);
    process.exit(1);
  }
}

export async function addTemplate(
  name: string,
  file: string,
  cwd: string = process.cwd(),
): Promise<void> {
  const config = await loadConfig(cwd);
  const templatesDir = path.join(cwd, '.lean-spec', 'templates');
  const templatePath = path.join(templatesDir, file);

  // Check if file or directory exists
  try {
    const stat = await fs.stat(templatePath);
    if (stat.isDirectory()) {
      // Verify it has a README.md (main template file)
      const mainFile = path.join(templatePath, 'README.md');
      try {
        await fs.access(mainFile);
      } catch {
        console.error(chalk.red(`Directory template must contain README.md: ${file}/`));
        console.error(chalk.gray(`Expected at: ${mainFile}`));
        process.exit(1);
      }
    }
  } catch {
    console.error(chalk.red(`Template not found: ${file}`));
    console.error(chalk.gray(`Expected at: ${templatePath}`));
    console.error(
      chalk.yellow('Create the file/directory first or use: lean-spec templates copy <source> <target>'),
    );
    process.exit(1);
  }

  // Add to config
  if (!config.templates) {
    config.templates = {};
  }

  if (config.templates[name]) {
    console.log(chalk.yellow(`Warning: Template '${name}' already exists, updating...`));
  }

  config.templates[name] = file;
  await saveConfig(config, cwd);

  console.log(chalk.green(`✓ Added template: ${name} → ${file}`));
  console.log(chalk.gray(`  Use with: lean-spec create <spec-name> --template=${name}`));
}

export async function removeTemplate(name: string, cwd: string = process.cwd()): Promise<void> {
  const config = await loadConfig(cwd);

  if (!config.templates?.[name]) {
    console.error(chalk.red(`Template not found: ${name}`));
    console.error(chalk.gray(`Available: ${Object.keys(config.templates || {}).join(', ')}`));
    process.exit(1);
  }

  if (name === 'default') {
    console.error(chalk.red('Cannot remove default template'));
    process.exit(1);
  }

  const file = config.templates[name];
  delete config.templates[name];
  await saveConfig(config, cwd);

  console.log(chalk.green(`✓ Removed template: ${name}`));
  console.log(chalk.gray(`  Note: Template file ${file} still exists in .lean-spec/templates/`));
}

export async function copyTemplate(
  source: string,
  target: string,
  cwd: string = process.cwd(),
): Promise<void> {
  const config = await loadConfig(cwd);
  const templatesDir = path.join(cwd, '.lean-spec', 'templates');

  // Resolve source template
  let sourceFile: string;
  if (config.templates?.[source]) {
    sourceFile = config.templates[source];
  } else {
    sourceFile = source;
  }

  const sourcePath = path.join(templatesDir, sourceFile);

  // Check if source exists
  try {
    await fs.access(sourcePath);
  } catch {
    console.error(chalk.red(`Source template not found: ${source}`));
    console.error(chalk.gray(`Expected at: ${sourcePath}`));
    process.exit(1);
  }

  // Determine target filename
  const targetFile = target.endsWith('.md') ? target : `${target}.md`;
  const targetPath = path.join(templatesDir, targetFile);

  // Copy file
  await fs.copyFile(sourcePath, targetPath);
  console.log(chalk.green(`✓ Copied: ${sourceFile} → ${targetFile}`));

  // Optionally register the new template
  if (!config.templates) {
    config.templates = {};
  }

  const templateName = target.replace(/\.md$/, '');
  config.templates[templateName] = targetFile;
  await saveConfig(config, cwd);

  console.log(chalk.green(`✓ Registered template: ${templateName}`));
  console.log(chalk.gray(`  Edit: ${targetPath}`));
  console.log(chalk.gray(`  Use with: lean-spec create <spec-name> --template=${templateName}`));
}
