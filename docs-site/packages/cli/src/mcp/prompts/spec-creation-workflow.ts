/**
 * Spec Creation Workflow prompt - Guide complete spec creation with dependency linking
 */

/**
 * Spec Creation Workflow prompt definition
 * Use this when creating new specs to ensure proper dependency linking
 */
export function specCreationWorkflowPrompt() {
  return [
    'create-spec',
    {
      title: 'Create Spec with Dependencies',
      description: 'Complete workflow for creating a new spec including proper dependency linking. Prevents the common issue of content referencing specs without frontmatter links.',
    },
    () => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `## Create Spec Workflow 📝

Follow these steps to create a well-linked spec:

### Step 1: Pre-Creation Research
Before creating, use \`search\` to find related specs:
- Search for similar features or components
- Identify potential dependencies
- Note specs to reference

### Step 2: Create the Spec
Use \`create\` with the spec details:
\`\`\`
create {
  "name": "your-spec-name",
  "title": "Human Readable Title",
  "description": "Initial overview content...",
  "priority": "medium",
  "tags": ["relevant", "tags"]
}
\`\`\`

### Step 3: Link Dependencies (CRITICAL)
After creating, **immediately** link any referenced specs:

For each spec mentioned in content:
- "Depends on spec 045" → \`link { "spec": "your-spec", "dependsOn": ["045"] }\`
- "Related to spec 072" → \`link { "spec": "your-spec", "related": ["072"] }\`
- "See spec 110" → \`link { "spec": "your-spec", "related": ["110"] }\`

### Step 4: Verify
Use \`deps\` to verify all links are in place:
\`\`\`
deps { "spec": "your-spec" }
\`\`\`

### Step 5: Validate (REQUIRED)
Run dependency alignment check to ensure content matches frontmatter:
\`\`\`
validate { "specs": ["your-spec"], "checkDeps": true }
\`\`\`

⚠️ **Do not consider spec creation complete until validation passes with 0 dependency warnings!**

### Common Patterns to Link

| Content Pattern | Link Type |
|----------------|-----------|
| "depends on", "blocked by", "requires" | dependsOn |
| "related to", "see also", "similar to" | related |
| "builds on" | dependsOn (if blocking) or related |
| "## Related Specs" section | related (link each one) |

**Remember:** Content and frontmatter must stay aligned!`,
          },
        },
      ],
    })
  ] as const;
}
