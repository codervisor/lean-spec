/**
 * Markdown parser for programmatic spec management
 * 
 * Implements spec 059: Programmatic Spec Management
 * 
 * This module provides mechanical parsing of markdown structure:
 * - Section detection (headings and their line ranges)
 * - Line extraction/removal/replacement
 * - Basic structure analysis
 * 
 * NO semantic analysis - just mechanical operations on text
 */

/**
 * Represents a section in the markdown document
 */
export interface Section {
  /** Section title (without the # prefix) */
  title: string;
  /** Heading level (1-6) */
  level: number;
  /** Start line number (1-indexed) */
  startLine: number;
  /** End line number (1-indexed, inclusive) */
  endLine: number;
  /** Line count */
  lineCount: number;
  /** Direct subsections */
  subsections: Section[];
}

/**
 * Parse markdown content and extract section structure
 */
export function parseMarkdownSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  const sectionStack: Section[] = [];
  
  let inCodeBlock = false;
  let currentLineNum = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentLineNum = i + 1;
    
    // Track code blocks to ignore headings inside them
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    
    if (inCodeBlock) {
      continue;
    }
    
    // Detect headings (ATX-style: # heading)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      
      // Close previous sections at same or higher level
      while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= level) {
        const closedSection = sectionStack.pop()!;
        closedSection.endLine = currentLineNum - 1;
        closedSection.lineCount = closedSection.endLine - closedSection.startLine + 1;
      }
      
      // Create new section
      const newSection: Section = {
        title,
        level,
        startLine: currentLineNum,
        endLine: lines.length, // Will be updated when section closes
        lineCount: 0, // Will be calculated when section closes
        subsections: [],
      };
      
      // Add to parent or root
      if (sectionStack.length > 0) {
        sectionStack[sectionStack.length - 1].subsections.push(newSection);
      } else {
        sections.push(newSection);
      }
      
      sectionStack.push(newSection);
    }
  }
  
  // Close remaining sections
  while (sectionStack.length > 0) {
    const closedSection = sectionStack.pop()!;
    closedSection.endLine = lines.length;
    closedSection.lineCount = closedSection.endLine - closedSection.startLine + 1;
  }
  
  return sections;
}

/**
 * Find a section by title (case-insensitive, partial match)
 */
export function findSection(sections: Section[], titlePattern: string): Section | null {
  const pattern = titlePattern.toLowerCase();
  
  for (const section of sections) {
    if (section.title.toLowerCase().includes(pattern)) {
      return section;
    }
    
    // Search subsections recursively
    const found = findSection(section.subsections, titlePattern);
    if (found) {
      return found;
    }
  }
  
  return null;
}

/**
 * Flatten section tree to array (depth-first)
 */
export function flattenSections(sections: Section[]): Section[] {
  const result: Section[] = [];
  
  for (const section of sections) {
    result.push(section);
    result.push(...flattenSections(section.subsections));
  }
  
  return result;
}

/**
 * Extract lines from content
 * @param content Full markdown content
 * @param startLine Start line (1-indexed, inclusive)
 * @param endLine End line (1-indexed, inclusive)
 */
export function extractLines(content: string, startLine: number, endLine: number): string {
  const lines = content.split('\n');
  
  // Validate bounds
  if (startLine < 1 || endLine < startLine || startLine > lines.length || endLine > lines.length) {
    throw new Error(`Invalid line range: ${startLine}-${endLine}`);
  }
  
  // Extract (convert to 0-indexed)
  const extracted = lines.slice(startLine - 1, endLine);
  return extracted.join('\n');
}

/**
 * Remove lines from content
 * @param content Full markdown content
 * @param startLine Start line (1-indexed, inclusive)
 * @param endLine End line (1-indexed, inclusive)
 */
export function removeLines(content: string, startLine: number, endLine: number): string {
  const lines = content.split('\n');
  
  // Validate bounds
  if (startLine < 1 || endLine < startLine || startLine > lines.length) {
    throw new Error(`Invalid line range: ${startLine}-${endLine}`);
  }
  
  // Remove (convert to 0-indexed)
  lines.splice(startLine - 1, endLine - startLine + 1);
  return lines.join('\n');
}

/**
 * Replace lines in content
 * @param content Full markdown content
 * @param startLine Start line (1-indexed, inclusive)
 * @param endLine End line (1-indexed, inclusive)
 * @param replacement Replacement text (can be multi-line)
 */
export function replaceLines(content: string, startLine: number, endLine: number, replacement: string): string {
  const lines = content.split('\n');
  
  // Validate bounds
  if (startLine < 1 || endLine < startLine || startLine > lines.length) {
    throw new Error(`Invalid line range: ${startLine}-${endLine}`);
  }
  
  // Split replacement into lines
  const replacementLines = replacement.split('\n');
  
  // Replace (convert to 0-indexed)
  lines.splice(startLine - 1, endLine - startLine + 1, ...replacementLines);
  return lines.join('\n');
}

/**
 * Count lines in content
 */
export function countLines(content: string): number {
  return content.split('\n').length;
}

/**
 * Get line at specific line number (1-indexed)
 */
export function getLine(content: string, lineNumber: number): string {
  const lines = content.split('\n');
  
  if (lineNumber < 1 || lineNumber > lines.length) {
    throw new Error(`Invalid line number: ${lineNumber}`);
  }
  
  return lines[lineNumber - 1];
}

/**
 * Parse markdown structure for analysis
 */
export interface MarkdownStructure {
  /** Total line count */
  lines: number;
  /** Section hierarchy */
  sections: Section[];
  /** Flattened sections */
  allSections: Section[];
  /** Section count by level */
  sectionsByLevel: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
    total: number;
  };
  /** Code block count */
  codeBlocks: number;
  /** Maximum nesting depth */
  maxNesting: number;
}

/**
 * Analyze markdown structure
 */
export function analyzeMarkdownStructure(content: string): MarkdownStructure {
  const lines = content.split('\n');
  const sections = parseMarkdownSections(content);
  const allSections = flattenSections(sections);
  
  // Count sections by level
  const levelCounts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0, total: 0 };
  for (const section of allSections) {
    levelCounts[`h${section.level}` as keyof typeof levelCounts]++;
    levelCounts.total++;
  }
  
  // Count code blocks
  let codeBlocks = 0;
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      if (!inCodeBlock) {
        codeBlocks++;
      }
      inCodeBlock = !inCodeBlock;
    }
  }
  
  // Calculate max nesting
  let maxNesting = 0;
  function calculateNesting(secs: Section[], depth: number): void {
    for (const section of secs) {
      maxNesting = Math.max(maxNesting, depth);
      calculateNesting(section.subsections, depth + 1);
    }
  }
  calculateNesting(sections, 1);
  
  return {
    lines: lines.length,
    sections,
    allSections,
    sectionsByLevel: levelCounts,
    codeBlocks,
    maxNesting,
  };
}
