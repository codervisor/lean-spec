export type MetadataUpdate = { status: string | null, priority: string | null, tags: Array<string> | null, assignee: string | null, addDependsOn: Array<string> | null, removeDependsOn: Array<string> | null, parent: string | null | null, expectedContentHash: string | null, 
/**
 * Skip completion verification when setting status to complete
 */
force: boolean | null, };