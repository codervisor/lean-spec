/**
 * Validate command - validates specs for quality issues
 * 
 * Phase 1a: Basic framework + line count validation
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig } from '../config.js';
import { loadAllSpecs, type SpecInfo } from '../spec-loader.js';
import { withSpinner } from '../utils/ui.js';
import { LineCountValidator } from '../validators/line-count.js';
import type { ValidationRule, ValidationResult } from '../utils/validation-framework.js';

export interface ValidateOptions {
  maxLines?: number;  // Custom line limit (default: 400)
  specs?: string[];   // Specific specs to validate, or all if not provided
}

interface ValidationResultWithSpec {
  spec: SpecInfo;
  result: ValidationResult;
}

/**
 * Validate specs for quality issues
 */
export async function validateCommand(options: ValidateOptions = {}): Promise<boolean> {
  const config = await loadConfig();

  // Load specs to validate
  let specs: SpecInfo[];
  if (options.specs && options.specs.length > 0) {
    // Validate specific specs
    specs = [];
    for (const specPath of options.specs) {
      const loadedSpecs = await loadAllSpecs();
      const spec = loadedSpecs.find(s => 
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
  ];

  // Run validation
  console.log(chalk.bold('\nValidating specs...\n'));

  const results: ValidationResultWithSpec[] = [];
  
  for (const spec of specs) {
    // Read spec content
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
      results.push({ spec, result });
    }
  }

  // Display results grouped by validator
  let hasErrors = false;
  let warningCount = 0;
  let passCount = 0;

  console.log(chalk.bold('Line Count:'));
  
  for (const { spec, result } of results) {
    const specName = path.basename(spec.path);
    const content = await fs.readFile(spec.filePath, 'utf-8');
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
      warningCount++;
      console.log(chalk.yellow(`  ⚠ ${specName} (${lineCount} lines - approaching limit)`));
      for (const warning of result.warnings) {
        console.log(chalk.gray(`     → ${warning.suggestion || warning.message}`));
      }
    } else {
      passCount++;
      console.log(chalk.green(`  ✓ ${specName} (${lineCount} lines)`));
    }
  }

  // Summary
  console.log('');
  const errorCount = results.filter(r => !r.result.passed).length;
  
  if (hasErrors) {
    console.log(chalk.red(`Results: ${passCount} passed, ${warningCount} warning(s), ${errorCount} failed`));
  } else if (warningCount > 0) {
    console.log(chalk.yellow(`Results: ${passCount} passed, ${warningCount} warning(s), 0 failed`));
  } else {
    console.log(chalk.green(`Results: ${passCount} passed, 0 warnings, 0 failed`));
  }

  return !hasErrors;
}
