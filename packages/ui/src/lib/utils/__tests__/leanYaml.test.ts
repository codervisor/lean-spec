import { describe, expect, it } from 'vitest';
import { parseLeanYaml } from '../../../../shared/lean-yaml-parser.js';

describe('parseLeanYaml', () => {
  it('parses LeanSpec project registry YAML structures', () => {
    const yaml = `
projects:
  - id: abc123
    name: Example Project
    path: /tmp/example
    specsDir: /tmp/example/specs
    lastAccessed: '2025-12-10T00:00:00.000Z'
    favorite: true
    color: '#ffcc00'
    description: 'Primary workspace'
  - id: def456
    name: Second Project
    path: /tmp/second
    specsDir: /tmp/second/specs
    lastAccessed: '2025-12-09T22:00:00.000Z'
    favorite: false
recentProjects:
  - abc123
  - def456
`;

    const parsed = parseLeanYaml<{ projects: any[]; recentProjects: string[] }>(yaml);

    expect(parsed.projects).toHaveLength(2);
    expect(parsed.projects[0].name).toBe('Example Project');
    expect(parsed.projects[0].favorite).toBe(true);
    expect(parsed.projects[0].lastAccessed).toBe('2025-12-10T00:00:00.000Z');
    expect(parsed.recentProjects).toEqual(['abc123', 'def456']);
  });

  it('parses simple config files with quoted values', () => {
    const yaml = `
specsDir: specs
name: 'My Project'
description: "Uses : symbols"
active: true
retries: 3
`; 

    const parsed = parseLeanYaml<Record<string, unknown>>(yaml);

    expect(parsed.specsDir).toBe('specs');
    expect(parsed.name).toBe('My Project');
    expect(parsed.description).toBe('Uses : symbols');
    expect(parsed.active).toBe(true);
    expect(parsed.retries).toBe(3);
  });

  it('throws on invalid indentation', () => {
    const broken = `
projects:
   - id: bad
`;

    expect(() => parseLeanYaml(broken)).toThrow(/indentation/i);
  });
});
