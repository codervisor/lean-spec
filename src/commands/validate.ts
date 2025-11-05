/**
 * Validate command - validates specs for quality issues
 * 
 * Phase 1a: Basic framework + line count validation
 * Phase 1b: Frontmatter validation
 * Phase 2: Structure validation
 * Phase 3: Corruption detection
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig } from '../config.js';
import { loadAllSpecs, type SpecInfo } from '../spec-loader.js';
import { withSpinner } from '../utils/ui.js';
import { LineCountValidator } from '../validators/line-count.js';
import { FrontmatterValidator } from '../validators/frontmatter.js';
import { StructureValidator } from '../validators/structure.js';
import { CorruptionValidator } from '../validators/corruption.js';
import type { ValidationRule, ValidationResult } from '../utils/validation-framework.js';

export interface ValidateOptions {
  maxLines?: number;  // Custom line limit (default: 400)
  specs?: string[];   // Specific specs to validate, or all if not provided
}

interface ValidationResultWithSpec {
  spec: SpecInfo;
  validatorName: string;
  result: ValidationResult;
  content: string; // Store content to avoid duplicate reads
}

/**
 * Validate specs for quality issues
 */
export async function validateCommand(options: ValidateOptions = {}): Promise<boolean> {
  const config = await loadConfig();

  // Load specs to validate
  let specs: SpecInfo[];
  if (options.specs && options.specs.length > 0) {
    // Validate specific specs - load all specs once and filter
    const allSpecs = await loadAllSpecs();
    specs = [];
    for (const specPath of options.specs) {
      const spec = allSpecs.find(s => 
        s.path.includes(specPath) || 
        path.basename(s.path).includes(specPath)
      );
      if (spec) {
        specs.push(spec);
      } else {
        console.error(chalk.red(`Error: Spec not found: ${specPath}`));
        return false;
      }
    }
  } else {
    // Validate all specs
    specs = await withSpinner(
      'Loading specs...',
      () => loadAllSpecs({ includeArchived: false })
    );
  }

  if (specs.length === 0) {
    console.log('No specs found to validate.');
    return true;
  }

  // Initialize validators
  const validators: ValidationRule[] = [
    new LineCountValidator({ maxLines: options.maxLines }),
    new FrontmatterValidator(),
    new StructureValidator(),
    new CorruptionValidator(),
  ];

  // Run validation
  console.log(chalk.bold('\nValidating specs...\n'));

  const results: ValidationResultWithSpec[] = [];
  
  for (const spec of specs) {
    // Read spec content once
    let content: string;
    try {
      content = await fs.readFile(spec.filePath, 'utf-8');
    } catch (error) {
      console.error(chalk.red(`Error reading ${spec.filePath}:`), error);
      continue;
    }

    // Run all validators
    for (const validator of validators) {
      const result = await validator.validate(spec, content);
      results.push({ 
        spec, 
        validatorName: validator.name,
        result, 
        content,
      });
    }
  }

  // Display results grouped by validator
  let hasErrors = false;
  let totalWarningCount = 0;
  let totalPassCount = 0;

  // Group results by validator
  const resultsByValidator = new Map<string, ValidationResultWithSpec[]>();
  for (const result of results) {
    if (!resultsByValidator.has(result.validatorName)) {
      resultsByValidator.set(result.validatorName, []);
    }
    resultsByValidator.get(result.validatorName)!.push(result);
  }

  // Display Line Count results
  const lineCountResults = resultsByValidator.get('max-lines') || [];
  if (lineCountResults.length > 0) {
    console.log(chalk.bold('Line Count:'));
    
    for (const { spec, result, content } of lineCountResults) {
      const specName = path.basename(spec.path);
      const lineCount = content.split('\n').length;

      if (!result.passed) {
        hasErrors = true;
        console.log(chalk.red(`  ✗ ${specName} (${lineCount} lines - exceeds limit!)`));
        for (const error of result.errors) {
          console.log(chalk.gray(`     → ${error.message}`));
          if (error.suggestion) {
            console.log(chalk.gray(`     → ${error.suggestion}`));
          }
        }
      } else if (result.warnings.length > 0) {
        totalWarningCount++;
        console.log(chalk.yellow(`  ⚠ ${specName} (${lineCount} lines - approaching limit)`));
        for (const warning of result.warnings) {
          console.log(chalk.gray(`     → ${warning.suggestion || warning.message}`));
        }
      } else {
        totalPassCount++;
        console.log(chalk.green(`  ✓ ${specName} (${lineCount} lines)`));
      }
    }
    console.log('');
  }

  // Display Frontmatter results
  const frontmatterResults = resultsByValidator.get('frontmatter') || [];
  if (frontmatterResults.length > 0) {
    console.log(chalk.bold('Frontmatter:'));
    
    const errorResults = frontmatterResults.filter(r => !r.result.passed);
    const warningResults = frontmatterResults.filter(r => r.result.passed && r.result.warnings.length > 0);
    const passResults = frontmatterResults.filter(r => r.result.passed && r.result.warnings.length === 0);

    // Show errors
    if (errorResults.length > 0) {
      hasErrors = true;
      console.log(chalk.red(`  ✗ ${errorResults.length} spec(s) with errors:`));
      for (const { spec, result } of errorResults) {
        const specName = path.basename(spec.path);
        console.log(chalk.gray(`    - ${specName}`));
        for (const error of result.errors) {
          console.log(chalk.gray(`      • ${error.message}`));
          if (error.suggestion) {
            console.log(chalk.gray(`        → ${error.suggestion}`));
          }
        }
      }
    }

    // Show warnings
    if (warningResults.length > 0) {
      totalWarningCount += warningResults.length;
      console.log(chalk.yellow(`  ⚠ ${warningResults.length} spec(s) with warnings:`));
      for (const { spec, result } of warningResults) {
        const specName = path.basename(spec.path);
        console.log(chalk.gray(`    - ${specName}`));
        for (const warning of result.warnings) {
          console.log(chalk.gray(`      • ${warning.message}`));
          if (warning.suggestion) {
            console.log(chalk.gray(`        → ${warning.suggestion}`));
          }
        }
      }
    }

    // Show summary of passing specs
    if (passResults.length > 0 && (errorResults.length > 0 || warningResults.length > 0)) {
      totalPassCount += passResults.length;
      console.log(chalk.green(`  ✓ ${passResults.length} spec(s) passed`));
    } else if (passResults.length > 0) {
      totalPassCount += passResults.length;
      console.log(chalk.green(`  ✓ All ${passResults.length} spec(s) passed`));
    }
    console.log('');
  }

  // Display Structure results
  const structureResults = resultsByValidator.get('structure') || [];
  if (structureResults.length > 0) {
    console.log(chalk.bold('Structure:'));
    
    const errorResults = structureResults.filter(r => !r.result.passed);
    const warningResults = structureResults.filter(r => r.result.passed && r.result.warnings.length > 0);
    const passResults = structureResults.filter(r => r.result.passed && r.result.warnings.length === 0);

    // Show errors
    if (errorResults.length > 0) {
      hasErrors = true;
      console.log(chalk.red(`  ✗ ${errorResults.length} spec(s) with errors:`));
      for (const { spec, result } of errorResults) {
        const specName = path.basename(spec.path);
        console.log(chalk.gray(`    - ${specName}`));
        for (const error of result.errors) {
          console.log(chalk.gray(`      • ${error.message}`));
          if (error.suggestion) {
            console.log(chalk.gray(`        → ${error.suggestion}`));
          }
        }
      }
    }

    // Show warnings
    if (warningResults.length > 0) {
      totalWarningCount += warningResults.length;
      console.log(chalk.yellow(`  ⚠ ${warningResults.length} spec(s) with warnings:`));
      for (const { spec, result } of warningResults) {
        const specName = path.basename(spec.path);
        console.log(chalk.gray(`    - ${specName}`));
        for (const warning of result.warnings) {
          console.log(chalk.gray(`      • ${warning.message}`));
          if (warning.suggestion) {
            console.log(chalk.gray(`        → ${warning.suggestion}`));
          }
        }
      }
    }

    // Show summary of passing specs
    if (passResults.length > 0 && (errorResults.length > 0 || warningResults.length > 0)) {
      totalPassCount += passResults.length;
      console.log(chalk.green(`  ✓ ${passResults.length} spec(s) passed`));
    } else if (passResults.length > 0) {
      totalPassCount += passResults.length;
      console.log(chalk.green(`  ✓ All ${passResults.length} spec(s) passed`));
    }
    console.log('');
  }

  // Display Corruption results
  const corruptionResults = resultsByValidator.get('corruption') || [];
  if (corruptionResults.length > 0) {
    console.log(chalk.bold('Corruption:'));
    
    const errorResults = corruptionResults.filter(r => !r.result.passed);
    const warningResults = corruptionResults.filter(r => r.result.passed && r.result.warnings.length > 0);
    const passResults = corruptionResults.filter(r => r.result.passed && r.result.warnings.length === 0);

    // Show errors
    if (errorResults.length > 0) {
      hasErrors = true;
      console.log(chalk.red(`  ✗ ${errorResults.length} spec(s) with errors:`));
      for (const { spec, result } of errorResults) {
        const specName = path.basename(spec.path);
        console.log(chalk.gray(`    - ${specName}`));
        for (const error of result.errors) {
          console.log(chalk.gray(`      • ${error.message}`));
          if (error.suggestion) {
            console.log(chalk.gray(`        → ${error.suggestion}`));
          }
        }
      }
    }

    // Show warnings
    if (warningResults.length > 0) {
      totalWarningCount += warningResults.length;
      console.log(chalk.yellow(`  ⚠ ${warningResults.length} spec(s) with warnings:`));
      for (const { spec, result } of warningResults) {
        const specName = path.basename(spec.path);
        console.log(chalk.gray(`    - ${specName}`));
        for (const warning of result.warnings) {
          console.log(chalk.gray(`      • ${warning.message}`));
          if (warning.suggestion) {
            console.log(chalk.gray(`        → ${warning.suggestion}`));
          }
        }
      }
    }

    // Show summary of passing specs
    if (passResults.length > 0 && (errorResults.length > 0 || warningResults.length > 0)) {
      totalPassCount += passResults.length;
      console.log(chalk.green(`  ✓ ${passResults.length} spec(s) passed`));
    } else if (passResults.length > 0) {
      totalPassCount += passResults.length;
      console.log(chalk.green(`  ✓ All ${passResults.length} spec(s) passed`));
    }
    console.log('');
  }

  // Summary
  const totalSpecs = specs.length;
  const errorCount = results.filter(r => !r.result.passed).length;
  
  if (hasErrors) {
    console.log(chalk.red(`Results: ${totalSpecs} specs validated, ${errorCount} error(s), ${totalWarningCount} warning(s)`));
  } else if (totalWarningCount > 0) {
    console.log(chalk.yellow(`Results: ${totalSpecs} specs validated, 0 errors, ${totalWarningCount} warning(s)`));
  } else {
    console.log(chalk.green(`Results: ${totalSpecs} specs validated, all passed`));
  }

  return !hasErrors;
}
