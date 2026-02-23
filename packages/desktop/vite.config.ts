import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    root: '.',
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '../ui/src'),
      },
    },
    server: {
      port: 1420,
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
      },
    },
    build: {
      target: ['es2022', 'chrome120', 'safari16'],
      sourcemap: true,
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
