#!/usr/bin/env node

import { spawn } from 'child_process';

// Simple passthrough to lean-spec mcp
const child = spawn('lean-spec', ['mcp'], { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start lean-spec mcp:', err.message);
  process.exit(1);
});
