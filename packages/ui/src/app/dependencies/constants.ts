// Node dimensions
export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 60;
export const COMPACT_NODE_WIDTH = 120;
export const COMPACT_NODE_HEIGHT = 40;

// Edge colors
export const DEPENDS_ON_COLOR = '#f59e0b';
export const RELATED_COLOR = '#38bdf8'; // sky-400

// Status tone classes for node styling (aligned with StatusBadge component)
export const toneClasses: Record<string, string> = {
  planned: 'border-blue-500/80 bg-blue-950/60 text-blue-200',
  'in-progress': 'border-orange-500/80 bg-orange-950/60 text-orange-200',
  complete: 'border-green-500/80 bg-green-950/60 text-green-200',
  archived: 'border-gray-500/80 bg-gray-900/60 text-gray-400',
};

// Background colors for minimap (aligned with StatusBadge component)
export const toneBgColors: Record<string, string> = {
  planned: '#1e3a8a',     // blue-900
  'in-progress': '#7c2d12', // orange-900
  complete: '#14532d',    // green-900
  archived: '#1f2937',
};
