/**
 * Validate command - validates specs for quality issues
 * 
 * Phase 1a: Basic framework + line count validation
 * Phase 1b: Frontmatter validation
 * Phase 2: Structure validation
 * Phase 3: Corruption detection
 * Phase 3.5: Sub-spec validation
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
import { SubSpecValidator } from '../validators/sub-spec.js';
import type { ValidationRule, ValidationResult } from '../utils/validation-framework.js';
import { formatValidationResults, type FormatOptions } from '../utils/validate-formatter.js';

export interface ValidateOptions {
  maxLines?: number;  // Custom line limit (default: 400)
  specs?: string[];   // Specific specs to validate, or all if not provided
  verbose?: boolean;  // Show passing specs
  quiet?: boolean;    // Suppress warnings, only show errors
  format?: 'default' | 'json' | 'compact';  // Output format
  rule?: string;      // Filter by specific rule name
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
    new SubSpecValidator({ maxLines: options.maxLines }),
  ];

  // Run validation
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

  // Format and display results using new formatter
  const formatOptions: FormatOptions = {
    verbose: options.verbose,
    quiet: options.quiet,
    format: options.format,
    rule: options.rule,
  };

  const output = formatValidationResults(results, specs, config.specsDir, formatOptions);
  console.log(output);

  // Determine if validation passed (any errors = failed)
  const hasErrors = results.some(r => !r.result.passed);
  return !hasErrors;
}
