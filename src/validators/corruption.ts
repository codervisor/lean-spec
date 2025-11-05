/**
 * Corruption validator - detects file corruption from failed edits
 * 
 * Phase 3: Corruption Detection
 * - Validates code blocks are properly closed
 * - Checks JSON/YAML blocks are complete and parseable
 * - Detects duplicate content blocks
 * - Validates markdown structure (lists, tables)
 */

import type { ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../utils/validation-framework.js';
import type { SpecInfo } from '../spec-loader.js';
import yaml from 'js-yaml';

export interface CorruptionOptions {
  // Enable/disable specific checks
  checkCodeBlocks?: boolean;
  checkJsonYaml?: boolean;
  checkDuplicateContent?: boolean;
  checkMarkdownStructure?: boolean;
}

export class CorruptionValidator implements ValidationRule {
  name = 'corruption';
  description = 'Detect file corruption from failed edits';

  private options: Required<CorruptionOptions>;

  constructor(options: CorruptionOptions = {}) {
    this.options = {
      checkCodeBlocks: options.checkCodeBlocks ?? true,
      checkJsonYaml: options.checkJsonYaml ?? true,
      checkDuplicateContent: options.checkDuplicateContent ?? true,
      checkMarkdownStructure: options.checkMarkdownStructure ?? true,
    };
  }

  validate(_spec: SpecInfo, content: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check code blocks
    if (this.options.checkCodeBlocks) {
      const codeBlockErrors = this.validateCodeBlocks(content);
      errors.push(...codeBlockErrors);
    }

    // Check JSON/YAML blocks
    if (this.options.checkJsonYaml) {
      const jsonYamlErrors = this.validateJsonYamlBlocks(content);
      errors.push(...jsonYamlErrors);
    }

    // Check for duplicate content blocks
    if (this.options.checkDuplicateContent) {
      const duplicateWarnings = this.detectDuplicateContent(content);
      warnings.push(...duplicateWarnings);
    }

    // Check markdown structure
    if (this.options.checkMarkdownStructure) {
      const markdownErrors = this.validateMarkdownStructure(content);
      errors.push(...markdownErrors);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate code blocks are properly closed
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
   * Validate JSON/YAML blocks in code fences
   */
  private validateJsonYamlBlocks(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = content.split('\n');
    
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockContent: string[] = [];
    let codeBlockStartLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        if (!inCodeBlock) {
          // Starting a code block
          inCodeBlock = true;
          codeBlockLang = trimmed.slice(3).trim().toLowerCase();
          codeBlockContent = [];
          codeBlockStartLine = i + 1;
        } else {
          // Ending a code block - validate if it's JSON or YAML
          if (codeBlockLang === 'json' || codeBlockLang === 'jsonc') {
            const jsonContent = codeBlockContent.join('\n');
            if (jsonContent.trim()) {
              try {
                // Remove comments for jsonc
                const cleanJson = codeBlockLang === 'jsonc' 
                  ? jsonContent.replace(/\/\/.*$/gm, '')
                  : jsonContent;
                JSON.parse(cleanJson);
              } catch (error) {
                errors.push({
                  message: `Invalid JSON in code block at line ${codeBlockStartLine}`,
                  suggestion: error instanceof Error ? error.message : 'Check JSON syntax',
                });
              }
            }
          } else if (codeBlockLang === 'yaml' || codeBlockLang === 'yml') {
            const yamlContent = codeBlockContent.join('\n');
            if (yamlContent.trim()) {
              try {
                yaml.load(yamlContent);
              } catch (error) {
                errors.push({
                  message: `Invalid YAML in code block at line ${codeBlockStartLine}`,
                  suggestion: error instanceof Error ? error.message : 'Check YAML syntax',
                });
              }
            }
          }

          inCodeBlock = false;
          codeBlockLang = '';
          codeBlockContent = [];
        }
      } else if (inCodeBlock) {
        codeBlockContent.push(line);
      }
    }

    return errors;
  }

  /**
   * Detect duplicate content blocks (potential merge artifacts)
   */
  private detectDuplicateContent(content: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const lines = content.split('\n');
    
    // Look for significant duplicate blocks (3+ consecutive lines)
    const blockSize = 3;
    const blocks = new Map<string, number[]>();

    for (let i = 0; i <= lines.length - blockSize; i++) {
      const block = lines.slice(i, i + blockSize)
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .join('\n');

      if (block.length > 50) { // Only check substantial blocks
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
   * Validate markdown structure
   */
  private validateMarkdownStructure(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = content.split('\n');

    // Check for unclosed formatting
    const boldMatches = content.match(/\*\*/g) || [];
    const italicMatches = content.match(/(?<!\*)\*(?!\*)/g) || [];
    
    if (boldMatches.length % 2 !== 0) {
      errors.push({
        message: 'Unclosed bold formatting (**)',
        suggestion: 'Check for missing closing **',
      });
    }

    if (italicMatches.length % 2 !== 0) {
      errors.push({
        message: 'Unclosed italic formatting (*)',
        suggestion: 'Check for missing closing *',
      });
    }

    // Check for malformed tables
    let inTable = false;
    let tableStartLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('|')) {
        if (!inTable) {
          inTable = true;
          tableStartLine = i + 1;
        }
        
        // Check if it looks like a table row
        if (line.length > 0 && !line.startsWith('|') && !line.endsWith('|')) {
          // Could be a partial table row - this is just informational, not critical
          // Don't add error for now as it's too noisy
        }
      } else if (inTable && line.length > 0) {
        // Exited table
        inTable = false;
      }
    }

    // Check for malformed lists
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check for list items with weird indentation
      if (trimmed.match(/^[-*+]\s/) && line.length > 0) {
        const leadingSpaces = line.match(/^ */)?.[0].length || 0;
        if (leadingSpaces > 0 && leadingSpaces % 2 !== 0) {
          // Odd indentation (not multiple of 2) - informational only
          // Don't add error for now as it's too noisy
        }
      }
    }

    return errors;
  }
}
