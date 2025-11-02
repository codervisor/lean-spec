import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

export async function listTemplates(): Promise<void> {
  console.log('');
  console.log(chalk.green('=== Available Templates ==='));
  console.log('');

  const templates = ['minimal', 'standard', 'enterprise'];

  for (const template of templates) {
    const templateDir = path.join(TEMPLATES_DIR, template);
    const configPath = path.join(templateDir, 'config.json');

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      console.log(chalk.cyan(`${config.name}`));
      console.log(`  ${config.description}`);
      console.log('');
    } catch {
      console.log(chalk.yellow(`  ${template} (config not found)`));
      console.log('');
    }
  }

  console.log(chalk.gray('Initialize with: lspec init'));
  console.log('');
}
