/**
 * Spec utilities for UI package
 * 
 * These utilities are inlined versions of functions from @leanspec/core,
 * which is being deprecated in favor of the Rust implementation.
 * 
 * @see spec 181-typescript-deprecation-rust-migration
 */

export { createUpdatedFrontmatter, type SpecFrontmatter, type SpecStatus, type SpecPriority } from './frontmatter';
export { atomicWriteFile } from './file-ops';
