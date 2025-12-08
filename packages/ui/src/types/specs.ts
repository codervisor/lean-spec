import type { ParsedSpec, LightweightSpec } from '@/lib/db/service-queries';
import type { SubSpec } from '@/lib/sub-specs';

export interface SpecRelationships {
  dependsOn: string[];
  requiredBy: string[]; // Downstream dependents (specs that depend on this one)
}

export interface SpecRelationshipNode {
  specNumber?: number;
  specName: string;
  title?: string;
  status?: string;
  priority?: string;
}

export interface CompleteSpecRelationships {
  current: SpecRelationshipNode;
  dependsOn: SpecRelationshipNode[];
  requiredBy: SpecRelationshipNode[];
}

export type SpecWithMetadata = ParsedSpec & {
  subSpecs?: SubSpec[];
  relationships?: SpecRelationships;
};

/**
 * Lightweight spec type for sidebar (no contentMd for performance)
 */
export type SidebarSpec = Pick<LightweightSpec, 'id' | 'specNumber' | 'title' | 'specName' | 'status' | 'priority' | 'updatedAt'> & {
  tags: string[] | null;
  subSpecsCount?: number;
};
