#!/usr/bin/env node

/**
 * Validation script to ensure AGENTS.md templates are in sync with source components
 * This script should be run in CI to catch drift between source and generated files
 */

import { readFileSync } from 'fs';
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

function generateAgentsFileContent(templateName: string): string {
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
  return template(data);
}

function validateTemplate(templateName: string): boolean {
  console.log(`\nValidating ${templateName}...`);

  try {
    // Generate expected content
    const expectedContent = generateAgentsFileContent(templateName);

    // Read actual content
    const actualPath = join(TEMPLATES_DIR, templateName, 'files/AGENTS.md');
    const actualContent = readFileSync(actualPath, 'utf-8');

    // Compare
    if (expectedContent === actualContent) {
      console.log(`✓ ${templateName}: AGENTS.md is up to date`);
      return true;
    } else {
      console.error(`✗ ${templateName}: AGENTS.md is out of sync!`);
      console.error(`  Expected length: ${expectedContent.length} bytes`);
      console.error(`  Actual length:   ${actualContent.length} bytes`);
      console.error('');
      console.error('  Run `pnpm build:templates` to regenerate.');
      return false;
    }
  } catch (error) {
    console.error(`✗ ${templateName}: Validation failed with error:`, error);
    return false;
  }
}

function main() {
  console.log('Validating AGENTS.md templates...');
  console.log(`Templates directory: ${TEMPLATES_DIR}`);

  let allValid = true;

  for (const templateName of TEMPLATE_NAMES) {
    const isValid = validateTemplate(templateName);
    if (!isValid) {
      allValid = false;
    }
  }

  console.log('');
  if (allValid) {
    console.log('✓ All AGENTS.md templates are valid and in sync!');
    process.exit(0);
  } else {
    console.log('✗ Some AGENTS.md templates are out of sync.');
    console.log('  Run `pnpm build:templates` to regenerate them.');
    process.exit(1);
  }
}

main();
