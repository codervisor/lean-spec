/**
 * Validate output formatter - ESLint/TypeScript style formatting
 * 
 * Implements file-centric, severity-first output format for spec validation.
 */

import chalk from 'chalk';
import type { ValidationResult } from './validation-framework.js';
import type { SpecInfo } from '../spec-loader.js';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
  ruleName: string;
  filePath: string; // Full path to the spec file or sub-spec file
}

export interface FileValidationResult {
  filePath: string; // Display path (relative to specs directory)
  issues: ValidationIssue[];
}

export interface FormatOptions {
  verbose?: boolean;  // Show passing specs
  quiet?: boolean;    // Suppress warnings and only show errors
  format?: 'default' | 'json' | 'compact';
  rule?: string;      // Filter by specific rule name
}

/**
 * Convert validation results to issue format grouped by file
 */
export function groupIssuesByFile(
  results: Array<{
    spec: SpecInfo;
    validatorName: string;
    result: ValidationResult;
    content: string;
  }>
): FileValidationResult[] {
  const fileMap = new Map<string, ValidationIssue[]>();

  // Helper function to add issue to fileMap
  const addIssue = (filePath: string, issue: ValidationIssue) => {
    if (!fileMap.has(filePath)) {
      fileMap.set(filePath, []);
    }
    fileMap.get(filePath)!.push(issue);
  };

  for (const { spec, validatorName, result } of results) {
    // Process errors
    for (const error of result.errors) {
      addIssue(spec.filePath, {
        severity: 'error',
        message: error.message,
        suggestion: error.suggestion,
        ruleName: validatorName,
        filePath: spec.filePath,
      });
    }

    // Process warnings
    for (const warning of result.warnings) {
      addIssue(spec.filePath, {
        severity: 'warning',
        message: warning.message,
        suggestion: warning.suggestion,
        ruleName: validatorName,
        filePath: spec.filePath,
      });
    }
  }

  // Convert map to array and sort
  const fileResults: FileValidationResult[] = [];
  for (const [filePath, issues] of fileMap.entries()) {
    // Sort issues: errors first, then warnings
    issues.sort((a, b) => {
      if (a.severity === b.severity) return 0;
      return a.severity === 'error' ? -1 : 1;
    });

    fileResults.push({ filePath, issues });
  }

  // Sort files by path
  fileResults.sort((a, b) => a.filePath.localeCompare(b.filePath));

  return fileResults;
}

/**
 * Normalize file path to be relative to current working directory
 */
function normalizeFilePath(filePath: string): string {
  const cwd = process.cwd();
  
  if (filePath.startsWith(cwd)) {
    // Remove cwd prefix and leading slash
    return filePath.substring(cwd.length + 1);
  } else if (filePath.includes('/specs/')) {
    // Extract from /specs/ onwards
    const specsIndex = filePath.indexOf('/specs/');
    return filePath.substring(specsIndex + 1);
  }
  
  return filePath;
}

/**
 * Format issues for a single file (ESLint-style)
 */
export function formatFileIssues(fileResult: FileValidationResult, specsDir: string): string {
  const lines: string[] = [];
  
  // Display path (relative to current working directory or specs directory)
  const relativePath = normalizeFilePath(fileResult.filePath);
  
  lines.push(chalk.cyan.underline(relativePath));

  // Format each issue with aligned columns
  for (const issue of fileResult.issues) {
    const severityColor = issue.severity === 'error' ? chalk.red : chalk.yellow;
    const severityText = severityColor(issue.severity.padEnd(9)); // "error   " or "warning "
    const ruleText = chalk.gray(issue.ruleName);
    
    lines.push(`  ${severityText}${issue.message.padEnd(60)} ${ruleText}`);
    
    if (issue.suggestion) {
      lines.push(chalk.gray(`           → ${issue.suggestion}`));
    }
  }

  lines.push(''); // Empty line after each file
  return lines.join('\n');
}

/**
 * Format summary line
 */
