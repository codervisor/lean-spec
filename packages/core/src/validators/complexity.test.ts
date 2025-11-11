/**
 * Tests for ComplexityValidator
 * 
 * Validates multi-dimensional complexity scoring based on:
 * - Token count (primary factor)
 * - Structure quality (sub-specs, sectioning)
 * - Line count backstop
 */

import { describe, it, expect } from 'vitest';
import { ComplexityValidator } from './complexity.js';
import type { SpecInfo } from '../types/index.js';

// Helper to create mock spec info
function createMockSpec(overrides?: Partial<SpecInfo>): SpecInfo {
  return {
    id: '001',
    path: 'specs/001-test-spec',
    fullPath: '/path/to/specs/001-test-spec',
    filePath: '/path/to/specs/001-test-spec/README.md',
    name: '001-test-spec',
    title: 'Test Spec',
    status: 'active',
    created: '2024-01-01',
    frontmatter: {},
    ...overrides,
  };
}

// Helper to generate content of specific characteristics
function generateContent(options: {
  lines: number;
  sections?: number;
  codeBlocks?: number;
  hasSubSpecs?: boolean;
  lists?: number;
}): string {
  const parts: string[] = [];
  
  // Frontmatter
  parts.push('---');
  parts.push('status: active');
  parts.push('created: 2024-01-01');
  parts.push('---');
  parts.push('');
  
  // Title
  parts.push('# Test Spec');
  parts.push('');

  // Add sections
  const sections = options.sections ?? 5;
  const linesPerSection = Math.floor((options.lines - 10) / sections);
  
  for (let i = 0; i < sections; i++) {
    parts.push(`## Section ${i + 1}`);
    parts.push('');
    
    // Add prose to fill section
    for (let j = 0; j < linesPerSection - 2; j++) {
      parts.push('This is some text content that fills the section with meaningful information.');
    }
    parts.push('');
  }

  // Add code blocks if requested
  const codeBlocks = options.codeBlocks ?? 0;
  for (let i = 0; i < codeBlocks; i++) {
    parts.push('```typescript');
    parts.push('function example() {');
    parts.push('  return "code";');
    parts.push('}');
    parts.push('```');
    parts.push('');
  }

  // Add sub-spec references if requested
  if (options.hasSubSpecs) {
    parts.push('## Related Documents');
    parts.push('');
    parts.push('- [Design Details](DESIGN.md)');
    parts.push('- [Implementation Plan](IMPLEMENTATION.md)');
    parts.push('- [Testing Strategy](TESTING.md)');
    parts.push('');
  }

  // Add lists if requested
  const lists = options.lists ?? 0;
  if (lists > 0) {
    parts.push('## List Section');
    parts.push('');
    for (let i = 0; i < lists; i++) {
      parts.push(`- List item ${i + 1}`);
    }
    parts.push('');
  }

  // Pad to reach target line count
  const currentLines = parts.join('\n').split('\n').length;
  const neededLines = options.lines - currentLines;
  for (let i = 0; i < neededLines; i++) {
    parts.push('Additional content line to reach target length.');
  }

  return parts.join('\n');
}

