import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const uiSrc = fileURLToPath(new URL('./packages/ui/src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': uiSrc,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.d.ts'],
    },
  },
});
