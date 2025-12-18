/**
 * Utility functions for generating colors from strings
 */

/**
 * Predefined color palette for projects
 */
export const PROJECT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#6b7280', // gray
  '#78716c', // stone
];

/**
 * Generate a consistent color from a string (e.g., project name)
 */
export function getColorFromString(str: string): string {
  if (!str) return PROJECT_COLORS[0];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

/**
 * Get contrasting text color for a background
 */
export function getContrastColor(hexColor?: string): string {
  if (!hexColor) return '#ffffff';

  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Get initials from a name string
 * Takes first letter of first two words, or first two letters if single word
 */
export function getInitials(name: string): string {
  if (!name) return '??';

  const words = name.trim().split(/[\s_-]+/);

  if (words.length >= 2) {
    // Two or more words: first letter of first two words
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    // Single word: first two letters (or one if too short)
    const word = words[0];
    return word.length >= 2 ? (word[0] + word[1]).toUpperCase() : word[0].toUpperCase();
  }
}
