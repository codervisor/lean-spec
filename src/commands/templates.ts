import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../config.js';

export async function listTemplates(cwd: string = process.cwd()): Promise<void> {
  const config = await loadConfig(cwd);
  const templatesDir = path.join(cwd, '.lspec', 'templates');

  console.log('');
  console.log(chalk.green('=== Project Templates ==='));
  console.log('');

  try {
    await fs.access(templatesDir);
  } catch {
    console.log(chalk.yellow('No templates directory found.'));
    console.log(chalk.gray('Run: lspec init'));
    console.log('');
    return;
  }

  const files = await fs.readdir(templatesDir);
  const templateFiles = files.filter((f) => f.endsWith('.md'));

  if (templateFiles.length === 0) {
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
      console.log(`  ${chalk.bold(name)}: ${file} ${marker}`);
    }
    console.log('');
  }

  // Show all available template files
  console.log(chalk.cyan('Available files:'));
  for (const file of templateFiles) {
    const filePath = path.join(templatesDir, file);
    const stat = await fs.stat(filePath);
    const sizeKB = (stat.size / 1024).toFixed(1);
    console.log(`  ${file} (${sizeKB} KB)`);
  }

  console.log('');
  console.log(chalk.gray('Use templates with: lspec create <name> --template=<template-name>'));
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

  const templatesDir = path.join(cwd, '.lspec', 'templates');
  const templateFile = config.templates[templateName];
  const templatePath = path.join(templatesDir, templateFile);

  try {
    const content = await fs.readFile(templatePath, 'utf-8');
    console.log('');
    console.log(chalk.cyan(`=== Template: ${templateName} (${templateFile}) ===`));
    console.log('');
    console.log(content);
    console.log('');
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
  const templatesDir = path.join(cwd, '.lspec', 'templates');
  const templatePath = path.join(templatesDir, file);

  // Check if file exists
  try {
    await fs.access(templatePath);
  } catch {
    console.error(chalk.red(`Template file not found: ${file}`));
    console.error(chalk.gray(`Expected at: ${templatePath}`));
    console.error(
      chalk.yellow('Create the file first or use: lspec templates copy <source> <target>'),
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
  console.log(chalk.gray(`  Use with: lspec create <spec-name> --template=${name}`));
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
  console.log(chalk.gray(`  Note: Template file ${file} still exists in .lspec/templates/`));
}

export async function copyTemplate(
  source: string,
  target: string,
  cwd: string = process.cwd(),
): Promise<void> {
  const config = await loadConfig(cwd);
  const templatesDir = path.join(cwd, '.lspec', 'templates');

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
  console.log(chalk.gray(`  Use with: lspec create <spec-name> --template=${templateName}`));
}
