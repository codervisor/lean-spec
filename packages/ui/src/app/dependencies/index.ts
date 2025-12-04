// Re-export main component
export { ProjectDependencyGraphClient } from './dependencies-client';

// Re-export types for use elsewhere
export type { SpecNodeData, GraphTone, FocusedNodeDetails, ConnectionStats, SpecNode } from './types';

// Re-export utilities for potential reuse
export { getConnectionDepths, layoutGraph } from './utils';

// Re-export constants
export {
  NODE_WIDTH,
  NODE_HEIGHT,
  COMPACT_NODE_WIDTH,
  COMPACT_NODE_HEIGHT,
  DEPENDS_ON_COLOR,
  toneClasses,
  toneBgColors,
} from './constants';
