import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Command } from 'commander';
import { loadConfig } from '../config.js';

export interface MigrationOptions {
  inputPath: string;
  aiProvider?: 'copilot' | 'claude' | 'gemini';
  dryRun?: boolean;
  batchSize?: number;
  skipValidation?: boolean;
  backfill?: boolean;
}

export interface DocumentInfo {
  path: string;
  name: string;
  size: number;
}

export function migrateCommand(): Command;
export function migrateCommand(inputPath: string, options?: Partial<MigrationOptions>): Promise<void>;
export function migrateCommand(inputPath?: string, options: Partial<MigrationOptions> = {}): Command | Promise<void> {
  if (typeof inputPath === 'string') {
    return migrateSpecs(inputPath, options);
  }

  return new Command('migrate')
    .description('Migrate specs from other SDD tools (ADR, RFC, OpenSpec, spec-kit, etc.)')
    .argument('<input-path>', 'Path to directory containing specs to migrate')
    .option('--with <provider>', 'AI-assisted migration (copilot, claude, gemini)')
    .option('--dry-run', 'Preview without making changes')
    .option('--batch-size <n>', 'Process N docs at a time', parseInt)
    .option('--skip-validation', "Don't validate after migration")
    .option('--backfill', 'Auto-run backfill after migration')
    .action(async (target: string, opts: {
      with?: string;
      dryRun?: boolean;
      batchSize?: number;
      skipValidation?: boolean;
      backfill?: boolean;
    }) => {
      if (opts.with && !['copilot', 'claude', 'gemini'].includes(opts.with)) {
        console.error('\x1b[31m❌ Error:\x1b[0m Invalid AI provider. Use: copilot, claude, or gemini');
        process.exit(1);
      }
      await migrateSpecs(target, {
        aiProvider: opts.with as 'copilot' | 'claude' | 'gemini' | undefined,
        dryRun: opts.dryRun,
        batchSize: opts.batchSize,
        skipValidation: opts.skipValidation,
        backfill: opts.backfill,
      });
    });
}

/**
 * Main migration command - generates instructions for migrating specs from other tools
 */
