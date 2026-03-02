export type DetailedBreakdown = { 
/**
 * Tokens in code blocks
 */
codeBlocks: number, 
/**
 * Tokens in checklists (- [ ] items)
 */
checklists: number, 
/**
 * Tokens in plain prose/text
 */
prose: number, 
/**
 * Tokens per h2 section
 */
sections: Array<SectionTokenCount>, };