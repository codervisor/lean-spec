/**
 * Analyze command - programmatic spec analysis for AI agents
 * 
 * Implements spec 059: Programmatic Spec Management
 * 
 * Returns structured data about spec complexity and structure.
 * AI agents use this to decide transformation strategies.
 * 
 * No semantic analysis - just mechanical structure parsing.
 */

import chalk from 'chalk';
import * as path from 'node:path';
import { Command } from 'commander';
import { TokenCounter, analyzeMarkdownStructure, type Section } from '@leanspec/core';
import { loadConfig } from '../config.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';
import { readFile } from 'node:fs/promises';

export interface AnalyzeOptions {
  json?: boolean;           // Output as JSON for AI agents
  verbose?: boolean;        // Include detailed breakdown
}

/**
 * Analyze command - analyze spec complexity and structure
 */
export function analyzeCommand(): Command {
  return new Command('analyze')
    .description('Analyze spec complexity and structure (spec 059)')
    .argument('<spec>', 'Spec to analyze')
    .option('--json', 'Output as JSON for AI agents')
    .option('--verbose', 'Include detailed section breakdown')
    .action(async (specPath: string, options: { json?: boolean; verbose?: boolean }) => {
      await analyzeSpec(specPath, options);
    });
}

export interface AnalyzeResult {
  spec: string;
  path: string;
  metrics: {
    tokens: number;
    lines: number;
    characters: number;
    sections: {
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
      total: number;
    };
    codeBlocks: number;
    maxNesting: number;
  };
  threshold: {
    status: 'excellent' | 'good' | 'warning' | 'problem';
    limit: number;
    message: string;
  };
  structure: Array<{
    section: string;
    level: number;
    lineRange: [number, number];
    tokens: number;
    subsections: string[];
  }>;
  recommendation: {
    action: 'none' | 'compact' | 'split' | 'review';
    reason: string;
    confidence: 'low' | 'medium' | 'high';
  };
}

/**
 * Analyze spec complexity and structure
 */
export async function analyzeSpec(specPath: string, options: AnalyzeOptions = {}): Promise<void> {
  await autoCheckIfEnabled();

  const counter = new TokenCounter();
  
  try {
    // Resolve spec path
    const config = await loadConfig();
    const cwd = process.cwd();
    const specsDir = path.join(cwd, config.specsDir);
    const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
    
    if (!resolvedPath) {
      throw new Error(`Spec not found: ${sanitizeUserInput(specPath)}`);
    }

    // Read spec content
    const specName = path.basename(resolvedPath);
    const readmePath = path.join(resolvedPath, 'README.md');
    const content = await readFile(readmePath, 'utf-8');
    
    // Analyze structure
    const structure = analyzeMarkdownStructure(content);
    
    // Count tokens
    const tokenResult = await counter.countSpec(resolvedPath, {
      detailed: true,
      includeSubSpecs: false, // Only analyze README.md for structure
    });
    
    // Get performance indicators
    const indicators = counter.getPerformanceIndicators(tokenResult.total);
    
    // Calculate tokens per section (estimate based on line count)
    const sectionsWithTokens = await Promise.all(
      structure.allSections.map(async (section) => {
        const sectionContent = content.split('\n').slice(section.startLine - 1, section.endLine).join('\n');
        const sectionTokens = await counter.countTokensInContent(sectionContent);
        
        return {
          section: section.title,
          level: section.level,
          lineRange: [section.startLine, section.endLine] as [number, number],
          tokens: sectionTokens,
          subsections: section.subsections.map(s => s.title),
        };
      })
    );
    
    // Generate recommendation
    const recommendation = generateRecommendation(tokenResult.total, structure, indicators.level);
    
    // Build result
    const result: AnalyzeResult = {
      spec: specName,
      path: resolvedPath,
      metrics: {
        tokens: tokenResult.total,
        lines: structure.lines,
        characters: content.length,
        sections: structure.sectionsByLevel,
        codeBlocks: structure.codeBlocks,
        maxNesting: structure.maxNesting,
      },
      threshold: {
        status: indicators.level,
        limit: getThresholdLimit(indicators.level),
        message: indicators.recommendation,
      },
      structure: sectionsWithTokens,
      recommendation,
    };

    // Output as JSON
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // Display human-readable output
    displayAnalysis(result, options.verbose);
    
  } finally {
    counter.dispose();
  }
}

/**
 * Generate transformation recommendation
 */
