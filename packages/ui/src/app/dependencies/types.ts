import type { ProjectDependencyGraph } from '@/app/api/dependencies/route';

export type GraphTone = 'planned' | 'in-progress' | 'complete' | 'archived';

export interface SpecNodeData {
  label: string;
  shortLabel: string;
  badge: string;
  number: number;
  tone: GraphTone;
  href?: string;
  interactive?: boolean;
  isFocused?: boolean;
  connectionDepth?: number;
  isDimmed?: boolean;
  isCompact?: boolean;
}

export type SpecNode = ProjectDependencyGraph['nodes'][0];

export interface FocusedNodeDetails {
  node: SpecNode;
  upstream: SpecNode[];
  downstream: SpecNode[];
  related: SpecNode[];
}

export interface ConnectionStats {
  connected: number;
  standalone: number;
}
