import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { sanitizeUserInput } from './safe-output.js';

/**
 * Show a spinner while executing an async operation
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  options?: {
    successText?: string;
    failText?: string;
  }
): Promise<T> {
  const spinner = ora(text).start();
  
  try {
    const result = await fn();
    spinner.succeed(options?.successText || text);
    return result;
  } catch (error) {
    spinner.fail(options?.failText || `${text} failed`);
    throw error;
  }
}

/**
 * Create a spinner instance for manual control
 */
export function createSpinner(text: string): Ora {
  return ora(text);
}

/**
 * Display a success message
 * Note: If message contains user input, it should be pre-sanitized or passed separately
 */
export function success(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

/**
 * Display an error message
 * Note: If message contains user input, it should be pre-sanitized or passed separately
 */
export function error(message: string): void {
  console.error(chalk.red(`✗ ${message}`));
}

/**
 * Display a warning message
 * Note: If message contains user input, it should be pre-sanitized or passed separately
 */
export function warning(message: string): void {
  console.log(chalk.yellow(`⚠ ${message}`));
}

/**
 * Display an info message
 * Note: If message contains user input, it should be pre-sanitized or passed separately
 */
export function info(message: string): void {
  console.log(chalk.blue(`ℹ ${message}`));
}

/**
 * Display a heading
 * Note: If text contains user input, it should be pre-sanitized or passed separately
 */
export function heading(text: string): void {
  console.log('');
  console.log(chalk.green.bold(text));
  console.log('');
}

/**
 * Display a subheading
 * Note: If text contains user input, it should be pre-sanitized or passed separately
 */
export function subheading(text: string): void {
  console.log(chalk.cyan.bold(text));
}

/**
 * Display a hint/tip
 * Note: If message contains user input, it should be pre-sanitized or passed separately
 */
export function hint(message: string): void {
  console.log(chalk.gray(`💡 Tip: ${message}`));
}

/**
 * Helper to sanitize user input before display
 * This is exported for convenience when building messages that include user input
 */
export { sanitizeUserInput };