export async function migrateSpecs(inputPath: string, options: Partial<MigrationOptions> = {}): Promise<void> {
  const config = await loadConfig();
  
  // Validate input path exists
  try {
    const stats = await fs.stat(inputPath);
    if (!stats.isDirectory()) {
      console.error('\x1b[31m❌ Error:\x1b[0m Input path must be a directory');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\x1b[31m❌ Error:\x1b[0m Path not found: ${inputPath}`);
    process.exit(1);
  }
  
  // Scan for documents
  console.log(`\x1b[36mScanning:\x1b[0m ${inputPath}\n`);
  const documents = await scanDocuments(inputPath);
  
  if (documents.length === 0) {
    console.error(`\x1b[31m❌ Error:\x1b[0m No documents found in ${inputPath}`);
    console.error('   Check path and try again');
    process.exit(1);
  }
  
  console.log(`\x1b[32m✓\x1b[0m Found ${documents.length} document${documents.length === 1 ? '' : 's'}\n`);
  
  // If AI provider specified, verify and execute
  if (options.aiProvider) {
    await migrateWithAI(inputPath, documents, options as MigrationOptions);
  } else {
    // Default: Output manual migration instructions
    await outputManualInstructions(inputPath, documents, config);
  }
}

/**
 * Scan directory for markdown documents (format-agnostic)
 */
export async function scanDocuments(dirPath: string): Promise<DocumentInfo[]> {
  const documents: DocumentInfo[] = [];
  
  async function scanRecursive(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanRecursive(fullPath);
        }
      } else if (entry.isFile()) {
        // Look for markdown files
        if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')) {
          const stats = await fs.stat(fullPath);
          documents.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
          });
        }
      }
    }
  }
  
  await scanRecursive(dirPath);
  return documents;
}

/**
 * Output manual migration instructions (default mode)
 */
async function outputManualInstructions(
  inputPath: string,
  documents: DocumentInfo[],
  config: any
): Promise<void> {
  const specsDir = config.specsDir || 'specs';
  
  console.log('═'.repeat(70));
  console.log('\x1b[1m\x1b[36m📋 LeanSpec Migration Instructions\x1b[0m');
  console.log('═'.repeat(70));
  console.log();
  console.log('\x1b[1mSource Location:\x1b[0m');
  console.log(`  ${inputPath} (${documents.length} documents found)`);
  console.log();
  console.log('\x1b[1mMigration Prompt:\x1b[0m');
  console.log('  Copy this prompt to your AI assistant (Copilot, Claude, ChatGPT, etc.):');
  console.log();
  console.log('─'.repeat(70));
  console.log();
  console.log('You are helping migrate specification documents to LeanSpec format.');
  console.log();
  console.log(`\x1b[1mSource:\x1b[0m ${inputPath}`);
  console.log();
  console.log('\x1b[1mYour Task:\x1b[0m');
  console.log('1. Analyze the source documents to understand their format and structure');
  console.log('2. For each document, extract:');
  console.log('   - Title/name');
  console.log('   - Status (map to: planned, in-progress, complete, archived)');
  console.log('   - Creation date');
  console.log('   - Priority (if present)');
  console.log('   - Main content sections');
  console.log('   - Relationships to other documents');
  console.log();
  console.log('3. Migrate each document by running these commands:');
  console.log();
  console.log('   # Create spec');
  console.log('   lean-spec create <name>');
  console.log();
  console.log('   # Set metadata (NEVER edit frontmatter manually)');
  console.log('   lean-spec update <name> --status <status>');
  console.log('   lean-spec update <name> --priority <priority>');
  console.log('   lean-spec update <name> --tags <tag1,tag2>');
  console.log();
  console.log('   # Edit content with your preferred tool');
  console.log('   # Map original sections to LeanSpec structure:');
  console.log('   # - Overview: Problem statement and context');
  console.log('   # - Design: Technical approach and decisions');
  console.log('   # - Plan: Implementation steps (if applicable)');
  console.log('   # - Test: Validation criteria (if applicable)');
  console.log('   # - Notes: Additional context, trade-offs, alternatives');
  console.log();
  console.log('4. After migration, run:');
  console.log();
  console.log('   lean-spec validate  # Check for issues');
  console.log('   lean-spec board     # Verify migration');
  console.log();
  console.log('\x1b[1mImportant Rules:\x1b[0m');
  console.log('- Preserve decision rationale and context');
  console.log('- Map status appropriately to LeanSpec states');
  console.log('- Link related specs using `related` field (manual frontmatter edit)');
  console.log('- Follow LeanSpec first principles: clarity over completeness');
  console.log('- Keep specs under 400 lines (split if needed)');
  console.log();
  console.log('─'.repeat(70));
  console.log();
  console.log('\x1b[36mℹ\x1b[0m  \x1b[1mTip:\x1b[0m For AI-assisted migration, use:');
  console.log('   \x1b[90mlean-spec migrate <path> --with copilot\x1b[0m');
  console.log();
}

/**
 * AI-assisted migration (when --with flag specified)
 */
async function migrateWithAI(
  inputPath: string,
  documents: DocumentInfo[],
  options: MigrationOptions
): Promise<void> {
  const provider = options.aiProvider!;
  
  console.log(`\x1b[36m🤖 AI-Assisted Migration:\x1b[0m ${provider}\n`);
  
  // Verify AI CLI tool
  const tool = await verifyAITool(provider);
  
  if (!tool.installed) {
    console.error(`\x1b[31m❌ ${tool.name} CLI not found\x1b[0m`);
    console.error(`   Install: ${tool.installCmd}`);
    console.error('   Or run without --with flag for manual instructions');
    process.exit(1);
  }
  
  if (!tool.compatible) {
    console.error(`\x1b[31m❌ ${tool.name} version ${tool.version} too old\x1b[0m`);
    console.error(`   Required: >=${tool.minVersion}`);
    console.error(`   Update: ${tool.updateCmd}`);
    process.exit(1);
  }
  
  console.log(`\x1b[32m✓\x1b[0m ${tool.name} CLI verified (v${tool.version})\n`);
  
  // AI-assisted mode is a placeholder for future implementation
  console.log('\x1b[33m⚠ AI-assisted migration is not yet fully implemented\x1b[0m');
  console.log('  This feature will automatically execute migration via AI CLI tools.');
  console.log();
  console.log('  For now, use manual mode (without --with flag) to get migration instructions.');
  console.log();
}

/**
 * AI CLI tool definitions
 */
interface AICliTool {
  name: string;
  cliCommand: string;
  installCmd: string;
  updateCmd: string;
  versionCmd: string;
  minVersion: string;
  installed: boolean;
  version?: string;
  compatible: boolean;
}

/**
 * Verify AI CLI tool is installed and compatible
 */
async function verifyAITool(provider: 'copilot' | 'claude' | 'gemini'): Promise<AICliTool> {
  const tools: Record<string, Omit<AICliTool, 'installed' | 'version' | 'compatible'>> = {
    copilot: {
      name: 'GitHub Copilot CLI',
      cliCommand: 'github-copilot-cli',
      installCmd: 'npm install -g @githubnext/github-copilot-cli',
      updateCmd: 'npm update -g @githubnext/github-copilot-cli',
      versionCmd: 'github-copilot-cli --version',
      minVersion: '0.1.0',
    },
    claude: {
      name: 'Claude CLI',
      cliCommand: 'claude',
      installCmd: 'pip install claude-cli',
      updateCmd: 'pip install --upgrade claude-cli',
      versionCmd: 'claude --version',
      minVersion: '1.0.0',
    },
    gemini: {
      name: 'Gemini CLI',
      cliCommand: 'gemini-cli',
      installCmd: 'npm install -g @google/gemini-cli',
      updateCmd: 'npm update -g @google/gemini-cli',
      versionCmd: 'gemini-cli --version',
      minVersion: '1.0.0',
    },
  };
  
  const toolDef = tools[provider];
  
  // Check if installed
  let installed = false;
  let version: string | undefined;
  
  try {
    const { execSync } = await import('node:child_process');
    // Check if command exists
    execSync(`which ${toolDef.cliCommand}`, { stdio: 'ignore' });
    installed = true;
    
    // Get version
    try {
      const versionOutput = execSync(toolDef.versionCmd, { 
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
      const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    } catch {
      // Version check failed, but tool is installed
      version = 'unknown';
    }
  } catch {
    // Command not found
    installed = false;
  }
  
  // Check compatibility
  const compatible = installed && (version === 'unknown' || (version !== undefined && satisfiesVersion(version, toolDef.minVersion)));
  
  return {
    ...toolDef,
    installed,
    version,
    compatible,
  };
}

/**
 * Simple semver comparison
 */
function satisfiesVersion(version: string, minVersion: string): boolean {
  const vParts = version.split('.').map(Number);
  const minParts = minVersion.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const v = vParts[i] || 0;
    const min = minParts[i] || 0;
    
    if (v > min) return true;
    if (v < min) return false;
  }
  
  return true; // equal
}
