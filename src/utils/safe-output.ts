import chalk from 'chalk';
import stripAnsi from 'strip-ansi';

/**
 * Sanitizes user input by stripping all ANSI escape sequences
 * and control characters that could be used for injection attacks.
 * 
 * This prevents:
 * - ANSI injection attacks
 * - Terminal escape sequence abuse
 * - Output manipulation
 * 
 * @param input - The untrusted user input to sanitize
 * @returns Sanitized string safe for display
 */
export function sanitizeUserInput(input: string): string {
  // Handle non-string or falsy values explicitly
  if (typeof input !== 'string') {
    return '';
  }
  
  if (!input) {
    return '';
  }
  
  // First strip any existing ANSI codes
  let sanitized = stripAnsi(input);
  
  // Remove control characters (except newlines, tabs, and carriage returns which might be intended)
  // This regex removes characters in ranges:
  // \x00-\x08 (NULL through BACKSPACE)
  // \x0B-\x0C (vertical tab, form feed)
  // \x0E-\x1F (shift out through unit separator)
  // \x7F (DELETE)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * Strips ANSI escape sequences from a string.
 * This is a direct wrapper around strip-ansi for convenience.
 * 
 * @param text - The text to strip ANSI codes from
 * @returns Text without ANSI codes
 */
export function stripAnsiCodes(text: string): string {
  return stripAnsi(text);
}

/**
 * Safely logs a message with optional user content.
 * 
 * @param message - The message to log (can include user content that will be sanitized)
 */
export function safeLog(message: string): void {
  // Sanitize the entire message to handle any user content within it
  console.log(sanitizeUserInput(message));
}

/**
 * Safely displays a success message with optional user content
 * 
 * @param message - The static message template
 * @param userContent - Optional user-provided content to sanitize
 */
export function safeSuccess(message: string, userContent?: string): void {
  const fullMessage = userContent 
    ? `${message} ${sanitizeUserInput(userContent)}`
    : message;
  console.log(chalk.green(`✓ ${fullMessage}`));
}

/**
 * Safely displays an error message with optional user content
 * 
 * @param message - The static message template
 * @param userContent - Optional user-provided content to sanitize
 */
export function safeError(message: string, userContent?: string): void {
  const fullMessage = userContent 
    ? `${message} ${sanitizeUserInput(userContent)}`
    : message;
  console.error(chalk.red(`✗ ${fullMessage}`));
}

/**
 * Safely displays a warning message with optional user content
 * 
 * @param message - The static message template
 * @param userContent - Optional user-provided content to sanitize
 */
export function safeWarn(message: string, userContent?: string): void {
  const fullMessage = userContent 
    ? `${message} ${sanitizeUserInput(userContent)}`
    : message;
  console.log(chalk.yellow(`⚠ ${fullMessage}`));
}

/**
 * Safely displays an info message with optional user content
 * 
 * @param message - The static message template
 * @param userContent - Optional user-provided content to sanitize
 */
export function safeInfo(message: string, userContent?: string): void {
  const fullMessage = userContent 
    ? `${message} ${sanitizeUserInput(userContent)}`
    : message;
  console.log(chalk.blue(`ℹ ${fullMessage}`));
}

/**
 * Safely displays a heading with user content
 * 
 * @param text - The heading text (should be sanitized if user-provided)
 * @param isUserProvided - Whether the text comes from user input
 */
export function safeHeading(text: string, isUserProvided = false): void {
  const safeText = isUserProvided ? sanitizeUserInput(text) : text;
  console.log('');
  console.log(chalk.green.bold(safeText));
  console.log('');
}

/**
 * Safely displays a subheading with user content
 * 
 * @param text - The subheading text (should be sanitized if user-provided)
 * @param isUserProvided - Whether the text comes from user input
 */
export function safeSubheading(text: string, isUserProvided = false): void {
  const safeText = isUserProvided ? sanitizeUserInput(text) : text;
  console.log(chalk.cyan.bold(safeText));
}

/**
 * Safely displays a hint/tip with user content
 * 
 * @param message - The hint message (should be sanitized if user-provided)
 * @param isUserProvided - Whether the message comes from user input
 */
export function safeHint(message: string, isUserProvided = false): void {
  const safeMessage = isUserProvided ? sanitizeUserInput(message) : message;
  console.log(chalk.gray(`💡 Tip: ${safeMessage}`));
}
