export type ListSpecsQuery = { status: string | null, priority: string | null, tags: string | null, assignee: string | null, limit: number | null, offset: number | null, cursor: string | null, 
/**
 * When true, return pre-built hierarchy tree structure for performance
 */
hierarchy: boolean | null, };