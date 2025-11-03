import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/mcp-server.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  minify: false,
  sourcemap: true,
  shims: true,
});
