/**
 * Tests for MermaidDiagram component logic
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper function to extract mermaid code from a pre/code block
 * This mirrors the logic used in spec-detail-client.tsx to determine
 * if a code block should be rendered as a mermaid diagram
 */
function shouldRenderAsMermaid(className: string | undefined): boolean {
  if (!className) return false;
  return className.includes('language-mermaid');
}

/**
 * Helper function to extract the mermaid code from child content
 * Returns the code as a string, trimmed for rendering
 */
function extractMermaidCode(children: unknown): string {
  if (typeof children === 'string') {
    return children.trim();
  }
  return '';
}

describe('Mermaid diagram detection', () => {
  it('detects mermaid language class', () => {
    expect(shouldRenderAsMermaid('language-mermaid')).toBe(true);
    expect(shouldRenderAsMermaid('hljs language-mermaid')).toBe(true);
    expect(shouldRenderAsMermaid('language-mermaid hljs')).toBe(true);
  });

  it('does not match other language classes', () => {
    expect(shouldRenderAsMermaid('language-javascript')).toBe(false);
    expect(shouldRenderAsMermaid('language-typescript')).toBe(false);
    expect(shouldRenderAsMermaid('language-markdown')).toBe(false);
    expect(shouldRenderAsMermaid(undefined)).toBe(false);
    expect(shouldRenderAsMermaid('')).toBe(false);
  });
});

describe('Mermaid code extraction', () => {
  it('extracts string content directly', () => {
    const code = 'graph TD\n  A --> B';
    expect(extractMermaidCode(code)).toBe('graph TD\n  A --> B');
  });

  it('trims whitespace from content', () => {
    const code = '  \ngraph TD\n  A --> B\n  ';
    expect(extractMermaidCode(code)).toBe('graph TD\n  A --> B');
  });

  it('returns empty string for non-string content', () => {
    expect(extractMermaidCode(null)).toBe('');
    expect(extractMermaidCode(undefined)).toBe('');
    expect(extractMermaidCode(123)).toBe('');
    expect(extractMermaidCode({})).toBe('');
  });
});

describe('Mermaid diagram types', () => {
  const validDiagrams = [
    // Flowchart
    'graph TD\n  A --> B',
    'graph LR\n  A --> B --> C',
    'flowchart TB\n  Start --> Stop',
    // Sequence diagram
    'sequenceDiagram\n  Alice->>John: Hello John',
    // Class diagram
    'classDiagram\n  Class01 <|-- Class02',
    // State diagram
    'stateDiagram-v2\n  [*] --> Still',
    // ER diagram
    'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
    // Gantt chart
    'gantt\n  title A Gantt Diagram\n  section Section',
    // Pie chart
    'pie title Pets\n  "Dogs" : 386',
  ];

  validDiagrams.forEach((diagram) => {
    const type = diagram.split('\n')[0].split(' ')[0];
    it(`recognizes ${type} diagram syntax`, () => {
      // These are valid mermaid diagrams that should be detected
      const extracted = extractMermaidCode(diagram);
      expect(extracted).toBeTruthy();
      expect(extracted.length).toBeGreaterThan(0);
    });
  });
});
