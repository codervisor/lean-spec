/**
 * Tests for markdown parser
 */
import { describe, it, expect } from 'vitest';
import {
  parseMarkdownSections,
  findSection,
  flattenSections,
  extractLines,
  removeLines,
  replaceLines,
  countLines,
  getLine,
  analyzeMarkdownStructure,
  type Section,
} from './markdown-parser.js';

describe('parseMarkdownSections', () => {
  it('should parse simple sections', () => {
    const content = `# Title
Some content

## Section 1
Content 1

## Section 2
Content 2`;

    const sections = parseMarkdownSections(content);
    
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Title');
    expect(sections[0].level).toBe(1);
    expect(sections[0].subsections).toHaveLength(2);
    expect(sections[0].subsections[0].title).toBe('Section 1');
    expect(sections[0].subsections[1].title).toBe('Section 2');
  });

  it('should handle nested sections', () => {
    const content = `# Root

## Level 2

### Level 3

#### Level 4

## Another Level 2`;

    const sections = parseMarkdownSections(content);
    
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Root');
    expect(sections[0].subsections).toHaveLength(2);
    expect(sections[0].subsections[0].subsections).toHaveLength(1);
    expect(sections[0].subsections[0].subsections[0].title).toBe('Level 3');
  });

  it('should ignore headings in code blocks', () => {
    const content = `# Title

\`\`\`
# This is not a heading
## Neither is this
\`\`\`

## Real Section`;

    const sections = parseMarkdownSections(content);
    
    expect(sections).toHaveLength(1);
    expect(sections[0].subsections).toHaveLength(1);
    expect(sections[0].subsections[0].title).toBe('Real Section');
  });

  it('should track line numbers correctly', () => {
    const content = `# Title
Line 2
Line 3
## Section 1
Line 5
Line 6
## Section 2
Line 8`;

    const sections = parseMarkdownSections(content);
    
    expect(sections[0].startLine).toBe(1);
    expect(sections[0].subsections[0].startLine).toBe(4);
    expect(sections[0].subsections[0].endLine).toBe(6);
    expect(sections[0].subsections[1].startLine).toBe(7);
  });
});

describe('findSection', () => {
  const content = `# Root

## Design

### Architecture

## Implementation`;

  const sections = parseMarkdownSections(content);

  it('should find section by exact title', () => {
    const section = findSection(sections, 'Design');
    expect(section).not.toBeNull();
    expect(section!.title).toBe('Design');
  });

  it('should find section by partial title', () => {
    const section = findSection(sections, 'arch');
    expect(section).not.toBeNull();
    expect(section!.title).toBe('Architecture');
  });

  it('should return null if not found', () => {
    const section = findSection(sections, 'NonExistent');
    expect(section).toBeNull();
  });

  it('should be case-insensitive', () => {
    const section = findSection(sections, 'DESIGN');
    expect(section).not.toBeNull();
    expect(section!.title).toBe('Design');
  });
});

describe('flattenSections', () => {
  const content = `# Root

## Level 2A

### Level 3

## Level 2B`;

  const sections = parseMarkdownSections(content);

  it('should flatten section hierarchy', () => {
    const flattened = flattenSections(sections);
    
    expect(flattened).toHaveLength(4); // Root, Level 2A, Level 3, Level 2B
    expect(flattened[0].title).toBe('Root');
    expect(flattened[1].title).toBe('Level 2A');
    expect(flattened[2].title).toBe('Level 3');
    expect(flattened[3].title).toBe('Level 2B');
  });
});

describe('extractLines', () => {
  const content = `Line 1
Line 2
Line 3
Line 4
Line 5`;

  it('should extract single line', () => {
    const result = extractLines(content, 2, 2);
    expect(result).toBe('Line 2');
  });

  it('should extract multiple lines', () => {
    const result = extractLines(content, 2, 4);
    expect(result).toBe('Line 2\nLine 3\nLine 4');
  });

  it('should extract from start', () => {
    const result = extractLines(content, 1, 2);
    expect(result).toBe('Line 1\nLine 2');
  });

  it('should extract to end', () => {
    const result = extractLines(content, 4, 5);
    expect(result).toBe('Line 4\nLine 5');
  });

  it('should throw on invalid range', () => {
    expect(() => extractLines(content, 0, 2)).toThrow('Invalid line range');
    expect(() => extractLines(content, 3, 2)).toThrow('Invalid line range');
    expect(() => extractLines(content, 1, 10)).toThrow('Invalid line range');
  });
});

