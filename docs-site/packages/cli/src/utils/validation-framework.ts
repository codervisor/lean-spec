/**
 * Validation framework for LeanSpec specs
 * 
 * Provides a plugin architecture for adding validation rules.
 * Each validator checks specific aspects of specs and returns results.
 */

import type { SpecInfo } from '../spec-loader.js';

/**
 * Result of a single validation check
 */
export interface ValidationError {
  message: string;
  suggestion?: string;
}

export interface ValidationWarning {
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * A validation rule that can be registered with the framework
 */
export interface ValidationRule {
  name: string;
  description: string;
  validate(spec: SpecInfo, content: string): ValidationResult | Promise<ValidationResult>;
}

/**
 * Registry for validation rules
 */
export class ValidationRegistry {
  private rules = new Map<string, ValidationRule>();

  /**
   * Register a new validation rule
   */
  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.name, rule);
  }

  /**
   * Get a specific rule by name
   */
  getRule(name: string): ValidationRule | undefined {
    return this.rules.get(name);
  }

  /**
   * Get all registered rules
   */
  getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get all rule names
   */
  getRuleNames(): string[] {
    return Array.from(this.rules.keys());
  }

  /**
   * Check if a rule is registered
   */
  hasRule(name: string): boolean {
    return this.rules.has(name);
  }
}

/**
 * Global registry instance
 */
export const validationRegistry = new ValidationRegistry();