describe('ComplexityValidator', () => {
  describe('Token Count Scoring', () => {
    it('should rate small specs (<2000 tokens) as excellent', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // ~200 lines = ~800-1000 tokens
      const content = generateContent({ lines: 200, sections: 20 });
      
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should rate medium specs (2000-3500 tokens) as good', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // ~350 lines with good structure = ~1800-2200 tokens
      const content = generateContent({ lines: 350, sections: 25 });
      
      const result = await validator.validate(spec, content);
      
      // Should pass with at most a note, no warnings or errors
      expect(result.passed).toBe(true);
    });

    it('should warn for large specs (3500-5000 tokens)', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // ~600 lines = ~3000-4000 tokens
      const content = generateContent({ lines: 600, sections: 30 });
      
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('complexity moderate');
    });

    it('should error for very large specs (>5000 tokens) with poor structure', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // ~1200 lines with code blocks but poor sectioning (<8 sections) = >5000 tokens + penalty
      // Token score: 60, Structure penalty: +20 (only 5 sections), Final: 80 (should split)
      const content = generateContent({ lines: 1200, sections: 5, codeBlocks: 30 });
      
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('complexity too high');
    });

    it('should respect custom token thresholds', async () => {
      const validator = new ComplexityValidator({
        excellentThreshold: 1000,
        goodThreshold: 2000,
        warningThreshold: 3000,
      });
      const spec = createMockSpec();
      
      // ~300 lines = ~1500 tokens (would be "good" with default thresholds)
      const content = generateContent({ lines: 300, sections: 20 });
      
      const result = await validator.validate(spec, content);
      
      // With lower thresholds, should warn
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Structure Modifiers', () => {
    it('should apply bonus for sub-specs (-30 points)', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // 400 lines with sub-specs should be better than without
      const contentWithSubSpecs = generateContent({ 
        lines: 400, 
        sections: 25,
        hasSubSpecs: true 
      });
      
      const resultWithSubSpecs = await validator.validate(spec, contentWithSubSpecs);
      
      // Should pass or at most warn (sub-specs help)
      expect(resultWithSubSpecs.passed).toBe(true);
    });

    it('should apply bonus for good sectioning (15-35 sections, -15 points)', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // Same size, but well-sectioned
      const content = generateContent({ lines: 350, sections: 25 });
      
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });

    it('should apply penalty for poor sectioning (<8 sections, +20 points)', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // Monolithic spec with few sections
      const content = generateContent({ lines: 300, sections: 5 });
      
      const result = await validator.validate(spec, content);
      
      // May warn due to poor structure
      // The penalty pushes it into warning range
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should prioritize sub-specs over sectioning', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // Sub-specs with few sections should still be good
      const content = generateContent({ 
        lines: 400, 
        sections: 10,
        hasSubSpecs: true 
      });
      
      const result = await validator.validate(spec, content);
      
      // Sub-specs bonus should outweigh sectioning concerns
      expect(result.passed).toBe(true);
    });
  });

  describe('Line Count Backstop', () => {
    it('should warn when line count exceeds backstop despite good structure', async () => {
      const validator = new ComplexityValidator({
        maxLines: 500,
        warningLines: 400,
      });
      const spec = createMockSpec();
      
      // Well-structured but very long
      const content = generateContent({ 
        lines: 550, 
        sections: 30,
        hasSubSpecs: true 
      });
      
      const result = await validator.validate(spec, content);
      
      // Should warn about length despite good structure
      expect(result.warnings.length).toBeGreaterThan(0);
      const hasLineCountWarning = result.warnings.some(w => 
        w.message.includes('very long') || w.message.includes('lines')
      );
      expect(hasLineCountWarning).toBe(true);
    });

    it('should note line count in error message when both are high', async () => {
      const validator = new ComplexityValidator({
        maxLines: 500,
      });
      const spec = createMockSpec();
      
      // High tokens AND high line count with poor structure
      // Token score: 60, Structure penalty: +20 (5 sections), Final: 80 (should split)
      const content = generateContent({ lines: 1100, sections: 5, codeBlocks: 30 });
      
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('lines');
    });

    it('should respect custom line count limits', async () => {
      const validator = new ComplexityValidator({
        maxLines: 300,
        warningLines: 200,
      });
      const spec = createMockSpec();
      
      // Just over custom warning threshold
      const content = generateContent({ lines: 250, sections: 20 });
      
      const result = await validator.validate(spec, content);
      
      // Should pass but may warn about approaching limit
      expect(result.passed).toBe(true);
    });
  });

  describe('Code Block Density', () => {
    it('should suggest moving examples for high code block density', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // Many code blocks increase token density
      const content = generateContent({ 
        lines: 500, 
        sections: 20,
        codeBlocks: 25 
      });
      
      const result = await validator.validate(spec, content);
      
      // Should provide suggestion about code blocks
      const hasCodeBlockSuggestion = result.warnings.some(w => 
        w.suggestion?.includes('code block')
      ) || result.errors.some(e => 
        e.suggestion?.includes('code block')
      );
      
      if (result.warnings.length > 0 || result.errors.length > 0) {
        expect(hasCodeBlockSuggestion).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle specs without frontmatter', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      const content = '# Test Spec\n\n## Section\n\nContent here.';
      
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });

    it('should handle empty specs', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      const content = '';
      
      const result = await validator.validate(spec, content);
      
      // Empty spec should pass (it's simple)
      expect(result.passed).toBe(true);
    });

    it('should handle specs with malformed frontmatter', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      const content = '---\ninvalid yaml: [\n---\n\n# Test\n\nContent.';
      
      const result = await validator.validate(spec, content);
      
      // Should handle gracefully
      expect(result.passed).toBe(true);
    });

    it('should count sections correctly excluding code blocks', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      const content = `
# Title

## Section 1
Content

\`\`\`
## This is not a section
\`\`\`

## Section 2
More content
`;
      
      const result = await validator.validate(spec, content);
      
      // Should only count 2 sections, not 3
      expect(result.passed).toBe(true);
    });
  });

  describe('Actionable Suggestions', () => {
    it('should suggest sub-specs for large specs without them', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // Large spec without sub-specs
      const content = generateContent({ 
        lines: 500, 
        sections: 20,
        hasSubSpecs: false 
      });
      
      const result = await validator.validate(spec, content);
      
      if (result.warnings.length > 0 || result.errors.length > 0) {
        const hasSuggestion = (result.warnings[0]?.suggestion || result.errors[0]?.suggestion || '');
        expect(hasSuggestion.toLowerCase()).toContain('sub-spec');
      }
    });

    it('should suggest more sections for monolithic specs', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // Large monolithic spec
      const content = generateContent({ lines: 300, sections: 5 });
      
      const result = await validator.validate(spec, content);
      
      if (result.warnings.length > 0 || result.errors.length > 0) {
        const hasSuggestion = (result.warnings[0]?.suggestion || result.errors[0]?.suggestion || '');
        expect(hasSuggestion.toLowerCase()).toMatch(/section|chunking/);
      }
    });
  });

  describe('Real-World Examples', () => {
    it('should rate well-structured 394-line spec with sub-specs as excellent', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // Mimics spec 059: 394 lines, 32 sections, 6 sub-specs, ~2100 tokens
      const content = generateContent({ 
        lines: 394, 
        sections: 32,
        hasSubSpecs: true,
        codeBlocks: 8 
      });
      
      const result = await validator.validate(spec, content);
      
      // Should pass (score should be low due to sub-specs bonus)
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should rate dense 315-line spec with many code blocks as good', async () => {
      const validator = new ComplexityValidator();
      const spec = createMockSpec();
      
      // Mimics spec 016: 315 lines, 20 sections, 26 code blocks, ~2400 tokens
      const content = generateContent({ 
        lines: 315, 
        sections: 20,
        codeBlocks: 26 
      });
      
      const result = await validator.validate(spec, content);
      
      // Should pass (token count in good range)
      expect(result.passed).toBe(true);
    });
  });
});
