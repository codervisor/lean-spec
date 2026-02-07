import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const API_PROXY_TARGET =
  process.env.LEANSPEC_API_URL || process.env.VITE_API_URL || 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
