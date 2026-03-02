export type ChecklistToggleRequest = { toggles: Array<ChecklistToggleItem>, expectedContentHash: string | null, 
/**
 * Optional sub-spec filename (e.g., "IMPLEMENTATION.md")
 */
subspec: string | null, };