export function formatSummary(
  totalSpecs: number,
  errorCount: number,
  warningCount: number,
  cleanCount: number
): string {
  if (errorCount > 0) {
    const errorText = errorCount === 1 ? 'error' : 'errors';
    const warningText = warningCount === 1 ? 'warning' : 'warnings';
    return chalk.red.bold(
      `✖ ${errorCount} ${errorText}, ${warningCount} ${warningText} (${totalSpecs} specs checked, ${cleanCount} clean)`
    );
  } else if (warningCount > 0) {
    const warningText = warningCount === 1 ? 'warning' : 'warnings';
    return chalk.yellow.bold(
      `⚠ ${warningCount} ${warningText} (${totalSpecs} specs checked, ${cleanCount} clean)`
    );
  } else {
    return chalk.green.bold(`✓ All ${totalSpecs} specs passed`);
  }
}

/**
 * Format passing specs list (for --verbose mode)
 */
export function formatPassingSpecs(specs: SpecInfo[], specsDir: string): string {
  const lines: string[] = [];
  lines.push(chalk.green.bold(`\n✓ ${specs.length} specs passed:`));
  
  for (const spec of specs) {
    const relativePath = normalizeFilePath(spec.filePath);
    lines.push(chalk.gray(`  ${relativePath}`));
  }
  
  return lines.join('\n');
}

/**
 * Format validation results in JSON format
 */
export function formatJson(
  fileResults: FileValidationResult[],
  totalSpecs: number,
  errorCount: number,
  warningCount: number
): string {
  const output = {
    summary: {
      totalSpecs,
      errorCount,
      warningCount,
      cleanCount: totalSpecs - fileResults.length,
    },
    files: fileResults.map(fr => ({
      filePath: fr.filePath,
      issues: fr.issues.map(issue => ({
        severity: issue.severity,
        message: issue.message,
        suggestion: issue.suggestion,
        rule: issue.ruleName,
      })),
    })),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Main formatting function
 */
export function formatValidationResults(
  results: Array<{
    spec: SpecInfo;
    validatorName: string;
    result: ValidationResult;
    content: string;
  }>,
  specs: SpecInfo[],
  specsDir: string,
  options: FormatOptions = {}
): string {
  const fileResults = groupIssuesByFile(results);
  
  // Filter by rule if specified
  const filteredResults = options.rule
    ? fileResults
        .map(fr => ({
          ...fr,
          issues: fr.issues.filter(issue => issue.ruleName === options.rule),
        }))
        .filter(fr => fr.issues.length > 0)
    : fileResults;

  // Filter by quiet mode (only errors)
  const displayResults = options.quiet
    ? filteredResults.map(fr => ({
        ...fr,
        issues: fr.issues.filter(issue => issue.severity === 'error'),
      })).filter(fr => fr.issues.length > 0)
    : filteredResults;

  // JSON format
  if (options.format === 'json') {
    const errorCount = displayResults.reduce(
      (sum, fr) => sum + fr.issues.filter(i => i.severity === 'error').length,
      0
    );
    const warningCount = displayResults.reduce(
      (sum, fr) => sum + fr.issues.filter(i => i.severity === 'warning').length,
      0
    );
    return formatJson(displayResults, specs.length, errorCount, warningCount);
  }

  // Default format
  const lines: string[] = [];
  
  // Header
  lines.push(chalk.bold(`\nValidating ${specs.length} specs...\n`));

  // File issues
  for (const fileResult of displayResults) {
    lines.push(formatFileIssues(fileResult, specsDir));
  }

  // Summary
  const errorCount = displayResults.reduce(
    (sum, fr) => sum + fr.issues.filter(i => i.severity === 'error').length,
    0
  );
  const warningCount = displayResults.reduce(
    (sum, fr) => sum + fr.issues.filter(i => i.severity === 'warning').length,
    0
  );
  const cleanCount = specs.length - fileResults.length;

  lines.push(formatSummary(specs.length, errorCount, warningCount, cleanCount));

  // Verbose mode: show passing specs
  if (options.verbose && cleanCount > 0) {
    const specsWithIssues = new Set(fileResults.map(fr => fr.filePath));
    const passingSpecs = specs.filter(spec => !specsWithIssues.has(spec.filePath));
    lines.push(formatPassingSpecs(passingSpecs, specsDir));
  }

  // Add hint for verbose mode if not already in verbose mode
  if (!options.verbose && cleanCount > 0 && displayResults.length > 0) {
    lines.push(chalk.gray('\nRun with --verbose to see passing specs.'));
  }

  return lines.join('\n');
}
