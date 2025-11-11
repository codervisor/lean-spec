/**
 * Complexity validator - multi-dimensional spec complexity analysis
 * 
 * Implements spec 066: Context Economy Thresholds Refinement
 * 
 * Measures complexity using:
 * 1. Token count (primary factor) - correlates with AI performance
 * 2. Structure quality (modifier) - sub-specs and section organization
 * 
 * Research-backed findings:
 * - Token count predicts AI performance better than line count
 * - Quality degradation starts before 50K token limits
 * - Sub-specs enable progressive disclosure (Context Economy)
 * - Good sectioning enables cognitive chunking (7±2 rule)
 */

import type { ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../utils/validation-framework.js';
import type { SpecInfo } from '../types/index.js';
import { estimateTokenCount } from 'tokenx';
import matter from 'gray-matter';

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

export interface ComplexityScore {
  score: number; // 0-100 (lower is better)
  factors: {
    tokens: number;      // Primary: token-based score (0-60)
    structure: number;   // Modifier: structure quality (-30 to +20)
  };
  recommendation: 'excellent' | 'good' | 'review' | 'split';
  metrics: ComplexityMetrics;
  costMultiplier: number; // vs 1,200 token baseline
}

export class ComplexityValidator implements ValidationRule {
  name = 'complexity';
  description = 'Multi-dimensional complexity analysis based on tokens and structure';

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
    const metrics = this.analyzeComplexity(content, spec);
    const score = this.calculateComplexityScore(metrics);

    // Primary check: Complexity score
    if (score.recommendation === 'split') {
      errors.push({
        message: `Spec complexity too high (score: ${score.score}/100, ${metrics.tokenCount} tokens)`,
        suggestion: this.getSuggestion(score, metrics),
      });
    } else if (score.recommendation === 'review') {
      warnings.push({
        message: `Spec complexity moderate (score: ${score.score}/100, ${metrics.tokenCount} tokens)`,
        suggestion: this.getSuggestion(score, metrics),
      });
    }

    // Backstop check: Line count (only if complexity is already concerning)
    if (metrics.lineCount > this.maxLines) {
      if (score.recommendation === 'split') {
        // Already erroring, just note line count
        errors[0].message += ` and ${metrics.lineCount} lines`;
      } else {
        // Well-structured but very long - warn
        warnings.push({
          message: `Spec is very long (${metrics.lineCount} lines) despite good structure`,
          suggestion: 'Consider splitting for Context Economy (easier to read and navigate)',
        });
      }
    } else if (metrics.lineCount > this.warningLines && score.recommendation === 'review') {
      // Approaching line limit with moderate complexity
      warnings[0].message += ` and ${metrics.lineCount} lines`;
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Analyze complexity metrics from spec content
   */
  private analyzeComplexity(content: string, spec: SpecInfo): ComplexityMetrics {
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

    // Estimate tokens
    const tokenCount = estimateTokenCount(content);

    // Detect sub-specs (check if spec directory has multiple .md files)
    // For now, heuristically detect by checking for references to sub-spec files
    const hasSubSpecs = /\b(DESIGN|IMPLEMENTATION|TESTING|CONFIGURATION|API|MIGRATION)\.md\b/.test(content);
    
    // Rough count of sub-specs from content references
    const subSpecMatches = content.match(/\b[A-Z-]+\.md\b/g) || [];
    const uniqueSubSpecs = new Set(subSpecMatches.filter(m => m !== 'README.md'));
    const subSpecCount = uniqueSubSpecs.size;

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

  /**
   * Calculate complexity score using token count and structure modifiers
   */
  private calculateComplexityScore(metrics: ComplexityMetrics): ComplexityScore {
    // PRIMARY: Token count (research-backed predictor of AI performance)
    // Thresholds are hypotheses to be validated empirically
    let tokenScore = 0;
    if (metrics.tokenCount >= this.warningThreshold) {
      tokenScore = 60; // Should split
    } else if (metrics.tokenCount >= this.goodThreshold) {
      tokenScore = 40; // Warning zone
    } else if (metrics.tokenCount >= this.excellentThreshold) {
      tokenScore = 20; // Good range
    } else {
      tokenScore = 0; // Excellent
    }

    // MODIFIERS: Structure quality adjusts token-based score
    let structureModifier = 0;
    
    if (metrics.hasSubSpecs) {
      // Progressive disclosure bonus (big win for Context Economy)
      structureModifier = -30;
    } else if (metrics.sectionCount >= 15 && metrics.sectionCount <= 35) {
      // Good sectioning enables cognitive chunking (7±2 rule)
      structureModifier = -15;
    } else if (metrics.sectionCount < 8) {
      // Too monolithic (harder to chunk mentally)
      structureModifier = +20;
    }

    // Calculate final score (bounded 0-100)
    const finalScore = Math.max(0, Math.min(100, tokenScore + structureModifier));

    // Determine recommendation
    let recommendation: 'excellent' | 'good' | 'review' | 'split';
    if (finalScore <= 10) {
      recommendation = 'excellent';
    } else if (finalScore <= 25) {
      recommendation = 'good';
    } else if (finalScore <= 50) {
      recommendation = 'review';
    } else {
      recommendation = 'split';
    }

    // Calculate cost multiplier (vs 1,200 token baseline)
    const baselineTokens = 1200;
    const costMultiplier = Math.round((metrics.tokenCount / baselineTokens) * 10) / 10;

    return {
      score: finalScore,
      factors: {
        tokens: tokenScore,
        structure: structureModifier,
      },
      recommendation,
      metrics,
      costMultiplier,
    };
  }

  /**
   * Generate actionable suggestion based on complexity analysis
   */
  private getSuggestion(score: ComplexityScore, metrics: ComplexityMetrics): string {
    const suggestions: string[] = [];

    // Token count suggestions
    if (metrics.tokenCount > this.warningThreshold) {
      suggestions.push('Token count very high - strongly consider splitting');
    } else if (metrics.tokenCount > this.goodThreshold) {
      suggestions.push('Token count elevated - consider simplification');
    }

    // Structure suggestions
    if (!metrics.hasSubSpecs && metrics.tokenCount > this.excellentThreshold) {
      suggestions.push('Use sub-spec files (DESIGN.md, IMPLEMENTATION.md) for progressive disclosure');
    }

    if (metrics.sectionCount < 8 && metrics.lineCount > 200) {
      suggestions.push('Break into more sections (aim for 15-35 sections for better cognitive chunking)');
    }

    // Code block density
    if (metrics.codeBlockCount > 20) {
      suggestions.push('High code block density - consider moving examples to separate files');
    }

    // Default suggestion
    if (suggestions.length === 0) {
      suggestions.push('Consider simplification or splitting to improve readability');
    }

    return suggestions.join('; ');
  }
}
