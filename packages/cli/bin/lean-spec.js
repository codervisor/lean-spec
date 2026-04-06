#!/usr/bin/env node
/**
 * LeanSpec CLI (deprecated entry point)
 *
 * The `lean-spec` command has been renamed to `leanspec`.
 * This wrapper shows a deprecation notice and delegates to the new entry point.
 */
console.error('\x1b[33m⚠ "lean-spec" is deprecated. Use "leanspec" instead.\x1b[0m');
import './leanspec-rust.js';
