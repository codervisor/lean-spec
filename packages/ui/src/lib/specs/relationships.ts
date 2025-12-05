/**
 * Spec relationships computation
 * Single source of truth for computing spec dependencies
 * 
 * Used by both filesystem and multi-project modes to ensure consistent behavior
 */

import matter from 'gray-matter';
import type { SpecRelationships } from './types';
import type { Spec } from '../db/schema';

/**
 * Normalize a depends_on value to a string array
 * Handles: undefined, string, string[], and invalid values
 */
export function normalizeRelationshipList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return [value.trim()].filter(Boolean);
  }
  return [];
}

/**
 * Extract depends_on from frontmatter content
 * Works with both raw markdown (with frontmatter) and parsed frontmatter
 */
export function extractDependsOn(contentOrFrontmatter: string | Record<string, unknown>): string[] {
  if (typeof contentOrFrontmatter === 'string') {
    try {
      const { data } = matter(contentOrFrontmatter);
      return normalizeRelationshipList(data?.depends_on ?? data?.dependsOn);
    } catch {
      return [];
    }
  }
  return normalizeRelationshipList(contentOrFrontmatter?.depends_on ?? contentOrFrontmatter?.dependsOn);
}

/**
 * Compute relationships for a single spec given all specs in the project
 * This is the canonical implementation used by all modes
 * 
 * @param spec - The spec to compute relationships for
 * @param allSpecs - All specs in the project (for computing requiredBy)
 * @returns SpecRelationships with dependsOn and requiredBy
 */
export function computeSpecRelationships(
  spec: Spec,
  allSpecs: Spec[]
): SpecRelationships {
  // Extract dependsOn from the spec's content
  const dependsOn = extractDependsOn(spec.contentMd);
  
  // Compute requiredBy via reverse lookup
  const requiredBy: string[] = [];
  
  for (const otherSpec of allSpecs) {
    if (otherSpec.specName === spec.specName) continue;
    
    const otherDependsOn = extractDependsOn(otherSpec.contentMd);
    if (otherDependsOn.includes(spec.specName)) {
      requiredBy.push(otherSpec.specName);
    }
  }
  
  return { dependsOn, requiredBy };
}

/**
 * Build a complete relationship map for all specs
 * More efficient than calling computeSpecRelationships for each spec individually
 * 
 * @param specs - All specs in the project
 * @returns Map from specName to SpecRelationships
 */
export function buildRelationshipMap(specs: Spec[]): Map<string, SpecRelationships> {
  const map = new Map<string, SpecRelationships>();
  
  // First pass: extract all dependsOn
  for (const spec of specs) {
    const dependsOn = extractDependsOn(spec.contentMd);
    map.set(spec.specName, { dependsOn, requiredBy: [] });
  }
  
  // Second pass: compute requiredBy (reverse lookup)
  for (const spec of specs) {
    const rels = map.get(spec.specName);
    if (!rels) continue;
    
    for (const dep of rels.dependsOn) {
      const depRels = map.get(dep);
      if (depRels) {
        depRels.requiredBy.push(spec.specName);
      }
    }
  }
  
  return map;
}

/**
 * Spec with computed relationships
 */
export interface SpecWithRelationships extends Spec {
  relationships: SpecRelationships;
}

/**
 * Enrich specs with their relationships
 * 
 * @param specs - Specs to enrich
 * @returns Specs with relationships attached
 */
export function enrichSpecsWithRelationships(specs: Spec[]): SpecWithRelationships[] {
  const relationshipMap = buildRelationshipMap(specs);
  
  return specs.map(spec => ({
    ...spec,
    relationships: relationshipMap.get(spec.specName) || { dependsOn: [], requiredBy: [] },
  }));
}
