/**
 * Structure validator - validates spec structure and required sections
 * 
 * Phase 2: Structure Validation
 * - Must have title (H1 heading)
 * - Must have required sections
 * - No empty required sections
 * - No duplicate section headers at same level
 */

import * as path from 'node:path';
import type { ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../utils/validation-framework.js';
import type { SpecInfo } from '../spec-loader.js';
import matter from 'gray-matter';

export interface StructureOptions {
  // Required section names (H2 level)
  requiredSections?: string[];
  // Allow custom section validation
  strict?: boolean;
}

export class StructureValidator implements ValidationRule {
  name = 'structure';
  description = 'Validate spec structure and required sections';

  private requiredSections: string[];
  private strict: boolean;

  constructor(options: StructureOptions = {}) {
    // Default required sections based on common spec patterns
    this.requiredSections = options.requiredSections ?? ['Overview', 'Design'];
    this.strict = options.strict ?? false;
  }

  async validate(spec: SpecInfo, content: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Parse content to separate frontmatter from body
    let parsed;
    try {
      parsed = matter(content);
    } catch (error) {
      errors.push({
        message: 'Failed to parse frontmatter',
        suggestion: 'Check YAML frontmatter syntax',
      });
      return { passed: false, errors, warnings };
    }

    const body = parsed.content;

    // Check for H1 title
    const h1Match = body.match(/^#\s+(.+)$/m);
    if (!h1Match) {
      errors.push({
        message: 'Missing H1 title (# Heading)',
        suggestion: 'Add a title as the first heading in the spec',
      });
    }

    // Extract all headings
    const headings = this.extractHeadings(body);

    // Check for required sections (H2 level)
    for (const requiredSection of this.requiredSections) {
      const found = headings.some(
        h => h.level === 2 && h.text.toLowerCase() === requiredSection.toLowerCase()
      );
      if (!found) {
        if (this.strict) {
          errors.push({
            message: `Missing required section: ## ${requiredSection}`,
            suggestion: `Add ## ${requiredSection} section to the spec`,
          });
        } else {
          warnings.push({
            message: `Recommended section missing: ## ${requiredSection}`,
            suggestion: `Consider adding ## ${requiredSection} section`,
          });
        }
      }
    }

    // Check for empty sections
    const emptySections = this.findEmptySections(body, headings);
    for (const section of emptySections) {
      // Only warn about empty required sections
      if (this.requiredSections.some(req => req.toLowerCase() === section.toLowerCase())) {
        warnings.push({
          message: `Empty required section: ## ${section}`,
          suggestion: 'Add content to this section or remove it',
        });
      }
    }

    // Check for duplicate headers at same level
    const duplicates = this.findDuplicateHeaders(headings);
    for (const dup of duplicates) {
      errors.push({
        message: `Duplicate section header: ${'#'.repeat(dup.level)} ${dup.text}`,
        suggestion: 'Remove or rename duplicate section headers',
      });
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Extract all headings from markdown content (excluding code blocks)
   */
  private extractHeadings(content: string): Array<{ level: number; text: string; line: number }> {
    const headings: Array<{ level: number; text: string; line: number }> = [];
    const lines = content.split('\n');
    
    let inCodeBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track code block boundaries
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      
      // Skip lines inside code blocks
      if (inCodeBlock) {
        continue;
      }
      
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          line: i + 1,
        });
      }
    }
    
    return headings;
  }

  /**
   * Find empty sections (sections with no content until next heading)
   */
  private findEmptySections(content: string, headings: Array<{ level: number; text: string; line: number }>): string[] {
    const emptySections: string[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      
      // Only check H2 sections
      if (heading.level !== 2) {
        continue;
      }

      // Find the next heading at the same or higher level (end of this section)
      let nextSameLevelIndex = i + 1;
      while (nextSameLevelIndex < headings.length && headings[nextSameLevelIndex].level > heading.level) {
        nextSameLevelIndex++;
      }
      
      const nextHeading = headings[nextSameLevelIndex];
      
      // Get content between this heading and next same-level heading
      const startLine = heading.line;
      const endLine = nextHeading ? nextHeading.line - 1 : lines.length;
      
      // Extract content lines (excluding the heading itself)
      const sectionLines = lines.slice(startLine, endLine);
      
      // Check if section has any subsections
      const hasSubsections = headings.some((h, idx) => 
        idx > i && 
        idx < nextSameLevelIndex && 
        h.level > heading.level
      );
      
      // If there are subsections, the section is not empty
      if (hasSubsections) {
        continue;
      }
      
      // Check if section is empty (only whitespace or comments)
      const hasContent = sectionLines.some(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('<!--') && !trimmed.startsWith('//');
      });

      if (!hasContent) {
        emptySections.push(heading.text);
      }
    }

    return emptySections;
  }

  /**
   * Find duplicate headers at the same level
   */
  private findDuplicateHeaders(headings: Array<{ level: number; text: string; line: number }>): Array<{ level: number; text: string }> {
    const seen = new Map<string, number>();
    const duplicates: Array<{ level: number; text: string }> = [];

    for (const heading of headings) {
      const key = `${heading.level}:${heading.text.toLowerCase()}`;
      const count = seen.get(key) ?? 0;
      seen.set(key, count + 1);

      if (count === 1) {
        // Found a duplicate (second occurrence)
        duplicates.push({ level: heading.level, text: heading.text });
      }
    }

    return duplicates;
  }
}