describe('removeLines', () => {
  const content = `Line 1
Line 2
Line 3
Line 4
Line 5`;

  it('should remove single line', () => {
    const result = removeLines(content, 3, 3);
    expect(result).toBe('Line 1\nLine 2\nLine 4\nLine 5');
  });

  it('should remove multiple lines', () => {
    const result = removeLines(content, 2, 4);
    expect(result).toBe('Line 1\nLine 5');
  });

  it('should remove from start', () => {
    const result = removeLines(content, 1, 2);
    expect(result).toBe('Line 3\nLine 4\nLine 5');
  });

  it('should remove to end', () => {
    const result = removeLines(content, 4, 5);
    expect(result).toBe('Line 1\nLine 2\nLine 3');
  });
});

describe('replaceLines', () => {
  const content = `Line 1
Line 2
Line 3
Line 4
Line 5`;

  it('should replace single line', () => {
    const result = replaceLines(content, 3, 3, 'New Line 3');
    expect(result).toBe('Line 1\nLine 2\nNew Line 3\nLine 4\nLine 5');
  });

  it('should replace multiple lines with single line', () => {
    const result = replaceLines(content, 2, 4, 'Replacement');
    expect(result).toBe('Line 1\nReplacement\nLine 5');
  });

  it('should replace single line with multiple lines', () => {
    const result = replaceLines(content, 3, 3, 'New Line 3A\nNew Line 3B');
    expect(result).toBe('Line 1\nLine 2\nNew Line 3A\nNew Line 3B\nLine 4\nLine 5');
  });

  it('should replace multiple lines with multiple lines', () => {
    const result = replaceLines(content, 2, 4, 'New A\nNew B\nNew C');
    expect(result).toBe('Line 1\nNew A\nNew B\nNew C\nLine 5');
  });
});

describe('countLines', () => {
  it('should count lines correctly', () => {
    expect(countLines('Line 1')).toBe(1);
    expect(countLines('Line 1\nLine 2')).toBe(2);
    expect(countLines('Line 1\nLine 2\nLine 3')).toBe(3);
    expect(countLines('')).toBe(1); // Empty string is 1 line
  });
});

describe('getLine', () => {
  const content = `Line 1
Line 2
Line 3`;

  it('should get line by number', () => {
    expect(getLine(content, 1)).toBe('Line 1');
    expect(getLine(content, 2)).toBe('Line 2');
    expect(getLine(content, 3)).toBe('Line 3');
  });

  it('should throw on invalid line number', () => {
    expect(() => getLine(content, 0)).toThrow('Invalid line number');
    expect(() => getLine(content, 4)).toThrow('Invalid line number');
  });
});

describe('analyzeMarkdownStructure', () => {
  const content = `# Title

Some content

## Section 1

Content 1

\`\`\`javascript
const x = 1;
\`\`\`

### Subsection 1.1

## Section 2

\`\`\`
code block 2
\`\`\``;

  it('should analyze structure', () => {
    const structure = analyzeMarkdownStructure(content);
    
    expect(structure.lines).toBeGreaterThan(0);
    expect(structure.sections).toHaveLength(1);
    expect(structure.allSections.length).toBeGreaterThan(2);
    expect(structure.sectionsByLevel.h1).toBe(1);
    expect(structure.sectionsByLevel.h2).toBe(2);
    expect(structure.sectionsByLevel.h3).toBe(1);
    expect(structure.sectionsByLevel.total).toBe(4);
    expect(structure.codeBlocks).toBe(2);
    expect(structure.maxNesting).toBeGreaterThan(0);
  });

  it('should handle content with no sections', () => {
    const structure = analyzeMarkdownStructure('Just some text');
    
    expect(structure.lines).toBe(1);
    expect(structure.sections).toHaveLength(0);
    expect(structure.sectionsByLevel.total).toBe(0);
    expect(structure.codeBlocks).toBe(0);
  });
});
