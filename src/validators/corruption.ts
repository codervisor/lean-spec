/**
 * Corruption validator - detects file corruption from failed edits
 * 
 * Focus on visually apparent corruption that breaks rendering:
 * - Unclosed code blocks (breaks syntax highlighting)
 * - Unclosed formatting in actual content (not code blocks)
 * - Duplicate content blocks (merge artifacts, failed edits)
 * 
 * Intentionally excludes:
 * - YAML/JSON validation (code examples often show invalid syntax)
 */

import type { ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../utils/validation-framework.js';
import type { SpecInfo } from '../spec-loader.js';

/**
 * Represents a code block range in the document
 */
interface CodeBlockRange {
  start: number;  // Line number (1-indexed)
  end: number;    // Line number (1-indexed)
}

export interface CorruptionOptions {
  // Enable/disable specific checks
  checkCodeBlocks?: boolean;
  checkMarkdownStructure?: boolean;
  checkDuplicateContent?: boolean;
  // Duplicate detection tuning (reduced false positives)
  duplicateBlockSize?: number;      // Lines to match (default: 5, was 3)
  duplicateMinLength?: number;      // Min chars (default: 100, was 50)
}

export class CorruptionValidator implements ValidationRule {
  name = 'corruption';
  description = 'Detect file corruption from failed edits';

  private options: Required<CorruptionOptions>;

  constructor(options: CorruptionOptions = {}) {
    this.options = {
      checkCodeBlocks: options.checkCodeBlocks ?? true,
      checkMarkdownStructure: options.checkMarkdownStructure ?? true,
      checkDuplicateContent: options.checkDuplicateContent ?? true,
      duplicateBlockSize: options.duplicateBlockSize ?? 5,
      duplicateMinLength: options.duplicateMinLength ?? 100,
    };
  }

  validate(_spec: SpecInfo, content: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Parse code block ranges once for reuse
    const codeBlockRanges = this.parseCodeBlockRanges(content);

    // Check code blocks (unclosed blocks)
    if (this.options.checkCodeBlocks) {
      const codeBlockErrors = this.validateCodeBlocks(content);
      errors.push(...codeBlockErrors);
    }

    // Check markdown structure (but exclude code blocks)
    if (this.options.checkMarkdownStructure) {
      const markdownErrors = this.validateMarkdownStructure(content, codeBlockRanges);
      errors.push(...markdownErrors);
    }

    // Check for duplicate content (but exclude code blocks)
    if (this.options.checkDuplicateContent) {
      const duplicateWarnings = this.detectDuplicateContent(content, codeBlockRanges);
      warnings.push(...duplicateWarnings);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Parse all code block ranges in the document
   * Returns array of {start, end} line numbers (1-indexed)
   */
  private parseCodeBlockRanges(content: string): CodeBlockRange[] {
    const ranges: CodeBlockRange[] = [];
    const lines = content.split('\n');
    
    let inCodeBlock = false;
    let blockStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          blockStart = i + 1; // 1-indexed
        } else {
          ranges.push({
            start: blockStart,
            end: i + 1 // 1-indexed, inclusive
          });
          inCodeBlock = false;
          blockStart = -1;
        }
      }
    }

    return ranges;
  }

  /**
   * Check if a line number is inside a code block
   */
  private isInCodeBlock(lineNumber: number, codeBlockRanges: CodeBlockRange[]): boolean {
    return codeBlockRanges.some(
      range => lineNumber >= range.start && lineNumber <= range.end
    );
  }

  /**
   * Get content outside code blocks for analysis
   */
  private getContentOutsideCodeBlocks(content: string, codeBlockRanges: CodeBlockRange[]): string {
    const lines = content.split('\n');
    const filteredLines = lines.filter((_, index) => {
      const lineNumber = index + 1; // 1-indexed
      return !this.isInCodeBlock(lineNumber, codeBlockRanges);
    });
    return filteredLines.join('\n');
  }

  /**
   * Validate code blocks are properly closed
   * This is the #1 indicator of corruption - causes visible syntax highlighting issues
   */
  private validateCodeBlocks(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = content.split('\n');
    
    let inCodeBlock = false;
    let codeBlockStartLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStartLine = i + 1;
        } else {
          inCodeBlock = false;
          codeBlockStartLine = -1;
        }
      }
    }

    // If still in code block at end, it's unclosed
    if (inCodeBlock) {
      errors.push({
        message: `Unclosed code block starting at line ${codeBlockStartLine}`,
        suggestion: 'Add closing ``` to complete the code block',
      });
    }

    return errors;
  }

  /**
   * Detect duplicate content blocks (excluding code blocks)
   * Improved tuning to reduce false positives
   * 
   * Changes from original:
   * - Block size: 5 lines (was 3) - reduces matching of small common patterns
   * - Min length: 100 chars (was 50) - requires substantial duplication
   * - Excludes code blocks - prevents false positives from code examples
   */
  private detectDuplicateContent(content: string, codeBlockRanges: CodeBlockRange[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Get content outside code blocks
    const contentOutsideCodeBlocks = this.getContentOutsideCodeBlocks(content, codeBlockRanges);
    const lines = contentOutsideCodeBlocks.split('\n');
    
    // Look for significant duplicate blocks
    const blockSize = this.options.duplicateBlockSize!;
    const minLength = this.options.duplicateMinLength!;
    const blocks = new Map<string, number[]>();

    for (let i = 0; i <= lines.length - blockSize; i++) {
      const block = lines.slice(i, i + blockSize)
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .join('\n');

      if (block.length >= minLength) { // Only check substantial blocks
        if (!blocks.has(block)) {
          blocks.set(block, []);
        }
        blocks.get(block)!.push(i + 1);
      }
    }

    // Report blocks that appear multiple times
    for (const [block, lineNumbers] of blocks.entries()) {
      if (lineNumbers.length > 1) {
        warnings.push({
          message: `Duplicate content block found at lines: ${lineNumbers.join(', ')}`,
          suggestion: 'Check for merge artifacts or failed edits',
        });
      }
    }

    return warnings;
  }

  /**
   * Validate markdown structure (excluding code blocks)
   * Only checks actual content for formatting issues
   */
  private validateMarkdownStructure(content: string, codeBlockRanges: CodeBlockRange[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Get content outside code blocks
    const contentOutsideCodeBlocks = this.getContentOutsideCodeBlocks(content, codeBlockRanges);

    // Remove list markers first (before checking asterisks)
    const lines = contentOutsideCodeBlocks.split('\n');
    const linesWithoutListMarkers = lines.map(line => {
      const trimmed = line.trim();
      // Replace list markers: "- item" or "* item" or "+ item"
      if (trimmed.match(/^[-*+]\s/)) {
        return line.replace(/^(\s*)([-*+]\s)/, '$1  '); // Replace marker with spaces
      }
      return line;
    });
    let contentWithoutListMarkers = linesWithoutListMarkers.join('\n');

    // Also remove inline code (backticks) which might contain asterisks
    // Replace `code` with empty string to exclude from asterisk counting
    contentWithoutListMarkers = contentWithoutListMarkers.replace(/`[^`]*`/g, '');

    // Check for unclosed formatting
    const boldMatches = contentWithoutListMarkers.match(/\*\*/g) || [];
    
    // For italic, count single asterisks that are not part of bold
    // Split by ** first, then count * in the remaining text
    const withoutBold = contentWithoutListMarkers.split('**').join('');
    const italicMatches = withoutBold.match(/\*/g) || [];
    
    if (boldMatches.length % 2 !== 0) {
      errors.push({
        message: 'Unclosed bold formatting (**)',
        suggestion: 'Check for missing closing ** in markdown content (not code blocks)',
      });
    }

    if (italicMatches.length % 2 !== 0) {
      errors.push({
        message: 'Unclosed italic formatting (*)',
        suggestion: 'Check for missing closing * in markdown content (not code blocks)',
      });
    }

    return errors;
  }
}
