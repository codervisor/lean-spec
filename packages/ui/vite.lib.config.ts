import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      outputDir: 'dist/lib',
      include: ['src/**/*'],
      exclude: ['**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'LeanSpecUI',
      formats: ['es'],
      fileName: () => 'lib/index.js',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@radix-ui/react-accordion',
        '@radix-ui/react-avatar',
        '@radix-ui/react-collapsible',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-hover-card',
        '@radix-ui/react-popover',
        '@radix-ui/react-progress',
        '@radix-ui/react-scroll-area',
        '@radix-ui/react-select',
        '@radix-ui/react-separator',
        '@radix-ui/react-slot',
        '@radix-ui/react-switch',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toast',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-use-controllable-state',
        '@rive-app/react-webgl2',
        '@streamdown/cjk',
        '@streamdown/code',
        '@streamdown/math',
        '@streamdown/mermaid',
        '@xyflow/react',
        'ai',
        'ai-elements',
        'ansi-to-react',
        'class-variance-authority',
        'clsx',
        'cmdk',
        'dayjs',
        'embla-carousel-react',
        'lucide-react',
        'media-chrome',
        'motion',
        'nanoid',
        'react-window',
        'reactflow',
        'shiki',
        'streamdown',
        'tailwind-merge',
        'tailwindcss-animate',
        'tokenlens',
        'use-stick-to-bottom',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'ui.css';
          }
          return 'assets/[name][extname]';
        },
      },
    },
    sourcemap: !isProduction,
    minify: isProduction,
    cssCodeSplit: false,
  },
});
