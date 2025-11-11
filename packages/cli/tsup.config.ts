import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/mcp-server.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['@leanspec/core'],
});
