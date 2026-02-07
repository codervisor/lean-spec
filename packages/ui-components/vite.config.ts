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
      include: ['src/**/*'],
      exclude: ['**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'LeanSpecUIComponents',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@radix-ui/react-dialog',
        '@radix-ui/react-popover',
        '@radix-ui/react-select',
        '@radix-ui/react-slot',
        'class-variance-authority',
        'clsx',
        'cmdk',
        'dayjs',
        'lucide-react',
        'tailwind-merge'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
        preserveModules: false,
      },
    },
    // Disable sourcemaps in production to reduce bundle size
    sourcemap: !isProduction,
    minify: isProduction,
    cssCodeSplit: false,
  },
});
