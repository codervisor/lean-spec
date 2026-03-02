export type ListSpecsResponse = { specs: Array<SpecSummary>, total: number, nextCursor: string | null, projectId: string | null, 
/**
 * Pre-built hierarchy tree (only when hierarchy=true query param)
 */
hierarchy: Array<HierarchyNode> | null, };