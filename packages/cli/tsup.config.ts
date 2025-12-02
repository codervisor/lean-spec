import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/mcp-server.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Bundle @leanspec/core into the distribution
  noExternal: ['@leanspec/core'],
  // Don't bundle tiktoken - it has native dependencies and dynamic requires
  external: ['tiktoken'],
});
