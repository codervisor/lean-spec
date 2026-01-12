import type { DependencyGraph } from '../../types/api';

export type GraphTone = 'planned' | 'in-progress' | 'complete' | 'archived';

export interface SpecNodeData {
  label: string;
  shortLabel: string;
  badge: string;
  number: number;
  tone: GraphTone;
  priority: string;
  href?: string;
  interactive?: boolean;
  isFocused?: boolean;
  connectionDepth?: number;
  isDimmed?: boolean;
  isCompact?: boolean;
  isSecondary?: boolean; // Shown due to critical path, not primary filter
}

export type SpecNode = DependencyGraph['nodes'][0];

// Specs grouped by their depth level from the focused node
export interface SpecsByDepth {
  depth: number;
  specs: SpecNode[];
}

export interface FocusedNodeDetails {
  node: SpecNode;
  upstream: SpecsByDepth[];  // All transitive deps grouped by depth
  downstream: SpecsByDepth[]; // All transitive dependents grouped by depth
}

export interface ConnectionStats {
  connected: number;
  standalone: number;
}
