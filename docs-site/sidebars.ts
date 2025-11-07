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
      items: ['guide/index', 'guide/getting-started'],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: ['guide/first-principles', 'guide/philosophy', 'guide/principles', 'guide/when-to-use'],
    },
    {
      type: 'category',
      label: 'Working with AI',
      items: ['guide/ai/index', 'guide/ai/setup', 'guide/ai/agents-md', 'guide/ai/best-practices', 'guide/ai/examples'],
    },
    {
      type: 'category',
      label: 'Features',
      items: ['guide/templates', 'guide/frontmatter', 'guide/custom-fields', 'guide/variables'],
    },
    {
      type: 'category',
      label: 'Workflow',
      items: ['guide/board-stats', 'guide/dependencies', 'guide/validation'],
    },
    'guide/migration',
    'roadmap',
  ],
  referenceSidebar: [
    'reference/cli',
    'reference/config',
    'reference/frontmatter',
    'reference/mcp-server',
  ],
};

export default sidebars;
