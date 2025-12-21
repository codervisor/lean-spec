import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 30000,
    // Run tests in sequence and don't shuffle
    sequence: {
      shuffle: false,
    },
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '1', 10),
    maxWorkers: parseInt(process.env.MAX_WORKERS || '1', 10),
    // Environment variable for API base URL
    env: {
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3333',
    },
  },
});
