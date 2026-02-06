import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const API_PROXY_TARGET =
  process.env.LEANSPEC_API_URL || process.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Swaps the favicon based on mode:
 * - Dev server (`pnpm dev`): uses dev favicons
 * - Dev build (`LEANSPEC_DEV_BUILD=true`): uses dev favicons for npm dev publish
 * - Production build: uses standard favicons
 */
function faviconPlugin(): Plugin {
  const isDevBuild = process.env.LEANSPEC_DEV_BUILD === 'true';

  return {
    name: 'lean-spec-favicon',
    transformIndexHtml(html, ctx) {
      if (ctx.server || isDevBuild) {
        // Development mode or dev npm publish — use dev favicons
        return html
          .replace('href="/favicon.ico"', 'href="/favicon-dev.ico"')
          .replace('href="/logo.svg"', 'href="/logo-dev.svg"');
      }
      return html;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), faviconPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
  define: {
    // Make environment variables available
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || ''),
    // Flag for dev builds (local dev server or LEANSPEC_DEV_BUILD=true)
    __DEV_BUILD__: JSON.stringify(process.env.LEANSPEC_DEV_BUILD === 'true'),
  },
})
