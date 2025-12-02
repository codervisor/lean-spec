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
import { TokenCounter } from '../utils/token-counter.js';
import matter from 'gray-matter';
import type { ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../utils/validation-framework.js';
import type { SpecInfo, SubFileInfo } from '../types/index.js';

export interface SubSpecOptions {
  // Token thresholds (same as ComplexityValidator)
  excellentThreshold?: number;  // Default: 2000 tokens
  goodThreshold?: number;       // Default: 3500 tokens
  warningThreshold?: number;    // Default: 5000 tokens
  
  // Line count backstop (safety net)
  maxLines?: number;            // Default: 500 lines
  
  checkCrossReferences?: boolean;  // Default: true
}

export class SubSpecValidator implements ValidationRule {
  name = 'sub-specs';
  description = 'Validate sub-spec files using complexity scoring (spec 066)';

  private excellentThreshold: number;
  private goodThreshold: number;
  private warningThreshold: number;
  private maxLines: number;
  private checkCrossReferences: boolean;

  constructor(options: SubSpecOptions = {}) {
    // Token thresholds (hypothesis values based on research)
    this.excellentThreshold = options.excellentThreshold ?? 2000;
    this.goodThreshold = options.goodThreshold ?? 3500;
    this.warningThreshold = options.warningThreshold ?? 5000;
    
    // Line count backstop
    this.maxLines = options.maxLines ?? 500;
    
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

    // Validate complexity (token count + structure) for each sub-spec
    await this.validateComplexity(subSpecs, errors, warnings);

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
   * Validate complexity for each sub-spec file using token count + structure
   * Same algorithm as ComplexityValidator but simplified (sub-specs don't have sub-sub-specs)
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

      // Count tokens using tiktoken
      const counter = new TokenCounter();
      const tokenCount = await counter.countString(subSpec.content);
      counter.dispose();

      // Calculate token score (primary factor)
      let tokenScore = 0;
      if (tokenCount >= this.warningThreshold) {
        tokenScore = 60; // Should split
      } else if (tokenCount >= this.goodThreshold) {
        tokenScore = 40; // Warning zone
      } else if (tokenCount >= this.excellentThreshold) {
        tokenScore = 20; // Good range
      } else {
        tokenScore = 0; // Excellent
      }

      // Calculate structure modifier
      // Sub-specs don't have sub-sub-specs, so only check sectioning
      let structureModifier = 0;
      if (sectionCount >= 15 && sectionCount <= 35) {
        structureModifier = -15; // Good sectioning
      } else if (sectionCount < 8) {
        structureModifier = +20; // Too monolithic
      }

      // Final score
      const finalScore = Math.max(0, Math.min(100, tokenScore + structureModifier));

      // Generate messages based on score
      if (finalScore > 50) {
        // Error: should split
        errors.push({
          message: `Sub-spec ${subSpec.name} complexity too high (score: ${finalScore}/100, ${tokenCount} tokens, ${lineCount} lines)`,
          suggestion: this.getSuggestion(tokenCount, sectionCount, lineCount),
        });
      } else if (finalScore > 25) {
        // Warning: review
        warnings.push({
          message: `Sub-spec ${subSpec.name} complexity moderate (score: ${finalScore}/100, ${tokenCount} tokens, ${lineCount} lines)`,
          suggestion: this.getSuggestion(tokenCount, sectionCount, lineCount),
        });
      } else if (lineCount > this.maxLines) {
        // Backstop: well-structured but very long
        warnings.push({
          message: `Sub-spec ${subSpec.name} is very long (${lineCount} lines) despite good structure`,
          suggestion: 'Consider splitting for Context Economy (easier to read and navigate)',
        });
      }
    }
  }

  /**
   * Generate actionable suggestion based on complexity analysis
   */
  private getSuggestion(tokenCount: number, sectionCount: number, lineCount: number): string {
    const suggestions: string[] = [];

    if (tokenCount > this.warningThreshold) {
      suggestions.push('Token count very high - strongly consider splitting');
    } else if (tokenCount > this.goodThreshold) {
      suggestions.push('Token count elevated - consider simplification');
    }

    if (sectionCount < 8 && lineCount > 200) {
      suggestions.push('Break into more sections (aim for 15-35 sections for better cognitive chunking)');
    }

    if (suggestions.length === 0) {
      suggestions.push('Consider further splitting or simplification');
    }

    return suggestions.join('; ');
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
      // Match any characters except closing paren to support various filename patterns
      const linkRegex = /\[([^\]]+)\]\((?:\.\/)?(([^)]+)\.md)\)/g;
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

/**
 * Load sub-files (markdown documents and assets) from a spec directory
 */
async function loadSubFiles(
  specDir: string,
  options: { includeContent?: boolean } = {}
): Promise<SubFileInfo[]> {
  const files = await fs.readdir(specDir);
  const subFiles: SubFileInfo[] = [];

  for (const file of files) {
    // Skip README.md (main spec file)
    if (file === 'README.md') {
      continue;
    }

    const filePath = path.join(specDir, file);
    const stats = await fs.stat(filePath);

    // Only process files, not directories
    if (!stats.isFile()) {
      continue;
    }

    // Determine file type
    const isMarkdown = file.endsWith('.md');
    const type: 'document' | 'asset' = isMarkdown ? 'document' : 'asset';

    // Load content if requested and it's a markdown file
    let content: string | undefined;
    if (options.includeContent && isMarkdown) {
      content = await fs.readFile(filePath, 'utf-8');
    }

    subFiles.push({
      name: file,
      path: filePath,
      size: stats.size,
      type,
      content,
    });
  }

  return subFiles;
}
