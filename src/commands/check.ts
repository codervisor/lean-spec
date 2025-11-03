import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig } from '../config.js';
import { loadAllSpecs } from '../spec-loader.js';
import { createSpecDirPattern } from '../utils/path-helpers.js';

/**
 * Check for sequence conflicts in specs
 */
export async function checkSpecs(options: {
  quiet?: boolean;
  silent?: boolean;
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
      console.log(chalk.green('✓ No sequence conflicts detected'));
    }
    return true;
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
          console.log(chalk.gray(`    - ${p}`));
        }
        console.log('');
      }
      
      console.log(chalk.cyan('Tip: Use date prefix to prevent conflicts:'));
      console.log(chalk.gray('  Edit .lspec/config.json → structure.prefix: "{YYYYMMDD}-"'));
      console.log('');
      console.log(chalk.cyan('Or rename folders manually to resolve.'));
      console.log('');
    } else {
      // Brief warning (for auto-check)
      console.log('');
      console.log(chalk.yellow(`⚠️  Conflict warning: ${conflicts.length} sequence conflict(s) detected`));
      console.log(chalk.gray('Run: lspec check'));
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
