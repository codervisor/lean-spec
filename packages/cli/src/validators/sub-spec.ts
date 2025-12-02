/**
 * Sub-spec validator - validates sub-spec files per spec 012 conventions
 * 
 * Phase 3.5: Sub-Spec Validation
 * - Validates sub-spec naming conventions
 * - Checks README.md references all sub-specs
 * - Validates complexity (token count + structure) per sub-spec file
 * - Detects orphaned sub-spec files (not linked from README)
 * - Validates cross-document references
 * 
 * Updated per spec 066: Uses complexity scoring instead of line counts
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { countTokens } from '@leanspec/core';
import matter from 'gray-matter';
import type { ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../utils/validation-framework.js';
import type { SpecInfo } from '../spec-loader.js';
import { loadSubFiles, type SubFileInfo } from '../spec-loader.js';

export interface SubSpecOptions {
  // Token thresholds (same as ComplexityValidator)
  excellentThreshold?: number;  // Default: 2000 tokens
  goodThreshold?: number;       // Default: 3500 tokens
  warningThreshold?: number;    // Default: 5000 tokens
  
  // Line count backstop (safety net)
  maxLines?: number;            // Default: 500 lines

  // Cross-reference validation toggle
  checkCrossReferences?: boolean; // Default: true
}

export class SubSpecValidator implements ValidationRule {
  name = 'sub-specs';
  description = 'Validate sub-spec files using direct token thresholds (spec 071)';

  private excellentThreshold: number;
  private goodThreshold: number;
  private warningThreshold: number;
  private maxLines: number;
  private checkCrossRefs: boolean;

  constructor(options: SubSpecOptions = {}) {
    // Token thresholds (hypothesis values based on research)
    this.excellentThreshold = options.excellentThreshold ?? 2000;
    this.goodThreshold = options.goodThreshold ?? 3500;
    this.warningThreshold = options.warningThreshold ?? 5000;
    
    // Line count backstop
    this.maxLines = options.maxLines ?? 500;

    // Cross-reference validation toggle
    this.checkCrossRefs = options.checkCrossReferences ?? true;
  }

  async validate(spec: SpecInfo, content: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Load sub-files for this spec
    const subFiles = await loadSubFiles(spec.fullPath, { includeContent: true });
    
    // Filter to only markdown documents (sub-specs)
    const subSpecs = subFiles.filter(f => f.type === 'document');

    // If no sub-specs, validation passes (nothing to check)
    if (subSpecs.length === 0) {
      return { passed: true, errors, warnings };
    }

    // Validate naming conventions
    this.validateNamingConventions(subSpecs, warnings);

    // Validate complexity (token count + structure) for each sub-spec
    await this.validateComplexity(subSpecs, errors, warnings);

    // Check for orphaned sub-specs (not referenced in README.md)
    this.checkOrphanedSubSpecs(subSpecs, content, warnings);

    if (this.checkCrossRefs) {
      this.validateCrossReferences(subSpecs, warnings);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate sub-spec naming conventions
   * Convention: Uppercase filenames (e.g., DESIGN.md, TESTING.md, IMPLEMENTATION.md)
   */
  private validateNamingConventions(subSpecs: SubFileInfo[], warnings: ValidationWarning[]): void {
    for (const subSpec of subSpecs) {
      const baseName = path.basename(subSpec.name, '.md');
      
      // Check if filename follows uppercase convention
      if (baseName !== baseName.toUpperCase()) {
        warnings.push({
          message: `Sub-spec filename should be uppercase: ${subSpec.name}`,
          suggestion: `Consider renaming to ${baseName.toUpperCase()}.md`,
        });
      }
    }
  }

  /**
   * Validate complexity for each sub-spec file using direct token thresholds
   * Same approach as ComplexityValidator (spec 071)
   */
  private async validateComplexity(
    subSpecs: SubFileInfo[], 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    for (const subSpec of subSpecs) {
      if (!subSpec.content) {
        continue;
      }

      const lines = subSpec.content.split('\n');
      const lineCount = lines.length;

      // Count sections (## headings, excluding code blocks)
      let sectionCount = 0;
      let inCodeBlock = false;
      for (const line of lines) {
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        if (!inCodeBlock && line.match(/^#{2,4}\s/)) {
          sectionCount++;
        }
      }

      // Count tokens (async, accurate)
      const tokenResult = await countTokens(subSpec.content);
      const tokenCount = tokenResult.total;

      // PRIMARY CHECK: Direct token thresholds
      if (tokenCount > this.warningThreshold) {
        errors.push({
          message: `Sub-spec ${subSpec.name} has ${tokenCount.toLocaleString()} tokens (threshold: ${this.warningThreshold.toLocaleString()}) - should split`,
          suggestion: 'Consider splitting for Context Economy (attention and cognitive load)',
        });
      } else if (tokenCount > this.goodThreshold) {
        warnings.push({
          message: `Sub-spec ${subSpec.name} has ${tokenCount.toLocaleString()} tokens (threshold: ${this.goodThreshold.toLocaleString()})`,
          suggestion: 'Consider simplification or further splitting',
        });
      }

      // STRUCTURE CHECK: Sectioning
      if (sectionCount < 8 && lineCount > 200) {
        warnings.push({
          message: `Sub-spec ${subSpec.name} has only ${sectionCount} sections - too monolithic`,
          suggestion: 'Break into 15-35 sections for better readability (7±2 cognitive chunks)',
        });
      }
    }
  }

  /**
   * Check for orphaned sub-specs not referenced in README.md
   */
  private checkOrphanedSubSpecs(
    subSpecs: SubFileInfo[], 
    readmeContent: string,
    warnings: ValidationWarning[]
  ): void {
    for (const subSpec of subSpecs) {
      // Check if sub-spec is referenced in README
      // Look for markdown links like [text](./FILENAME.md) or [text](FILENAME.md)
      const fileName = subSpec.name;
      // Escape special regex characters in filename
      const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match with optional ./ prefix
      const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\((?:\\.\\/)?${escapedFileName}\\)`, 'gi');
      const isReferenced = linkPattern.test(readmeContent);

      if (!isReferenced) {
        warnings.push({
          message: `Orphaned sub-spec: ${fileName} (not linked from README.md)`,
          suggestion: `Add a link to ${fileName} in README.md to document its purpose`,
        });
      }
    }
  }

  /**
   * Detect cross-document references that point to missing files
   */
  private validateCrossReferences(
    subSpecs: SubFileInfo[],
    warnings: ValidationWarning[]
  ): void {
    const availableFiles = new Set<string>(
      subSpecs.map(subSpec => subSpec.name.toLowerCase())
    );
    availableFiles.add('readme.md');

    const linkPattern = /\[[^\]]+\]\(([^)]+)\)/gi;

    for (const subSpec of subSpecs) {
      if (!subSpec.content) continue;

      for (const match of subSpec.content.matchAll(linkPattern)) {
        const rawTarget = match[1].split('#')[0]?.trim();
        if (!rawTarget || !rawTarget.toLowerCase().endsWith('.md')) {
          continue;
        }

        const normalized = rawTarget.replace(/^\.\//, '');
        const normalizedLower = normalized.toLowerCase();

        if (availableFiles.has(normalizedLower)) {
          continue;
        }

        warnings.push({
          message: `Broken reference in ${subSpec.name}: ${normalized}`,
          suggestion: `Ensure ${normalized} exists or update the link`,
        });
      }
    }
  }

}
