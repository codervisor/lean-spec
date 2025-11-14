#!/usr/bin/env node

/**
 * Build script to generate AGENTS.md files from templates
 * This script reads component files and config, then generates AGENTS.md for each template
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import Handlebars from 'handlebars';

const TEMPLATES_DIR = resolve(process.cwd(), 'packages/cli/templates');
const SHARED_COMPONENTS_DIR = join(TEMPLATES_DIR, '_shared/agents-components');
const TEMPLATE_FILE = join(TEMPLATES_DIR, '_shared/agents-template.hbs');

const TEMPLATE_NAMES = ['minimal', 'standard', 'enterprise'];

interface AgentsConfig {
  description: string;
  coreRules: string;
  whenToUse?: string;
  whenToUseEarly?: boolean;
  discoveryCommands: string;
  essentialCommands?: string;
  frontmatter: string;
  workflow: string;
  qualityStandards: string;
  closingNote: string;
  additionalSections?: string[];
}

function readComponent(filename: string): string {
  const path = join(SHARED_COMPONENTS_DIR, filename);
  return readFileSync(path, 'utf-8').trim();
}

function generateAgentsFile(templateName: string): void {
  console.log(`\nGenerating AGENTS.md for ${templateName}...`);

  // Read config
  const configPath = join(TEMPLATES_DIR, templateName, 'agents-config.json');
  const config: AgentsConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

  // Read template
  const templateSource = readFileSync(TEMPLATE_FILE, 'utf-8');
  const template = Handlebars.compile(templateSource);

  // Load components
  const data = {
    project_name: '{project_name}',
    description: config.description,
    coreRules: readComponent(config.coreRules),
    whenToUse: config.whenToUse ? readComponent(config.whenToUse) : null,
    whenToUseEarly: config.whenToUseEarly !== false,
    discoveryCommands: readComponent(config.discoveryCommands),
    essentialCommands: config.essentialCommands ? readComponent(config.essentialCommands) : null,
    frontmatter: readComponent(config.frontmatter),
    workflow: readComponent(config.workflow),
    qualityStandards: readComponent(config.qualityStandards),
    closingNote: config.closingNote,
    additionalSections: config.additionalSections
      ? config.additionalSections.map(readComponent)
      : [],
  };

  // Generate content
  const content = template(data);

  // Write output
  const outputPath = join(TEMPLATES_DIR, templateName, 'files/AGENTS.md');
  writeFileSync(outputPath, content);

  console.log(`✓ Generated: ${outputPath}`);
}

function main() {
  console.log('Building AGENTS.md templates...');
  console.log(`Templates directory: ${TEMPLATES_DIR}`);

  for (const templateName of TEMPLATE_NAMES) {
    try {
      generateAgentsFile(templateName);
    } catch (error) {
      console.error(`✗ Error generating ${templateName}:`, error);
      process.exit(1);
    }
  }

  console.log('\n✓ All AGENTS.md templates generated successfully!');
}

main();
