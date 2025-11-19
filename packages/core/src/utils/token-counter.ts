/**
 * Token counting utilities for LLM context management
 * 
 * Implements spec 069: Token Counting Utilities
 * 
 * Uses tiktoken (official OpenAI tokenizer) for exact token counts.
 * Token count is the primary metric for Context Economy because:
 * - Predicts AI performance better than line count
 * - Research shows 39% performance drop in multi-turn contexts
 * - Quality degradation starts well before 50K token limits
 * 
 * See spec 066 for research findings and threshold rationale.
 */

// Lazy import tiktoken to avoid WASM loading issues in Next.js
let encoding: any = null;
async function getEncoding() {
  if (!encoding) {
    const { encoding_for_model } = await import('tiktoken');
    encoding = encoding_for_model('gpt-4');
  }
  return encoding;
}
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';

export interface TokenCount {
  total: number;
  files: {
    path: string;
    tokens: number;
    lines?: number;
  }[];
  breakdown?: {
    code: number;      // Tokens in code blocks
    prose: number;     // Tokens in prose
    tables: number;    // Tokens in tables
    frontmatter: number; // Tokens in frontmatter
  };
}

export interface TokenCounterOptions {
  detailed?: boolean;    // Include breakdown by file and type
  includeSubSpecs?: boolean; // Count sub-spec files
}

/**
 * Token counter using tiktoken for exact token counts
 */
export class TokenCounter {
  private encoding: any = null;

  async getEncoding() {
    if (!this.encoding) {
      const { encoding_for_model } = await import('tiktoken');
      this.encoding = encoding_for_model('gpt-4');
    }
    return this.encoding;
  }

  /**
   * Clean up resources (important to prevent memory leaks)
   */
  dispose(): void {
    if (this.encoding) {
      this.encoding.free();
    }
  }

  /**
   * Count tokens in a string
   */
  async countString(text: string): Promise<number> {
    const encoding = await this.getEncoding();
    const tokens = encoding.encode(text);
    return tokens.length;
  }

  /**
   * Count tokens in content (convenience method for analyze command)
   * Alias for countString - provided for clarity in command usage
   */
  async countTokensInContent(content: string): Promise<number> {
    return this.countString(content);
  }

  /**
   * Count tokens in a single file
   */
  async countFile(filePath: string, options: TokenCounterOptions = {}): Promise<TokenCount> {
    const content = await fs.readFile(filePath, 'utf-8');
    const tokens = await this.countString(content);
    const lines = content.split('\n').length;

    const result: TokenCount = {
      total: tokens,
      files: [{
        path: filePath,
        tokens,
        lines,
      }],
    };

    if (options.detailed) {
      result.breakdown = await this.analyzeBreakdown(content);
    }

    return result;
  }

  /**
   * Count tokens in a spec (including sub-specs if requested)
   */
  async countSpec(specPath: string, options: TokenCounterOptions = {}): Promise<TokenCount> {
    // Determine if specPath is a directory or file
    const stats = await fs.stat(specPath);
    
    if (stats.isFile()) {
      // Single file - count it
      return this.countFile(specPath, options);
    }

    // Directory - find all markdown files
    const files = await fs.readdir(specPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    // Always include README.md if it exists
    const filesToCount: string[] = [];
    if (mdFiles.includes('README.md')) {
      filesToCount.push('README.md');
    }

    // Include sub-specs if requested
    if (options.includeSubSpecs) {
      mdFiles.forEach(f => {
        if (f !== 'README.md') {
          filesToCount.push(f);
        }
      });
    }

    // Count tokens for each file
    const fileCounts: TokenCount['files'] = [];
    let totalTokens = 0;
    let totalBreakdown: TokenCount['breakdown'] | undefined;

    if (options.detailed) {
      totalBreakdown = {
        code: 0,
        prose: 0,
        tables: 0,
        frontmatter: 0,
      };
    }

    for (const file of filesToCount) {
      const filePath = path.join(specPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const tokens = await this.countString(content);
      const lines = content.split('\n').length;

      fileCounts.push({
        path: file,
        tokens,
        lines,
      });

      totalTokens += tokens;

      if (options.detailed && totalBreakdown) {
        const breakdown = await this.analyzeBreakdown(content);
        totalBreakdown.code += breakdown.code;
        totalBreakdown.prose += breakdown.prose;
        totalBreakdown.tables += breakdown.tables;
        totalBreakdown.frontmatter += breakdown.frontmatter;
      }
    }

    return {
      total: totalTokens,
      files: fileCounts,
      breakdown: totalBreakdown,
    };
  }

  /**
   * Analyze token breakdown by content type
   */
  async analyzeBreakdown(content: string): Promise<NonNullable<TokenCount['breakdown']>> {
    const breakdown = {
      code: 0,
      prose: 0,
      tables: 0,
      frontmatter: 0,
    };

    // Parse frontmatter
    let body = content;
    let frontmatterContent = '';
    
    try {
      const parsed = matter(content);
      body = parsed.content;
      frontmatterContent = parsed.matter;
      breakdown.frontmatter = await this.countString(frontmatterContent);
    } catch {
      // No frontmatter or parsing error
    }

    // Track what we're in
    let inCodeBlock = false;
    let inTable = false;
    const lines = body.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track code blocks
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        breakdown.code += await this.countString(line + '\n');
        continue;
      }

      if (inCodeBlock) {
        breakdown.code += await this.countString(line + '\n');
        continue;
      }

      // Track tables (lines with pipes and separators)
      const isTableSeparator = trimmed.includes('|') && /[-:]{3,}/.test(trimmed);
      const isTableRow = trimmed.includes('|') && trimmed.startsWith('|');
      
      if (isTableSeparator || (inTable && isTableRow)) {
        inTable = true;
        breakdown.tables += await this.countString(line + '\n');
        continue;
      } else if (inTable && !isTableRow) {
        inTable = false;
      }

      // Everything else is prose
      breakdown.prose += await this.countString(line + '\n');
    }

    return breakdown;
  }