function generateRecommendation(
  tokens: number,
  structure: ReturnType<typeof analyzeMarkdownStructure>,
  level: string
): AnalyzeResult['recommendation'] {
  // Excellent - no action needed
  if (tokens < 2000) {
    return {
      action: 'none',
      reason: 'Spec is under 2,000 tokens (optimal)',
      confidence: 'high',
    };
  }
  
  // Good - might benefit from compaction
  if (tokens < 3500) {
    return {
      action: 'compact',
      reason: 'Spec could benefit from removing redundancy',
      confidence: 'medium',
    };
  }
  
  // Warning - should split
  if (tokens < 5000) {
    // Check if we have clear concerns (h2 sections)
    const h2Count = structure.sectionsByLevel.h2;
    
    if (h2Count >= 3) {
      return {
        action: 'split',
        reason: `Exceeds 3,500 token threshold with ${h2Count} concerns`,
        confidence: 'high',
      };
    } else {
      return {
        action: 'split',
        reason: 'Exceeds 3,500 token threshold',
        confidence: 'medium',
      };
    }
  }
  
  // Problem - must split
  return {
    action: 'split',
    reason: 'Critically oversized - must split immediately',
    confidence: 'high',
  };
}

/**
 * Get threshold limit for status
 */
function getThresholdLimit(level: string): number {
  switch (level) {
    case 'excellent': return 2000;
    case 'good': return 3500;
    case 'warning': return 5000;
    case 'problem': return 5000;
    default: return 2000;
  }
}

/**
 * Display analysis in human-readable format
 */
function displayAnalysis(result: AnalyzeResult, verbose?: boolean): void {
  console.log(chalk.bold.cyan(`📊 Spec Analysis: ${result.spec}`));
  console.log('');
  
  // Token count with status indicator
  const statusEmoji = result.threshold.status === 'excellent' ? '✅' :
                     result.threshold.status === 'good' ? '👍' :
                     result.threshold.status === 'warning' ? '⚠️' : '🔴';
  
  const tokenColor = result.threshold.status === 'excellent' || result.threshold.status === 'good' ? chalk.cyan :
                    result.threshold.status === 'warning' ? chalk.yellow :
                    chalk.red;
  
  console.log(chalk.bold('Token Count:'), tokenColor(result.metrics.tokens.toLocaleString()), 'tokens', statusEmoji);
  console.log(chalk.dim(`  Threshold: ${result.threshold.limit.toLocaleString()} tokens`));
  console.log(chalk.dim(`  Status: ${result.threshold.message}`));
  console.log('');
  
  // Structure metrics
  console.log(chalk.bold('Structure:'));
  console.log(`  Lines: ${chalk.cyan(result.metrics.lines.toLocaleString())}`);
  console.log(`  Sections: ${chalk.cyan(result.metrics.sections.total)} (H1:${result.metrics.sections.h1}, H2:${result.metrics.sections.h2}, H3:${result.metrics.sections.h3}, H4:${result.metrics.sections.h4})`);
  console.log(`  Code blocks: ${chalk.cyan(result.metrics.codeBlocks)}`);
  console.log(`  Max nesting: ${chalk.cyan(result.metrics.maxNesting)} levels`);
  console.log('');
  
  // Top sections by size
  if (verbose && result.structure.length > 0) {
    const topSections = result.structure
      .filter(s => s.level <= 2) // Only show h1 and h2
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);
    
    console.log(chalk.bold('Top Sections by Size:'));
    console.log('');
    
    for (let i = 0; i < topSections.length; i++) {
      const s = topSections[i];
      const percentage = Math.round((s.tokens / result.metrics.tokens) * 100);
      const indent = '  '.repeat(s.level - 1);
      
      console.log(`  ${i + 1}. ${indent}${s.section}`);
      console.log(`     ${chalk.cyan(s.tokens.toLocaleString())} tokens / ${s.lineRange[1] - s.lineRange[0] + 1} lines ${chalk.dim(`(${percentage}%)`)}`);
      console.log(chalk.dim(`     Lines ${s.lineRange[0]}-${s.lineRange[1]}`));
    }
    console.log('');
  }
  
  // Recommendation
  const actionColor = result.recommendation.action === 'none' ? chalk.green :
                     result.recommendation.action === 'compact' ? chalk.yellow :
                     result.recommendation.action === 'split' ? chalk.red :
                     chalk.blue;
  
  console.log(chalk.bold('Recommendation:'), actionColor(result.recommendation.action.toUpperCase()));
  console.log(chalk.dim(`  ${result.recommendation.reason}`));
  console.log(chalk.dim(`  Confidence: ${result.recommendation.confidence}`));
  console.log('');
  
  // Hints
  if (result.recommendation.action === 'split') {
    console.log(chalk.dim('💡 Use `lean-spec split` to partition into sub-specs'));
    console.log(chalk.dim('💡 Consider splitting by H2 sections (concerns)'));
  } else if (result.recommendation.action === 'compact') {
    console.log(chalk.dim('💡 Use `lean-spec compact` to remove redundancy'));
  }
  
  console.log('');
}
