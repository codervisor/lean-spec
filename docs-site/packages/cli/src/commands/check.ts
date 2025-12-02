import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { loadAllSpecs } from '../spec-loader.js';
import { createSpecDirPattern } from '../utils/path-helpers.js';
import { sanitizeUserInput } from '../utils/ui.js';

/**
 * Check command - check for sequence conflicts
 */
export function checkCommand(): Command {
  return new Command('check')
    .description('Check for sequence conflicts')
    .option('-q, --quiet', 'Brief output')
    .option('--json', 'Output as JSON')
    .action(async (options: { quiet?: boolean; json?: boolean }) => {
      const hasNoConflicts = await checkSpecs(options);
      process.exit(hasNoConflicts ? 0 : 1);
    });
}

/**
 * Check for sequence conflicts in specs
 */
export async function checkSpecs(options: {
  quiet?: boolean;
  silent?: boolean;
  json?: boolean;
} = {}): Promise<boolean> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  // Find all specs with sequence numbers
  const specs = await loadAllSpecs();
  const sequenceMap = new Map<number, string[]>();
  const specPattern = createSpecDirPattern();
  
  for (const spec of specs) {
    // Extract sequence number from spec name
    const specName = path.basename(spec.path);
    // Use the same pattern as path-helpers to ensure consistency
    const match = specName.match(specPattern);
    
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > 0) {
        if (!sequenceMap.has(seq)) {
          sequenceMap.set(seq, []);
        }
        sequenceMap.get(seq)!.push(spec.path);
      }
    }
  }
  
  // Find conflicts (sequences with multiple specs)
  const conflicts = Array.from(sequenceMap.entries())
    .filter(([_, paths]) => paths.length > 1)
    .sort(([a], [b]) => a - b);
  
  if (conflicts.length === 0) {
    if (!options.quiet && !options.silent) {
      if (options.json) {
        console.log(JSON.stringify({ conflicts: [], hasConflicts: false }, null, 2));
      } else {
        console.log(chalk.green('✓ No sequence conflicts detected'));
      }
    }
    return true;
  }
  
  // JSON output
  if (options.json) {
    const jsonOutput = {
      hasConflicts: true,
      conflicts: conflicts.map(([seq, paths]) => ({
        sequence: seq,
        specs: paths,
      })),
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return false;
  }
  
  // Report conflicts
  if (!options.silent) {
    if (!options.quiet) {
      // Full output
      console.log('');
      console.log(chalk.yellow('⚠️  Sequence conflicts detected:\n'));
      
      for (const [seq, paths] of conflicts) {
        console.log(chalk.red(`  Sequence ${String(seq).padStart(config.structure.sequenceDigits, '0')}:`));
        for (const p of paths) {
          console.log(chalk.gray(`    - ${sanitizeUserInput(p)}`));
        }
        console.log('');
      }
      
      console.log(chalk.cyan('Tip: Use date prefix to prevent conflicts:'));
      console.log(chalk.gray('  Edit .lean-spec/config.json → structure.prefix: "{YYYYMMDD}-"'));
      console.log('');
      console.log(chalk.cyan('Or rename folders manually to resolve.'));
      console.log('');
    } else {
      // Brief warning (for auto-check)
      console.log('');
      console.log(chalk.yellow(`⚠️  Conflict warning: ${conflicts.length} sequence conflict(s) detected`));
      console.log(chalk.gray('Run: lean-spec check'));
      console.log('');
    }
  }
  
  return false;
}

/**
 * Helper for auto-check in other commands
 */
export async function autoCheckIfEnabled(): Promise<void> {
  const config = await loadConfig();
  
  // Check if auto-check is disabled
  if (config.autoCheck === false) {
    return;
  }
  
  // Run check in quiet mode (brief warning only)
  try {
    await checkSpecs({ quiet: true });
  } catch {
    // Ignore errors in auto-check
  }
}
