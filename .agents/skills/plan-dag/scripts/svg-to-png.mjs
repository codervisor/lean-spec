#!/usr/bin/env node
// svg-to-png — rasterise a graphviz SVG to PNG via headless Chromium.
//
// Usage:
//   dot -Tsvg | node svg-to-png.mjs <out-path>
//
// Why not `dot -Tpng`? Going through the browser gives sharper text and
// correct anti-aliasing at deviceScaleFactor=2, which matters when the
// PNG is shown inline in chat surfaces.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const out = process.argv[2];
if (!out) {
  process.stderr.write('usage: svg-to-png.mjs <out-path>\n');
  process.exit(2);
}

const svg = readFileSync(0, 'utf8');
if (!svg.trim()) {
  process.stderr.write('svg-to-png: no SVG on stdin\n');
  process.exit(2);
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch (localErr) {
    // Local resolution failed (e.g. script run from a directory that doesn't
    // see the global node_modules). Try `npm root -g` to find the standard
    // global install.
    try {
      const globalRoot = execSync('npm root -g', {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      const req = createRequire(import.meta.url);
      return req(`${globalRoot}/playwright`);
    } catch {
      process.stderr.write(
        'svg-to-png: cannot load Playwright. Install with '
        + '`npm i -g playwright` and `npx playwright install chromium`.\n'
        + `(local require error: ${localErr.message})\n`,
      );
      process.exit(2);
    }
  }
}

const { chromium } = await loadPlaywright();

const PAD = 24;
const DPR = 2;

// Parse the SVG's intrinsic width/height so we can size the viewport
// to actually fit the content — `page.locator('body').boundingBox()` would
// otherwise clip wide graphs to the default 1280×720 viewport.
function toPx(value) {
  if (!value) return null;
  const num = parseFloat(value);
  if (Number.isNaN(num)) return null;
  if (/pt\s*$/i.test(value)) return num * 4 / 3;
  if (/in\s*$/i.test(value)) return num * 96;
  if (/cm\s*$/i.test(value)) return num * 96 / 2.54;
  if (/mm\s*$/i.test(value)) return num * 96 / 25.4;
  return num;
}

const widthAttr = svg.match(/<svg\b[^>]*?\swidth\s*=\s*"([^"]+)"/i);
const heightAttr = svg.match(/<svg\b[^>]*?\sheight\s*=\s*"([^"]+)"/i);
const svgW = toPx(widthAttr && widthAttr[1]) || 1280;
const svgH = toPx(heightAttr && heightAttr[1]) || 720;
const W = Math.max(1, Math.ceil(svgW + 2 * PAD));
const H = Math.max(1, Math.ceil(svgH + 2 * PAD));

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#fff}
  body{padding:${PAD}px;display:inline-block}
  svg{display:block}
</style></head><body>${svg}</body></html>`;

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({
    deviceScaleFactor: DPR,
    viewport: { width: W, height: H },
  });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: out, omitBackground: false, fullPage: true });
} finally {
  await browser.close();
}

process.stderr.write(`svg-to-png: wrote ${out}\n`);
