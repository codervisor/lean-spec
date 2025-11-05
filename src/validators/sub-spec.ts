/**
 * Sub-spec validator - validates sub-spec files per spec 012 conventions
 * 
 * Phase 3.5: Sub-Spec Validation
 * - Validates sub-spec naming conventions
 * - Checks README.md references all sub-specs
 * - Validates line counts per sub-spec file (<400 lines)
 * - Detects orphaned sub-spec files (not linked from README)
 * - Validates cross-document references
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../utils/validation-framework.js';
import type { SpecInfo } from '../spec-loader.js';
import { loadSubFiles, type SubFileInfo } from '../spec-loader.js';

export interface SubSpecOptions {
  maxLines?: number;  // Default: 400
  warningThreshold?: number;  // Default: 300
  checkCrossReferences?: boolean;  // Default: true
}

export class SubSpecValidator implements ValidationRule {
  name = 'sub-specs';
  description = 'Validate sub-spec files per spec 012 conventions';

  private maxLines: number;
  private warningThreshold: number;
  private checkCrossReferences: boolean;

  constructor(options: SubSpecOptions = {}) {
    this.maxLines = options.maxLines ?? 400;
    this.warningThreshold = options.warningThreshold ?? 300;
    this.checkCrossReferences = options.checkCrossReferences ?? true;
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

    // Validate line counts for each sub-spec
    await this.validateLineCounts(subSpecs, errors, warnings);

    // Check for orphaned sub-specs (not referenced in README.md)
    this.checkOrphanedSubSpecs(subSpecs, content, warnings);

    // Validate cross-references
    if (this.checkCrossReferences) {
      await this.validateCrossReferences(subSpecs, spec, warnings);
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
   * Validate line counts for each sub-spec file
   */
  private async validateLineCounts(
    subSpecs: SubFileInfo[], 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    for (const subSpec of subSpecs) {
      if (!subSpec.content) {
        continue;
      }

      const lines = subSpec.content.split('\n').length;

      // Error: exceeds limit
      if (lines > this.maxLines) {
        errors.push({
          message: `Sub-spec ${subSpec.name} exceeds ${this.maxLines} lines (${lines} lines)`,
          suggestion: 'Consider further splitting or simplification',
        });
      }
      // Warning: approaching limit
      else if (lines > this.warningThreshold) {
        warnings.push({
          message: `Sub-spec ${subSpec.name} approaching limit (${lines}/${this.maxLines} lines)`,
          suggestion: 'Consider simplification',
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
   * Validate cross-document references between sub-specs
   */
  private async validateCrossReferences(
    subSpecs: SubFileInfo[],
    spec: SpecInfo,
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Build a set of all valid sub-spec filenames
    const validFileNames = new Set(subSpecs.map(s => s.name));
    validFileNames.add('README.md'); // README is also valid

    for (const subSpec of subSpecs) {
      if (!subSpec.content) {
        continue;
      }

      // Find all markdown links in the content with optional ./ prefix
      const linkRegex = /\[([^\]]+)\]\((?:\.\/)?([\w-]+\.md)\)/g;
      let match;

      while ((match = linkRegex.exec(subSpec.content)) !== null) {
        const referencedFile = match[2];
        
        // Check if referenced file exists
        if (!validFileNames.has(referencedFile)) {
          warnings.push({
            message: `Broken reference in ${subSpec.name}: ${referencedFile} not found`,
            suggestion: `Check if ${referencedFile} exists or update the link`,
          });
        }
      }
    }
  }
}
