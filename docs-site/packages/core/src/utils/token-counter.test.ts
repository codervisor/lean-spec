/**
 * Tests for TokenCounter
 * 
 * Implements spec 069: Token Counting Utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenCounter, countTokens } from './token-counter.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

describe('TokenCounter', () => {
  let counter: TokenCounter;
  let tempDir: string;

  beforeEach(async () => {
    counter = new TokenCounter();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'token-counter-test-'));
  });

  afterEach(async () => {
    counter.dispose();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('countString', () => {
    it('should count tokens in a simple string', async () => {
      const text = 'Hello world';
      const count = await counter.countString(text);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10); // Should be ~2-3 tokens
    });

    it('should count tokens in code', async () => {
      const code = 'function hello() { return "world"; }';
      const count = await counter.countString(code);
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for empty string', async () => {
      const count = await counter.countString('');
      expect(count).toBe(0);
    });

    it('should handle unicode characters', async () => {
      const text = '你好世界 🌍';
      const count = await counter.countString(text);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('countFile', () => {
    it('should count tokens in a file', async () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = '# Hello\n\nThis is a test file with some content.\n\n```js\nconst x = 1;\n```';
      await fs.writeFile(filePath, content);

      const result = await counter.countFile(filePath);
      
      expect(result.total).toBeGreaterThan(0);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe(filePath);
      expect(result.files[0].tokens).toBe(result.total);
      expect(result.files[0].lines).toBeGreaterThan(0);
    });

    it('should include detailed breakdown when requested', async () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = '---\ntitle: Test\n---\n\n# Hello\n\nThis is prose.\n\n```js\nconst x = 1;\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |';
      await fs.writeFile(filePath, content);

      const result = await counter.countFile(filePath, { detailed: true });
      
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown!.frontmatter).toBeGreaterThan(0);
      expect(result.breakdown!.prose).toBeGreaterThan(0);
      expect(result.breakdown!.code).toBeGreaterThan(0);
      expect(result.breakdown!.tables).toBeGreaterThan(0);
    });

    it('should handle empty file', async () => {
      const filePath = path.join(tempDir, 'empty.md');
      await fs.writeFile(filePath, '');

      const result = await counter.countFile(filePath);
      
      expect(result.total).toBe(0);
    });
  });

  describe('countSpec', () => {
    it('should count tokens in README.md by default', async () => {
      const specDir = path.join(tempDir, 'test-spec');
      await fs.mkdir(specDir);
      await fs.writeFile(path.join(specDir, 'README.md'), '# Test Spec\n\nSome content.');
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), '# Design\n\nDetailed design.');

      const result = await counter.countSpec(specDir);
      
      expect(result.total).toBeGreaterThan(0);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('README.md');
    });

    it('should include sub-specs when requested', async () => {
      const specDir = path.join(tempDir, 'test-spec');
      await fs.mkdir(specDir);
      await fs.writeFile(path.join(specDir, 'README.md'), '# Test Spec\n\nSome content.');
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), '# Design\n\nDetailed design.');
      await fs.writeFile(path.join(specDir, 'IMPLEMENTATION.md'), '# Implementation\n\nImplementation details.');

      const result = await counter.countSpec(specDir, { includeSubSpecs: true });
      
      expect(result.files.length).toBeGreaterThan(1);
      expect(result.files.map(f => f.path)).toContain('README.md');
      expect(result.files.map(f => f.path)).toContain('DESIGN.md');
      expect(result.files.map(f => f.path)).toContain('IMPLEMENTATION.md');
      
      // Total should be sum of all files
      const sumOfFiles = result.files.reduce((sum, f) => sum + f.tokens, 0);
      expect(result.total).toBe(sumOfFiles);
    });

    it('should handle spec with only README.md', async () => {
      const specDir = path.join(tempDir, 'test-spec');
      await fs.mkdir(specDir);
      await fs.writeFile(path.join(specDir, 'README.md'), '# Test Spec');

      const result = await counter.countSpec(specDir, { includeSubSpecs: true });
      
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('README.md');
    });

    it('should aggregate breakdown across files', async () => {
      const specDir = path.join(tempDir, 'test-spec');
      await fs.mkdir(specDir);
      await fs.writeFile(path.join(specDir, 'README.md'), '# Test\n\nProse here.\n\n```js\ncode();\n```');
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), '# Design\n\nMore prose.\n\n```js\nmorecode();\n```');

      const result = await counter.countSpec(specDir, { includeSubSpecs: true, detailed: true });
      
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown!.prose).toBeGreaterThan(0);
      expect(result.breakdown!.code).toBeGreaterThan(0);
    });

    it('should handle single file path', async () => {
      const filePath = path.join(tempDir, 'test.md');
      await fs.writeFile(filePath, '# Test');

      const result = await counter.countSpec(filePath);
      
      expect(result.total).toBeGreaterThan(0);
      expect(result.files).toHaveLength(1);
    });
  });

  describe('analyzeBreakdown', () => {
    it('should categorize frontmatter', async () => {
      const content = '---\ntitle: Test\nstatus: draft\n---\n\nContent here.';
      const breakdown = await counter.analyzeBreakdown(content);
      
      expect(breakdown.frontmatter).toBeGreaterThan(0);
      expect(breakdown.prose).toBeGreaterThan(0);
    });

    it('should categorize code blocks', async () => {
      const content = '# Test\n\nSome text.\n\n```js\nconst x = 1;\n```\n\nMore text.';
      const breakdown = await counter.analyzeBreakdown(content);
      
      expect(breakdown.code).toBeGreaterThan(0);
      expect(breakdown.prose).toBeGreaterThan(0);
    });

    it('should categorize tables', async () => {
      const content = '# Test\n\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |';
      const breakdown = await counter.analyzeBreakdown(content);
      
      expect(breakdown.tables).toBeGreaterThan(0);
      expect(breakdown.prose).toBeGreaterThan(0); // Heading
    });

    it('should handle multiple content types', async () => {
      const content = `---
title: Complex
---

# Heading

This is prose.

\`\`\`typescript
function test() {}
\`\`\`

| Col1 | Col2 |
|------|------|
| A    | B    |

More prose here.`;

      const breakdown = await counter.analyzeBreakdown(content);
      
      expect(breakdown.frontmatter).toBeGreaterThan(0);
      expect(breakdown.prose).toBeGreaterThan(0);
      expect(breakdown.code).toBeGreaterThan(0);
      expect(breakdown.tables).toBeGreaterThan(0);
    });

    it('should handle content with no frontmatter', async () => {
      const content = '# Test\n\nJust prose.';
      const breakdown = await counter.analyzeBreakdown(content);
      
      expect(breakdown.frontmatter).toBe(0);
      expect(breakdown.prose).toBeGreaterThan(0);
    });
  });

  describe('isWithinLimit', () => {
    it('should return true when within limit', () => {
      const count: any = { total: 100, files: [] };
      expect(counter.isWithinLimit(count, 200)).toBe(true);
      expect(counter.isWithinLimit(count, 100)).toBe(true);
    });

    it('should return false when over limit', () => {
      const count: any = { total: 100, files: [] };
      expect(counter.isWithinLimit(count, 50)).toBe(false);
    });
  });

  describe('formatCount', () => {
    it('should format basic count', () => {
      const count: any = { total: 1234, files: [] };
      const formatted = counter.formatCount(count);
      expect(formatted).toContain('1,234');
      expect(formatted).toContain('tokens');
    });

    it('should format verbose output with files', () => {
      const count: any = {
        total: 1234,
        files: [
          { path: 'README.md', tokens: 800, lines: 50 },
          { path: 'DESIGN.md', tokens: 434, lines: 30 },
        ],
      };
      const formatted = counter.formatCount(count, true);
      
      expect(formatted).toContain('Total: 1,234 tokens');
      expect(formatted).toContain('README.md');
      expect(formatted).toContain('800 tokens');
      expect(formatted).toContain('50 lines');
      expect(formatted).toContain('DESIGN.md');
    });

    it('should format with breakdown', () => {
      const count: any = {
        total: 1000,
        files: [],
        breakdown: {
          prose: 400,
          code: 300,
          tables: 200,
          frontmatter: 100,
        },
      };
      const formatted = counter.formatCount(count, true);
      
      expect(formatted).toContain('Content Breakdown');
      expect(formatted).toContain('Prose');
      expect(formatted).toContain('Code');
      expect(formatted).toContain('Tables');
      expect(formatted).toContain('Frontmatter');
      expect(formatted).toContain('40%'); // 400/1000
      expect(formatted).toContain('30%'); // 300/1000
    });
  });

  describe('getPerformanceIndicators', () => {
    it('should return excellent for small token counts', () => {
      const indicators = counter.getPerformanceIndicators(1500);
      expect(indicators.level).toBe('excellent');
      expect(indicators.effectiveness).toBe(100);
    });

    it('should return good for moderate token counts', () => {
      const indicators = counter.getPerformanceIndicators(2500);
      expect(indicators.level).toBe('good');
      expect(indicators.effectiveness).toBe(95);
    });

    it('should return warning for elevated token counts', () => {
      const indicators = counter.getPerformanceIndicators(4000);
      expect(indicators.level).toBe('warning');
      expect(indicators.effectiveness).toBe(85);
    });

    it('should return problem for high token counts', () => {
      const indicators = counter.getPerformanceIndicators(6000);
      expect(indicators.level).toBe('problem');
      expect(indicators.effectiveness).toBe(70);
    });

    it('should calculate cost multiplier', () => {
      const indicators = counter.getPerformanceIndicators(2400);
      expect(indicators.costMultiplier).toBeCloseTo(2.0, 1);
    });
  });
});

describe('countTokens convenience function', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'token-counter-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should count tokens in string', async () => {
    const result = await countTokens('Hello world');
    expect(result.total).toBeGreaterThan(0);
  });

  it('should count tokens in content object', async () => {
    const result = await countTokens({ content: 'Hello world' });
    expect(result.total).toBeGreaterThan(0);
  });

  it('should count tokens in file', async () => {
    const filePath = path.join(tempDir, 'test.md');
    await fs.writeFile(filePath, '# Test file');

    const result = await countTokens({ filePath });
    expect(result.total).toBeGreaterThan(0);
    expect(result.files).toHaveLength(1);
  });

  it('should count tokens in spec', async () => {
    const specDir = path.join(tempDir, 'test-spec');
    await fs.mkdir(specDir);
    await fs.writeFile(path.join(specDir, 'README.md'), '# Test Spec');

    const result = await countTokens({ specPath: specDir });
    expect(result.total).toBeGreaterThan(0);
  });
});