  /**
   * Check if content fits within token limit
   */
  isWithinLimit(count: TokenCount, limit: number): boolean {
    return count.total <= limit;
  }

  /**
   * Format token count for display
   */
  formatCount(count: TokenCount, verbose: boolean = false): string {
    if (!verbose) {
      return `${count.total.toLocaleString()} tokens`;
    }

    const lines: string[] = [
      `Total: ${count.total.toLocaleString()} tokens`,
      '',
      'Files:',
    ];

    for (const file of count.files) {
      const lineInfo = file.lines ? ` (${file.lines} lines)` : '';
      lines.push(`  ${file.path}: ${file.tokens.toLocaleString()} tokens${lineInfo}`);
    }

    if (count.breakdown) {
      const b = count.breakdown;
      const total = b.code + b.prose + b.tables + b.frontmatter;
      
      lines.push('');
      lines.push('Content Breakdown:');
      lines.push(`  Prose:       ${b.prose.toLocaleString()} tokens (${Math.round(b.prose / total * 100)}%)`);
      lines.push(`  Code:        ${b.code.toLocaleString()} tokens (${Math.round(b.code / total * 100)}%)`);
      lines.push(`  Tables:      ${b.tables.toLocaleString()} tokens (${Math.round(b.tables / total * 100)}%)`);
      lines.push(`  Frontmatter: ${b.frontmatter.toLocaleString()} tokens (${Math.round(b.frontmatter / total * 100)}%)`);
    }

    return lines.join('\n');
  }

  /**
   * Get performance indicators based on token count
   * Based on research from spec 066
   */
  getPerformanceIndicators(tokenCount: number): {
    level: 'excellent' | 'good' | 'warning' | 'problem';
    costMultiplier: number;
    effectiveness: number; // Estimated AI effectiveness (0-100%)
    recommendation: string;
  } {
    const baselineTokens = 1200;
    const costMultiplier = Math.round((tokenCount / baselineTokens) * 10) / 10;

    // Thresholds from spec 066 (hypothesis values)
    if (tokenCount < 2000) {
      return {
        level: 'excellent',
        costMultiplier,
        effectiveness: 100,
        recommendation: 'Optimal size for Context Economy',
      };
    } else if (tokenCount < 3500) {
      return {
        level: 'good',
        costMultiplier,
        effectiveness: 95,
        recommendation: 'Good size, no action needed',
      };
    } else if (tokenCount < 5000) {
      return {
        level: 'warning',
        costMultiplier,
        effectiveness: 85,
        recommendation: 'Consider simplification or sub-specs',
      };
    } else {
      return {
        level: 'problem',
        costMultiplier,
        effectiveness: 70,
        recommendation: 'Should split - elevated token count',
      };
    }
  }
}

/**
 * Convenience function to create, use, and dispose of a TokenCounter
 */
export async function countTokens(
  input: string | { content: string } | { filePath: string } | { specPath: string },
  options?: TokenCounterOptions
): Promise<TokenCount> {
  const counter = new TokenCounter();
  
  try {
    if (typeof input === 'string') {
      // String content
      return {
        total: await counter.countString(input),
        files: [],
      };
    } else if ('content' in input) {
      // Content object
      return {
        total: await counter.countString(input.content),
        files: [],
      };
    } else if ('filePath' in input) {
      // File path
      return await counter.countFile(input.filePath, options);
    } else if ('specPath' in input) {
      // Spec path (directory)
      return await counter.countSpec(input.specPath, options);
    }
    
    throw new Error('Invalid input type');
  } finally {
    counter.dispose();
  }
}
