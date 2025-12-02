/**
 * Frontmatter validator - validates spec frontmatter for quality issues
 * 
 * Phase 1b: Frontmatter Validation
 * - Required fields: status, created
 * - Valid status values: planned, in-progress, complete, archived
 * - Valid priority values: low, medium, high, critical
 * - Date format validation (ISO 8601)
 * - Tags format validation (array of strings)
 */

import type { ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../utils/validation-framework.js';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';
import matter from 'gray-matter';
import yaml from 'js-yaml';

export interface FrontmatterOptions {
  // Allow customization of valid values (future use)
  validStatuses?: SpecStatus[];
  validPriorities?: SpecPriority[];
}

export class FrontmatterValidator implements ValidationRule {
  name = 'frontmatter';
  description = 'Validate spec frontmatter for required fields and valid values';

  private validStatuses: SpecStatus[];
  private validPriorities: SpecPriority[];

  constructor(options: FrontmatterOptions = {}) {
    this.validStatuses = options.validStatuses ?? ['planned', 'in-progress', 'complete', 'archived'];
    this.validPriorities = options.validPriorities ?? ['low', 'medium', 'high', 'critical'];
  }

  validate(spec: SpecInfo, content: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Parse frontmatter
    let parsed;
    try {
      parsed = matter(content, {
        engines: {
          yaml: (str) => yaml.load(str, { schema: yaml.FAILSAFE_SCHEMA }) as Record<string, unknown>
        }
      });
    } catch (error) {
      errors.push({
        message: 'Failed to parse frontmatter YAML',
        suggestion: 'Check for YAML syntax errors in frontmatter',
      });
      return { passed: false, errors, warnings };
    }

    const frontmatter = parsed.data;

    // Check if frontmatter exists
    if (!frontmatter || Object.keys(frontmatter).length === 0) {
      errors.push({
        message: 'No frontmatter found',
        suggestion: 'Add YAML frontmatter at the top of the file between --- delimiters',
      });
      return { passed: false, errors, warnings };
    }

    // Required field: status
    if (!frontmatter.status) {
      errors.push({
        message: 'Missing required field: status',
        suggestion: 'Add status field (valid values: planned, in-progress, complete, archived)',
      });
    } else {
      // Validate status value
      const statusStr = String(frontmatter.status);
      if (!this.validStatuses.includes(statusStr as SpecStatus)) {
        errors.push({
          message: `Invalid status: "${statusStr}"`,
          suggestion: `Valid values: ${this.validStatuses.join(', ')}`,
        });
      }
    }

    // Required field: created
    if (!frontmatter.created) {
      errors.push({
        message: 'Missing required field: created',
        suggestion: 'Add created field with date in YYYY-MM-DD format',
      });
    } else {
      // Validate created date format
      const dateValidation = this.validateDateField(frontmatter.created, 'created');
      if (!dateValidation.valid) {
        errors.push({
          message: dateValidation.message!,
          suggestion: dateValidation.suggestion,
        });
      }
    }

    // Optional field: priority (validate if present)
    if (frontmatter.priority) {
      const priorityStr = String(frontmatter.priority);
      if (!this.validPriorities.includes(priorityStr as SpecPriority)) {
        errors.push({
          message: `Invalid priority: "${priorityStr}"`,
          suggestion: `Valid values: ${this.validPriorities.join(', ')}`,
        });
      }
    }

    // Optional field: tags (validate if present)
    if (frontmatter.tags !== undefined && frontmatter.tags !== null) {
      if (!Array.isArray(frontmatter.tags)) {
        errors.push({
          message: 'Field "tags" must be an array',
          suggestion: 'Use array format: tags: [tag1, tag2]',
        });
      }
      // Note: We don't strictly validate tag types as YAML may parse numbers/booleans
      // This is acceptable as they'll be coerced to strings when used
    }

    // Validate other date fields if present
    const dateFields = ['updated', 'completed', 'due'];
    for (const field of dateFields) {
      if (frontmatter[field]) {
        const dateValidation = this.validateDateField(frontmatter[field], field);
        if (!dateValidation.valid) {
          warnings.push({
            message: dateValidation.message!,
            suggestion: dateValidation.suggestion,
          });
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate date field format (ISO 8601: YYYY-MM-DD or full timestamp)
   */
  private validateDateField(value: unknown, fieldName: string): {
    valid: boolean;
    message?: string;
    suggestion?: string;
  } {
    // Handle Date objects (gray-matter auto-parses dates)
    if (value instanceof Date) {
      return { valid: true };
    }

    if (typeof value !== 'string') {
      return {
        valid: false,
        message: `Field "${fieldName}" must be a string or date`,
        suggestion: 'Use YYYY-MM-DD format (e.g., 2025-11-05)',
      };
    }

    // Check for ISO 8601 date format (YYYY-MM-DD) or full timestamp
    // Be lenient: accept YYYY-MM-DD or timestamps with/without milliseconds and timezone
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?)?$/;
    if (!isoDateRegex.test(value)) {
      return {
        valid: false,
        message: `Field "${fieldName}" has invalid date format: "${value}"`,
        suggestion: 'Use ISO 8601 format: YYYY-MM-DD (e.g., 2025-11-05)',
      };
    }

    // Validate the date is actually valid (not 2025-99-99)
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        valid: false,
        message: `Field "${fieldName}" has invalid date: "${value}"`,
        suggestion: 'Ensure date is valid (e.g., month 01-12, day 01-31)',
      };
    }

    return { valid: true };
  }
}
