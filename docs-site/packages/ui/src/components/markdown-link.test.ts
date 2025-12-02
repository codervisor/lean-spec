/**
 * Tests for MarkdownLink component
 */

import { describe, it, expect } from 'vitest';

// Extract the transformation function for testing
function transformSpecLink(href: string, currentSpecNumber?: number): string {
  // Don't transform anchor links or external URLs
  if (href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }

  // Match same-directory sub-spec links: ./FILE.md
  const sameDirectoryPattern = /^\.\/([^/]+\.md)$/;
  const sameDirectoryMatch = href.match(sameDirectoryPattern);
  
  if (sameDirectoryMatch && currentSpecNumber) {
    const subSpecFile = sameDirectoryMatch[1];
    if (subSpecFile !== 'README.md') {
      return `/specs/${currentSpecNumber}?subspec=${subSpecFile}`;
    } else {
      return `/specs/${currentSpecNumber}`;
    }
  }

  // Match internal spec links: ../NNN-spec-name/ or ../NNN-spec-name/FILE.md
  const specLinkPattern = /^\.\.\/(\d+)-[^/]+\/?([^/]+\.md)?$/;
  const match = href.match(specLinkPattern);

  if (match) {
    // Convert to number to remove leading zeros (018 -> 18)
    const specNumber = parseInt(match[1], 10);
    const subSpecFile = match[2];

    if (subSpecFile && subSpecFile !== 'README.md') {
      // Sub-spec link (e.g., DESIGN.md, IMPLEMENTATION.md)
      return `/specs/${specNumber}?subspec=${subSpecFile}`;
    } else {
      // Main spec link (README.md or just the directory)
      return `/specs/${specNumber}`;
    }
  }

  // If no pattern matches, return original href
  return href;
}

describe('transformSpecLink', () => {
  it('transforms spec directory links to /specs/NNN', () => {
    expect(transformSpecLink('../048-spec-complexity-analysis/')).toBe('/specs/48');
    expect(transformSpecLink('../066-context-economy-thresholds-refinement/')).toBe('/specs/66');
    expect(transformSpecLink('../018-spec-validation/')).toBe('/specs/18');
  });

  it('transforms spec README.md links to /specs/NNN', () => {
    expect(transformSpecLink('../048-spec-complexity-analysis/README.md')).toBe('/specs/48');
    expect(transformSpecLink('../018-spec-validation/README.md')).toBe('/specs/18');
  });

  it('transforms sub-spec links to /specs/NNN?subspec=FILE.md', () => {
    expect(transformSpecLink('../048-spec-complexity-analysis/DESIGN.md')).toBe('/specs/48?subspec=DESIGN.md');
    expect(transformSpecLink('../066-context-economy-thresholds-refinement/IMPLEMENTATION.md')).toBe('/specs/66?subspec=IMPLEMENTATION.md');
    expect(transformSpecLink('../018-spec-validation/CONFIGURATION-EXAMPLES.md')).toBe('/specs/18?subspec=CONFIGURATION-EXAMPLES.md');
  });

  it('transforms same-directory sub-spec links when currentSpecNumber is provided', () => {
    expect(transformSpecLink('./DESIGN.md', 48)).toBe('/specs/48?subspec=DESIGN.md');
    expect(transformSpecLink('./IMPLEMENTATION.md', 66)).toBe('/specs/66?subspec=IMPLEMENTATION.md');
    expect(transformSpecLink('./CONFIGURATION-EXAMPLES.md', 18)).toBe('/specs/18?subspec=CONFIGURATION-EXAMPLES.md');
    expect(transformSpecLink('./VALIDATION-RULES.md', 18)).toBe('/specs/18?subspec=VALIDATION-RULES.md');
  });

  it('leaves same-directory links unchanged when currentSpecNumber is not provided', () => {
    expect(transformSpecLink('./DESIGN.md')).toBe('./DESIGN.md');
    expect(transformSpecLink('./README.md')).toBe('./README.md');
  });

  it('transforms same-directory README.md to main spec', () => {
    expect(transformSpecLink('./README.md', 18)).toBe('/specs/18');
  });

  it('leaves anchor links unchanged', () => {
    expect(transformSpecLink('#heading')).toBe('#heading');
    expect(transformSpecLink('#section-name')).toBe('#section-name');
  });

  it('leaves external URLs unchanged', () => {
    expect(transformSpecLink('https://example.com')).toBe('https://example.com');
    expect(transformSpecLink('http://example.com')).toBe('http://example.com');
  });

  it('leaves non-matching relative paths unchanged', () => {
    expect(transformSpecLink('../other/path')).toBe('../other/path');
  });
});
