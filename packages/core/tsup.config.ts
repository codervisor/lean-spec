import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Disable tsup DTS generation
  clean: true,
  sourcemap: true,
  treeshake: true,
});
