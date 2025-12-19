/**
 * Utility functions for generating colors from strings
 */
/**
 * Predefined color palette for projects
 */
export declare const PROJECT_COLORS: string[];
/**
 * Generate a consistent color from a string (e.g., project name)
 */
export declare function getColorFromString(str: string): string;
/**
 * Get contrasting text color for a background
 */
export declare function getContrastColor(hexColor?: string): string;
/**
 * Get initials from a name string
 * Takes first letter of first two words, or first two letters if single word
 */
export declare function getInitials(name: string): string;
//# sourceMappingURL=color-utils.d.ts.map