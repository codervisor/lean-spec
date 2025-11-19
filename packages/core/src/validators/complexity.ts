/**
 * Complexity validator - direct token threshold validation
 * 
 * Implements spec 071: Simplified Token-Based Validation
 * 
 * Uses direct, independent checks instead of derived scores:
 * 1. Token count (primary check) - direct thresholds
 * 2. Structure quality (independent feedback) - sub-specs and sectioning
 * 3. Line count (backstop only) - for extreme cases
 * 
 * Research-backed findings:
 * - Token count predicts AI performance better than line count
 * - Quality degradation starts before 50K token limits
 * - Sub-specs enable progressive disclosure (Context Economy)
 * - Good sectioning enables cognitive chunking (7±2 rule)
 */

import type { ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../utils/validation-framework.js';
import type { SpecInfo } from '../types/index.js';
import { TokenCounter } from '../utils/token-counter.js';
import matter from 'gray-matter';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface ComplexityOptions {
  // Token thresholds (hypothesis values, to be validated)
  excellentThreshold?: number;  // Default: 2000 tokens
  goodThreshold?: number;       // Default: 3500 tokens
  warningThreshold?: number;    // Default: 5000 tokens
  
  // Line count backstop (safety net)
  maxLines?: number;            // Default: 500 lines
  warningLines?: number;        // Default: 400 lines
}

export interface ComplexityMetrics {
  lineCount: number;
  tokenCount: number;
  sectionCount: number;
  codeBlockCount: number;
  listItemCount: number;
  tableCount: number;
  hasSubSpecs: boolean;
  subSpecCount: number;
  averageSectionLength: number;
}

// Deprecated - kept for backward compatibility only
export interface ComplexityScore {
  score: number; // 0-100 (lower is better) - DEPRECATED
  factors: {
    tokens: number;      // Primary: token-based score (0-60) - DEPRECATED
    structure: number;   // Modifier: structure quality (-30 to +20) - DEPRECATED
  };
  recommendation: 'excellent' | 'good' | 'review' | 'split'; // DEPRECATED
  metrics: ComplexityMetrics;
  costMultiplier: number; // vs 1,200 token baseline
}

export class ComplexityValidator implements ValidationRule {
  name = 'complexity';
  description = 'Direct token threshold validation with independent structure checks';

  private excellentThreshold: number;
  private goodThreshold: number;
  private warningThreshold: number;
  private maxLines: number;
  private warningLines: number;

  constructor(options: ComplexityOptions = {}) {
    // Token thresholds (hypothesis values based on research)
    this.excellentThreshold = options.excellentThreshold ?? 2000;
    this.goodThreshold = options.goodThreshold ?? 3500;
    this.warningThreshold = options.warningThreshold ?? 5000;
    
    // Line count backstop
    this.maxLines = options.maxLines ?? 500;
    this.warningLines = options.warningLines ?? 400;
  }

  async validate(spec: SpecInfo, content: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Analyze complexity
    const metrics = await this.analyzeComplexity(content, spec);

    // PRIMARY CHECK: Direct token thresholds
    const tokenValidation = this.validateTokens(metrics.tokenCount);
    if (tokenValidation.level === 'error') {
      errors.push({
        message: tokenValidation.message,
        suggestion: 'Consider splitting for Context Economy (attention and cognitive load)',
      });
    } else if (tokenValidation.level === 'warning') {
      warnings.push({
        message: tokenValidation.message,
        suggestion: 'Consider simplification or splitting into sub-specs',
      });
    }

    // INDEPENDENT CHECKS: Structure feedback
    const structureChecks = this.checkStructure(metrics);
    for (const check of structureChecks) {
      if (!check.passed && check.message) {
        warnings.push({
          message: check.message,
          suggestion: check.suggestion,
        });
      }
    }

    // LINE COUNT BACKSTOP: catch extremely long specs even if tokens are fine
    const lineWarning = this.checkLineCounts(metrics.lineCount);
    if (lineWarning) {
      warnings.push(lineWarning);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate token count with direct thresholds
   */
  private validateTokens(tokens: number): { level: 'excellent' | 'good' | 'info' | 'warning' | 'error'; message: string } {
    if (tokens > this.warningThreshold) {
      return {
        level: 'error',
        message: `Spec has ${tokens.toLocaleString()} tokens (threshold: ${this.warningThreshold.toLocaleString()}) - should split`,
      };
    }
    
    if (tokens > this.goodThreshold) {
      return {
        level: 'warning',
        message: `Spec has ${tokens.toLocaleString()} tokens (threshold: ${this.goodThreshold.toLocaleString()})`,
      };
    }
    
    if (tokens > this.excellentThreshold) {
      return {
        level: 'info',
        message: `Spec has ${tokens.toLocaleString()} tokens - acceptable, watch for growth`,
      };
    }
    
    return {
      level: 'excellent',
      message: `Spec has ${tokens.toLocaleString()} tokens - excellent`,
    };
  }

  /**
   * Check structure quality independently
   */
  private checkStructure(metrics: ComplexityMetrics): Array<{ passed: boolean; message?: string; suggestion?: string }> {
    const checks: Array<{ passed: boolean; message?: string; suggestion?: string }> = [];
    
    // Sub-specs presence (positive feedback when helpful)
    if (metrics.hasSubSpecs) {
      // Only show positive feedback if spec is large enough that sub-specs help
      if (metrics.tokenCount > this.excellentThreshold) {
        checks.push({
          passed: true,
          message: `Uses ${metrics.subSpecCount} sub-spec file${metrics.subSpecCount > 1 ? 's' : ''} for progressive disclosure`,
        });
      }
    } else if (metrics.tokenCount > this.goodThreshold) {
      checks.push({
        passed: false,
        message: 'Consider using sub-spec files (DESIGN.md, IMPLEMENTATION.md, etc.)',
        suggestion: 'Progressive disclosure reduces cognitive load for large specs',
      });
    }
    
    // Section organization
    if (metrics.sectionCount >= 15 && metrics.sectionCount <= 35) {
      // Only show positive feedback if structure is helping manage complexity
      if (metrics.tokenCount > this.excellentThreshold) {
        checks.push({
          passed: true,
          message: `Good sectioning (${metrics.sectionCount} sections) enables cognitive chunking`,
        });
      }
    } else if (metrics.sectionCount < 8 && metrics.lineCount > 200) {
      checks.push({
        passed: false,
        message: `Only ${metrics.sectionCount} sections - too monolithic`,
        suggestion: 'Break into 15-35 sections for better readability (7±2 cognitive chunks)',
      });
    }
    
    // Code block density
    if (metrics.codeBlockCount > 20) {
      checks.push({
        passed: false,
        message: `High code block density (${metrics.codeBlockCount} blocks)`,
        suggestion: 'Consider moving examples to separate files or sub-specs',
      });
    }
    
    return checks;
  }

  /**
   * Provide warnings when line counts exceed backstop thresholds
   */
  private checkLineCounts(lineCount: number): ValidationWarning | null {
    if (lineCount > this.maxLines) {
      return {
        message: `Spec is very long at ${lineCount.toLocaleString()} lines (limit ${this.maxLines.toLocaleString()})`,
        suggestion: 'Split the document or move details to sub-spec files to keep context manageable',
      };
    }

    if (lineCount > this.warningLines) {
      return {
        message: `Spec is ${lineCount.toLocaleString()} lines — approaching the ${this.warningLines.toLocaleString()} line backstop`,
        suggestion: 'Watch size growth and consider progressive disclosure before hitting hard limits',
      };
    }

    return null;
  }

  /**
   * Analyze complexity metrics from spec content
   */
  private async analyzeComplexity(content: string, spec: SpecInfo): Promise<ComplexityMetrics> {
    // Parse to separate frontmatter from body
    let body: string;
    try {
      const parsed = matter(content);
      body = parsed.content;
    } catch {
      body = content;
    }

    const lines = content.split('\n');
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

    // Count code blocks
    const codeBlockCount = Math.floor((content.match(/```/g) || []).length / 2);

    // Count list items (-, *, or numbered)
    const listItemCount = lines.filter(line => line.match(/^[\s]*[-*]\s/) || line.match(/^[\s]*\d+\.\s/)).length;

    // Count tables (lines with table separators)
    const tableCount = lines.filter(line => line.includes('|') && line.match(/[-:]{3,}/)).length;

    // Count tokens using tiktoken
    const counter = new TokenCounter();
    const tokenCount = await counter.countString(content);
    counter.dispose();

    // Detect sub-specs by checking actual files in the spec directory
    let hasSubSpecs = false;
    let subSpecCount = 0;
    
    try {
      // Get the directory path (parent of README.md)
      const specDir = path.dirname(spec.filePath);
      const files = await fs.readdir(specDir);
      
      // Count markdown files excluding README.md
      // Sub-specs are markdown files other than README.md
      const mdFiles = files.filter(f => 
        f.endsWith('.md') && 
        f !== 'README.md'
      );
      
      hasSubSpecs = mdFiles.length > 0;
      subSpecCount = mdFiles.length;
    } catch (error) {
      // If we can't read the directory, fall back to content-based detection
      // This preserves backwards compatibility if there are permission issues
      hasSubSpecs = /\b(DESIGN|IMPLEMENTATION|TESTING|CONFIGURATION|API|MIGRATION)\.md\b/.test(content);
      const subSpecMatches = content.match(/\b[A-Z-]+\.md\b/g) || [];
      const uniqueSubSpecs = new Set(subSpecMatches.filter(m => m !== 'README.md'));
      subSpecCount = uniqueSubSpecs.size;
    }

    // Calculate average section length
    const averageSectionLength = sectionCount > 0 ? Math.round(lineCount / sectionCount) : 0;

    return {
      lineCount,
      tokenCount,
      sectionCount,
      codeBlockCount,
      listItemCount,
      tableCount,
      hasSubSpecs,
      subSpecCount,
      averageSectionLength,
    };
  }
}
