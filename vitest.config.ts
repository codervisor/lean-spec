import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const webSrc = fileURLToPath(new URL('./packages/web/src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': webSrc,
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
