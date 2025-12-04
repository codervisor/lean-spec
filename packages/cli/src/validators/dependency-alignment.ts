/**
 * Dependency Alignment Validator
 * 
 * Detects when spec content references other specs but those references
 * are not reflected in frontmatter depends_on fields.
 * 
 * This catches a common AI agent failure mode: writing content that mentions
 * dependencies but forgetting to use `lean-spec link` to add them to frontmatter.
 */

import type { ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../utils/validation-framework.js';
import type { SpecInfo } from '../spec-loader.js';
import matter from 'gray-matter';
import yaml from 'js-yaml';

export interface DependencyAlignmentOptions {
  /** Treat misalignment as errors instead of warnings */
  strict?: boolean;
  /** Set of existing spec numbers to validate against (only warn about refs to existing specs) */
  existingSpecNumbers?: Set<string>;
}

/**
 * Patterns to detect spec references in content
 */
const SPEC_REF_PATTERNS = [
  // "spec 045", "Spec 045", "spec-045"
  /\bspec[- ]?(\d{3})\b/gi,
  // "045-unified-dashboard" (full spec folder name)
  /\b(\d{3})-[a-z][a-z0-9-]+\b/gi,
];

/**
 * Patterns that indicate blocking dependencies (depends_on)
 */
const DEPENDS_ON_PATTERNS = [
  /depends on[:\s]+.*?\b(\d{3})\b/gi,
  /blocked by[:\s]+.*?\b(\d{3})\b/gi,
  /requires[:\s]+.*?spec[:\s]*(\d{3})\b/gi,
  /prerequisite[:\s]+.*?\b(\d{3})\b/gi,
  /after[:\s]+.*?spec[:\s]*(\d{3})\b/gi,
  /builds on[:\s]+.*?\b(\d{3})\b/gi,
  /extends[:\s]+.*?\b(\d{3})\b/gi,
];

interface DetectedRef {
  specNumber: string;
  type: 'depends_on';
  context: string;
}

export class DependencyAlignmentValidator implements ValidationRule {
  name = 'dependency-alignment';
  description = 'Detect content references to specs not linked in frontmatter';

  private strict: boolean;
  private existingSpecNumbers: Set<string> | null;

  constructor(options: DependencyAlignmentOptions = {}) {
    this.strict = options.strict ?? false;
    this.existingSpecNumbers = options.existingSpecNumbers ?? null;
  }

  /**
   * Set the existing spec numbers to validate against
   */
  setExistingSpecNumbers(numbers: Set<string>): void {
    this.existingSpecNumbers = numbers;
  }

  validate(spec: SpecInfo, content: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Parse frontmatter to get current deps
    let parsed;
    try {
      parsed = matter(content, {
        engines: {
          yaml: (str) => yaml.load(str, { schema: yaml.FAILSAFE_SCHEMA }) as Record<string, unknown>
        }
      });
    } catch {
      // If frontmatter parsing fails, skip this validator (frontmatter validator will catch it)
      return { passed: true, errors: [], warnings: [] };
    }

    const frontmatter = parsed.data;
    const bodyContent = parsed.content;

    // Get current frontmatter dependencies
    const currentDependsOn = this.normalizeDeps(frontmatter.depends_on);

    // Get this spec's number to exclude self-references
    const selfNumber = this.extractSpecNumber(spec.name);

    // Detect references in content
    const detectedRefs = this.detectReferences(bodyContent, selfNumber);

    // Find missing dependencies (only for specs that exist)
    const missingDependsOn: DetectedRef[] = [];

    for (const ref of detectedRefs) {
      // Skip if already linked
      if (currentDependsOn.includes(ref.specNumber)) continue;
      
      // Skip if we have existing spec numbers and this one doesn't exist
      if (this.existingSpecNumbers && !this.existingSpecNumbers.has(ref.specNumber)) continue;

      missingDependsOn.push(ref);
    }

    // Generate warnings/errors for missing deps
    if (missingDependsOn.length > 0) {
      const specNumbers = [...new Set(missingDependsOn.map(r => r.specNumber))];
      const issue = {
        message: `Content references dependencies not in frontmatter: ${specNumbers.join(', ')}`,
        suggestion: `Run: lean-spec link ${spec.name} --depends-on ${specNumbers.join(',')}`,
      };
      if (this.strict) {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Normalize dependency field to array of spec numbers
   */
  private normalizeDeps(deps: unknown): string[] {
    if (!deps) return [];
    
    const depArray = Array.isArray(deps) ? deps : [deps];
    return depArray.map(d => {
      const str = String(d);
      // Extract just the number part
      const match = str.match(/(\d{3})/);
      return match ? match[1] : str;
    }).filter(Boolean);
  }

  /**
   * Extract spec number from spec name (e.g., "045-unified-dashboard" -> "045")
   */
  private extractSpecNumber(specName: string): string | null {
    const match = specName.match(/^(\d{3})/);
    return match ? match[1] : null;
  }

  /**
   * Detect spec references in content that indicate dependencies
   */
  private detectReferences(content: string, selfNumber: string | null): DetectedRef[] {
    const refs: DetectedRef[] = [];
    const seenNumbers = new Set<string>();

    // Check for explicit dependency patterns
    for (const pattern of DEPENDS_ON_PATTERNS) {
      const matches = content.matchAll(new RegExp(pattern));
      for (const match of matches) {
        const specNumber = match[1];
        if (specNumber && specNumber !== selfNumber && !seenNumbers.has(specNumber)) {
          seenNumbers.add(specNumber);
          refs.push({
            specNumber,
            type: 'depends_on',
            context: match[0].substring(0, 50),
          });
        }
      }
    }

    return refs;
  }
}
