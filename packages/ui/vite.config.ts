import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const API_PROXY_TARGET =
  process.env.LEANSPEC_API_URL || process.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Swaps the favicon based on the Vite mode (development vs production).
 * Place a `favicon-dev.ico` and/or `logo-dev.svg` in `public/` for the dev variant.
 */
function faviconPlugin(): Plugin {
  return {
    name: 'lean-spec-favicon',
    transformIndexHtml(html, ctx) {
      if (ctx.server) {
        // Development mode — use dev favicons
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
  },
})
