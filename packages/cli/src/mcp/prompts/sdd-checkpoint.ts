/**
 * SDD Checkpoint prompt - Periodic reminder for SDD compliance
 */

/**
 * SDD Checkpoint prompt definition
 * Call this periodically during long sessions to maintain SDD compliance
 */
export function sddCheckpointPrompt() {
  return [
    'checkpoint',
    {
      title: 'SDD Compliance Checkpoint',
      description: 'Periodic reminder to verify SDD workflow compliance - check spec status, update progress, ensure specs are in sync',
    },
    () => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `## SDD Checkpoint ✅

**Before continuing, let's verify SDD compliance:**

### Step 1: Review Current State
Use the \`board\` tool to see project status and identify:
- Specs marked "in-progress" - are they still being worked on?
- Specs that should be "complete" but aren't marked
- Any work being done without a spec

### Step 2: Check Your Current Task
For the work you're currently doing:
- **Is there a spec for it?** If not, create one with \`create\`
- **Is the status correct?** Update with \`update\` if needed
- **Have you documented decisions?** Add notes to the spec

### Step 3: Update Progress
For any specs you've worked on:
1. Update status if changed (\`planned\` → \`in-progress\` → \`complete\`)
2. Document key decisions or changes in the spec content
3. Link related specs if you discovered connections

### Action Items
Based on the board review:
1. List any specs with stale status
2. Identify work being done without specs
3. Suggest status updates needed

**Remember:** 
- Specs track implementation, not documentation
- Update status BEFORE starting work, AFTER completing
- Keep specs in sync with actual progress`,
          },
        },
      ],
    })
  ] as const;
}
