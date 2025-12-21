/**
 * Project test fixtures
 *
 * Utilities for creating and managing test projects.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Options for creating a test project
 */
export interface TestProjectOptions {
  name?: string;
  specs?: TestSpecFixture[];
}

/**
 * Fixture for creating a test spec
 */
export interface TestSpecFixture {
  name: string;
  title?: string;
  status?: 'planned' | 'in-progress' | 'complete' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  assignee?: string;
  dependsOn?: string[];
  content?: string;
}

/**
 * Information about a created test project
 */
export interface TestProject {
  path: string;
  specsDir: string;
  cleanup: () => Promise<void>;
}

/**
 * Generate spec content from a fixture
 */
function generateSpecContent(fixture: TestSpecFixture): string {
  const frontmatter: string[] = ['---'];

  frontmatter.push(`title: "${fixture.title || fixture.name}"`);
  frontmatter.push(`status: ${fixture.status || 'planned'}`);
  frontmatter.push(`created: 2025-01-01`);

  if (fixture.priority) {
    frontmatter.push(`priority: ${fixture.priority}`);
  }

  if (fixture.tags && fixture.tags.length > 0) {
    frontmatter.push(`tags: [${fixture.tags.map((t) => `"${t}"`).join(', ')}]`);
  }

  if (fixture.assignee) {
    frontmatter.push(`assignee: "${fixture.assignee}"`);
  }

  if (fixture.dependsOn && fixture.dependsOn.length > 0) {
    frontmatter.push(
      `depends_on: [${fixture.dependsOn.map((d) => `"${d}"`).join(', ')}]`
    );
  }

  frontmatter.push('---');
  frontmatter.push('');

  const content = fixture.content || `# ${fixture.title || fixture.name}\n\nTest spec content.`;

  return frontmatter.join('\n') + content;
}

/**
 * Create a temporary test project with optional specs
 */
export async function createTestProject(
  options: TestProjectOptions = {}
): Promise<TestProject> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'leanspec-test-'));
  const specsDir = path.join(tempDir, 'specs');

  await fs.mkdir(specsDir, { recursive: true });

  // Create a minimal .lean-spec directory (marker for project detection)
  const leanSpecDir = path.join(tempDir, '.lean-spec');
  await fs.mkdir(leanSpecDir, { recursive: true });

  // Create specs if provided
  if (options.specs) {
    for (let i = 0; i < options.specs.length; i++) {
      const fixture = options.specs[i];
      const specNumber = String(i + 1).padStart(3, '0');
      const specDir = path.join(specsDir, `${specNumber}-${fixture.name}`);

      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(
        path.join(specDir, 'README.md'),
        generateSpecContent(fixture)
      );
    }
  }

  return {
    path: tempDir,
    specsDir,
    cleanup: async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    },
  };
}

/**
 * Default test fixtures for common test scenarios
 */
export const defaultTestFixtures: TestSpecFixture[] = [
  {
    name: 'test-spec-one',
    title: 'Test Spec One',
    status: 'planned',
    priority: 'medium',
    tags: ['api', 'test'],
  },
  {
    name: 'test-spec-two',
    title: 'Test Spec Two',
    status: 'in-progress',
    priority: 'high',
    tags: ['api'],
    assignee: 'tester',
  },
  {
    name: 'test-spec-three',
    title: 'Test Spec Three',
    status: 'complete',
    priority: 'low',
    tags: ['test'],
  },
];

/**
 * Fixtures for testing dependencies
 */
export const dependencyTestFixtures: TestSpecFixture[] = [
  {
    name: 'base-feature',
    title: 'Base Feature',
    status: 'complete',
    priority: 'high',
    tags: ['core'],
  },
  {
    name: 'dependent-feature',
    title: 'Dependent Feature',
    status: 'in-progress',
    priority: 'medium',
    tags: ['feature'],
    dependsOn: ['001-base-feature'],
  },
  {
    name: 'another-dependent',
    title: 'Another Dependent',
    status: 'planned',
    priority: 'low',
    tags: ['feature'],
    dependsOn: ['001-base-feature', '002-dependent-feature'],
  },
];
