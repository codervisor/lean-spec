/**
 * Plan project roadmap prompt
 */

import { z } from 'zod';

/**
 * Plan project roadmap prompt definition
 */
export function planProjectRoadmapPrompt() {
  return [
    'plan-project-roadmap',
    {
      title: 'Plan Project Roadmap',
      description: 'Interactive roadmap planning with phases, tasks, and dependencies',
      argsSchema: {
        goal: z.string(),
      },
    },
    ({ goal }: { goal: string }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Plan a project roadmap for: ${goal}

1. **Review Existing Work**: Analyze current specs using \`list\`/\`board\`, identify what's already planned/in-progress, assess how existing work relates to the new goal
2. **Break Down Goal**: Decompose the goal into logical phases or milestones
3. **Identify Tasks**: List key tasks and work items for each phase
4. **Map Dependencies**: Establish dependencies between tasks (what must be done first)
5. **Create Specs**: Create specification documents for major work items using the \`create\` tool
6. **Set Relationships**: Use \`link\` tool to establish \`depends_on\` and \`related\` relationships
7. **Timeline Estimation**: Provide realistic timeline based on task complexity and project velocity
8. **Risk Analysis**: Identify risks, unknowns, and mitigation strategies

Use the following tools to build the roadmap:
- \`list\` / \`board\` / \`stats\` - Understand current project state
- \`create\` - Create new specs for roadmap items
- \`link\` - Establish dependencies between specs
- \`update\` - Set priority and metadata

Provide a clear roadmap with:
- Phases/milestones with descriptions
- Key specs to create
- Dependency relationships
- Recommended execution order
- Actionable next steps to implement this plan`,
          },
        },
      ],
    })
  ] as const;
}
