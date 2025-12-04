// Node dimensions
export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 60;
export const COMPACT_NODE_WIDTH = 120;
export const COMPACT_NODE_HEIGHT = 40;

// Edge colors
export const DEPENDS_ON_COLOR = '#f59e0b';

// Status tone classes for node styling (aligned with StatusBadge component)
// Using light/dark mode compatible colors
export const toneClasses: Record<string, string> = {
  planned: 'border-blue-500 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200',
  'in-progress': 'border-orange-500 bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
  complete: 'border-green-500 bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200',
  archived: 'border-gray-400 bg-gray-100 text-gray-600 dark:border-gray-500/80 dark:bg-gray-900/60 dark:text-gray-400',
};

// Background colors for minimap (aligned with StatusBadge component)
export const toneBgColors: Record<string, string> = {
  planned: '#3b82f6',     // blue-500 (works in both themes)
  'in-progress': '#f97316', // orange-500
  complete: '#22c55e',    // green-500
  archived: '#6b7280',    // gray-500
};
