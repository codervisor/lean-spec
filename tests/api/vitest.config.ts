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
    // Environment variable for API base URL
    env: {
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
    },
  },
});
