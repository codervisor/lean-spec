import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "LeanSpec",
  description: "Lightweight spec methodology for AI-powered development",
  base: '/lean-spec/',
  
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'CLI Reference', link: '/reference/cli' },
      { text: 'AI Integration', link: '/ai-integration/' },
      {
        text: 'v0.1.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/codervisor/lean-spec/blob/main/CHANGELOG.md' },
          { text: 'Contributing', link: '/contributing' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is LeanSpec?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Quick Start', link: '/guide/quick-start' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Philosophy', link: '/guide/philosophy' },
            { text: 'Agile Principles', link: '/guide/principles' },
            { text: 'When to Use', link: '/guide/when-to-use' }
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'Templates', link: '/guide/templates' },
            { text: 'Frontmatter', link: '/guide/frontmatter' },
            { text: 'Custom Fields', link: '/guide/custom-fields' },
            { text: 'Variables', link: '/guide/variables' }
          ]
        }
      ],
      
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'CLI Commands', link: '/reference/cli' },
            { text: 'Configuration', link: '/reference/config' },
            { text: 'Frontmatter Fields', link: '/reference/frontmatter' }
          ]
        }
      ],
      
      '/ai-integration/': [
        {
          text: 'AI Integration',
          items: [
            { text: 'Overview', link: '/ai-integration/' },
            { text: 'Setup', link: '/ai-integration/setup' },
            { text: 'AGENTS.md Guide', link: '/ai-integration/agents-md' },
            { text: 'Best Practices', link: '/ai-integration/best-practices' },
            { text: 'Examples', link: '/ai-integration/examples' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/codervisor/lean-spec' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 codervisor'
    },

    editLink: {
      pattern: 'https://github.com/codervisor/lean-spec/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/lean-spec/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'LeanSpec' }],
  ]
})
