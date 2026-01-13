#!/usr/bin/env node
/**
 * LeanSpec UI Launcher
 * 
 * This script:
 * 1. Starts the Rust HTTP server (API backend on port 3333)
 * 2. Serves the pre-built Vite UI on port 3000
 * 
 * For development, use `npm run dev` or `pnpm dev` instead.
 */

import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const UI_PORT = process.env.PORT || 3000;
const API_PORT = process.env.API_PORT || 3333;
const DIST_DIR = join(__dirname, '..', 'dist');

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const content = readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
    return true;
  } catch (err) {
    console.error('Error serving file:', filePath, err);
    return false;
  }
}

const server = createServer((req, res) => {
  // Remove query string and clean path
  const url = req.url?.split('?')[0] || '/';
  let filePath = join(DIST_DIR, url);

  // Try serving the file directly
  if (existsSync(filePath) && !filePath.endsWith('/')) {
    const stat = require('fs').statSync(filePath);
    if (stat.isFile()) {
      if (serveFile(res, filePath)) {
        return;
      }
    }
  }

  // Try with .html extension
  if (!filePath.endsWith('.html') && existsSync(filePath + '.html')) {
    if (serveFile(res, filePath + '.html')) {
      return;
    }
  }

  // Try index.html in directory
  if (existsSync(join(filePath, 'index.html'))) {
    if (serveFile(res, join(filePath, 'index.html'))) {
      return;
    }
  }

  // Fallback to index.html for SPA routing
  const indexPath = join(DIST_DIR, 'index.html');
  if (existsSync(indexPath)) {
    if (serveFile(res, indexPath)) {
      return;
    }
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

// Check if dist exists
if (!existsSync(DIST_DIR)) {
  console.error('Error: UI build not found!');
  console.error('Expected directory:', DIST_DIR);
  console.error('');
  console.error('The @leanspec/ui package must be built before running.');
  console.error('This is typically done during the npm publish process.');
  process.exit(1);
}

// Start the Rust HTTP server (API backend)
let httpServerProcess;
try {
  // Try to resolve @leanspec/http-server
  const httpServerPath = require.resolve('@leanspec/http-server/bin/leanspec-http.js');
  
  console.log('🚀 Starting LeanSpec HTTP server...');
  httpServerProcess = spawn('node', [httpServerPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: API_PORT.toString() }
  });

  httpServerProcess.on('error', (err) => {
    console.error('Failed to start HTTP server:', err.message);
    console.error('\nThe UI requires @leanspec/http-server to function.');
    console.error('Install it with: npm install @leanspec/http-server');
    process.exit(1);
  });

  // Wait a moment for the HTTP server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

} catch (err) {
  console.error('Error: @leanspec/http-server not found');
  console.error('The UI requires the HTTP server to provide API functionality.');
  console.error('');
  console.error('Install it with:');
  console.error('  npm install -g @leanspec/http-server');
  console.error('');
  console.error('Or install both together:');
  console.error('  npm install -g lean-spec @leanspec/http-server @leanspec/ui');
  process.exit(1);
}

// Start the UI server
server.listen(UI_PORT, () => {
  console.log('');
  console.log(`✅ LeanSpec is running!`);
  console.log(`   UI:  http://localhost:${UI_PORT}`);
  console.log(`   API: http://localhost:${API_PORT}`);
  console.log('');
  console.log(`Press Ctrl+C to stop`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${UI_PORT} is already in use`);
    console.error('Try setting a different port: PORT=3001 npx @leanspec/ui');
  } else {
    console.error('Server error:', err);
  }
  if (httpServerProcess) {
    httpServerProcess.kill();
  }
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  if (httpServerProcess) {
    httpServerProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (httpServerProcess) {
    httpServerProcess.kill();
  }
  process.exit(0);
});
