import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  guideSidebar: [
    {
      type: 'category',
      label: 'Introduction',
      items: ['guide/index', 'guide/getting-started', 'guide/why-leanspec'],
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/first-spec-with-ai',
        'tutorials/managing-multiple-features',
        'tutorials/refactoring-with-specs',
        'tutorials/large-project-management',
        'tutorials/sdd-without-toolkit',
      ],
    },
    {
      type: 'category',
      label: 'Usage',
      items: [
        'guide/usage/overview',
        'guide/usage/ai-coding-workflow',
        {
          type: 'category',
          label: 'CLI Usage',
          items: [
            'guide/usage/cli/overview',
            'guide/usage/cli/creating-managing',
            'guide/usage/cli/finding-specs',
            'guide/usage/cli/project-management',
            'guide/usage/cli/validation',
          ],
        },
        'guide/visual-mode',
        'guide/usage/mcp-integration',
        'guide/usage/spec-structure',
        {
          type: 'category',
          label: 'Advanced Features',
          items: [
            'guide/usage/advanced-features/templates',
            'guide/usage/advanced-features/custom-fields',
            'guide/usage/advanced-features/variables',
            'guide/usage/advanced-features/frontmatter',
            'guide/usage/advanced-features/agent-configuration',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'guide/understanding-leanspec',
        {
          type: 'category',
          label: 'Terminology',
          items: [
            'guide/terminology/spec',
            'guide/terminology/built-in-metadata',
            'guide/terminology/sdd-workflow',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Advanced Topics',
      items: [
        'advanced/first-principles',
        'advanced/context-engineering',
        'advanced/ai-agent-memory',
        'advanced/ai-assisted-spec-writing',
        'advanced/philosophy',
        'advanced/limits-and-tradeoffs',
      ],
    },
    'guide/migration',
    'roadmap',
    'faq',
  ],
  referenceSidebar: [
    'reference/cli',
    'reference/config',
    'reference/frontmatter',
    'reference/mcp-server',
    'reference/ui-package',
  ],
};

export default sidebars;
