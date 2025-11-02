import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface LeanSpecConfig {
  template: string;
  templates?: Record<string, string>; // Maps template name to filename
  specsDir: string;
  structure: {
    pattern: string;
    dateFormat: string;
    sequenceDigits: number;
    defaultFile: string;
  };
  features?: {
    aiAgents?: boolean;
    examples?: boolean;
    collaboration?: boolean;
    compliance?: boolean;
    approvals?: boolean;
    apiDocs?: boolean;
  };
}

const DEFAULT_CONFIG: LeanSpecConfig = {
  template: 'spec-template.md',
  templates: {
    default: 'spec-template.md',
  },
  specsDir: 'specs',
  structure: {
    pattern: '{date}/{seq}-{name}/',
    dateFormat: 'YYYYMMDD',
    sequenceDigits: 3,
    defaultFile: 'README.md',
  },
  features: {
    aiAgents: true,
    examples: true,
  },
};

export async function loadConfig(cwd: string = process.cwd()): Promise<LeanSpecConfig> {
  const configPath = path.join(cwd, '.lspec', 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch {
    // No config file, use defaults
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(
  config: LeanSpecConfig,
  cwd: string = process.cwd(),
): Promise<void> {
  const configDir = path.join(cwd, '.lspec');
  const configPath = path.join(configDir, 'config.json');

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function getToday(format: string = 'YYYYMMDD'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYYMMDD':
      return `${year}${month}${day}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY/MM':
      return `${year}/${month}`;
    default:
      return `${year}${month}${day}`;
  }
}
