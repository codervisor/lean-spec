/**
 * Line count validator - enforces Context Economy principle
 * 
 * Specs must fit in working memory:
 * - <300 lines: ✓ Ideal
 * - 300-400 lines: ⚠️ Warning (approaching limit)
 * - >400 lines: ✗ Error (exceeds limit)
 */

import type { ValidationRule, ValidationResult } from '../utils/validation-framework.js';
import type { SpecInfo } from '../spec-loader.js';

export interface LineCountOptions {
  maxLines?: number;  // Default: 400
  warningThreshold?: number;  // Default: 300
}

export class LineCountValidator implements ValidationRule {
  name = 'max-lines';
  description = 'Enforce Context Economy: specs must be <400 lines';

  private maxLines: number;
  private warningThreshold: number;

  constructor(options: LineCountOptions = {}) {
    this.maxLines = options.maxLines ?? 400;
    this.warningThreshold = options.warningThreshold ?? 300;
  }

  validate(_spec: SpecInfo, content: string): ValidationResult {
    const lines = content.split('\n').length;

    // Error: exceeds limit
    if (lines > this.maxLines) {
      return {
        passed: false,
        errors: [{
          message: `Spec exceeds ${this.maxLines} lines (${lines} lines)`,
          suggestion: 'Consider splitting into sub-specs using spec 012 pattern',
        }],
        warnings: [],
      };
    }

    // Warning: approaching limit
    if (lines > this.warningThreshold) {
      return {
        passed: true,
        errors: [],
        warnings: [{
          message: `Spec approaching limit (${lines}/${this.maxLines} lines)`,
          suggestion: 'Consider simplification or splitting',
        }],
      };
    }

    // Pass: under threshold
    return {
      passed: true,
      errors: [],
      warnings: [],
    };
  }
}
