import type { ParsedSpec } from '@/lib/db/service-queries';
import type { SubSpec } from '@/lib/sub-specs';

export interface SpecRelationships {
  dependsOn: string[];
  related: string[];
  requiredBy?: string[]; // Downstream dependents (specs that depend on this one)
}

export type SpecWithMetadata = ParsedSpec & {
  subSpecs?: SubSpec[];
  relationships?: SpecRelationships;
};

export type SidebarSpec = Pick<SpecWithMetadata, 'id' | 'specNumber' | 'title' | 'specName' | 'status' | 'priority' | 'contentMd' | 'updatedAt'> & {
  tags: string[] | null;
  subSpecsCount?: number;
};
