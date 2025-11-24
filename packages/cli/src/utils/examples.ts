/**
 * Example project templates for tutorials
 */

export interface ExampleMetadata {
  name: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tutorial: string;
  tutorialUrl: string;
  tech: string[];
  files: number;
  lines: number;
}

export const EXAMPLES: Record<string, ExampleMetadata> = {
  'dark-theme': {
    name: 'dark-theme',
    title: 'Dark Theme Support',
    description: 'Add dark theme support to a professional admin dashboard with charts',
    difficulty: 'beginner',
    tutorial: 'Your First Spec with AI',
    tutorialUrl: 'https://leanspec.dev/docs/tutorials/first-spec-with-ai',
    tech: ['HTML', 'CSS', 'JavaScript', 'Chart.js', 'Express.js'],
    files: 6,
    lines: 420,
  },
  'dashboard-widgets': {
    name: 'dashboard-widgets',
    title: 'Dashboard Widgets',
    description: 'Add three new widgets to an analytics dashboard',
    difficulty: 'intermediate',
    tutorial: 'Managing Multiple Features',
    tutorialUrl: 'https://leanspec.dev/docs/tutorials/multiple-features',
    tech: ['React', 'Vite'],
    files: 17,
    lines: 300,
  },
  'api-refactor': {
    name: 'api-refactor',
    title: 'API Client Refactor',
    description: 'Extract reusable API client from monolithic code',
    difficulty: 'intermediate',
    tutorial: 'Refactoring with Specs',
    tutorialUrl: 'https://leanspec.dev/docs/tutorials/refactoring-specs',
    tech: ['Node.js'],
    files: 7,
    lines: 250,
  },
};

export function getExamplesList(): ExampleMetadata[] {
  return Object.values(EXAMPLES);
}

export function getExample(name: string): ExampleMetadata | undefined {
  return EXAMPLES[name];
}

export function exampleExists(name: string): boolean {
  return name in EXAMPLES;
}
