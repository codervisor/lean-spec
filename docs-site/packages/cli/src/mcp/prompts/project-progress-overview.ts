/**
 * Project progress overview prompt
 */

/**
 * Project progress overview prompt definition
 */
export function projectProgressOverviewPrompt() {
  return [
    'project-progress-overview',
    {
      title: 'Project Progress Overview',
      description: 'Generate comprehensive project status report combining specs, git history, and metrics',
    },
    () => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze project progress and provide a comprehensive overview:

1. **Spec Analysis**: Review all specs using \`board\` and \`stats\`, group by status (planned/in-progress/complete), highlight any blockers or dependencies
2. **Recent Activity**: Examine git commit history (last 2 weeks), identify key changes and development patterns
3. **Current State**: Assess what's actively being worked on, what's completed, what's planned
4. **Velocity Metrics**: Calculate completion rates, average time in each status, and throughput trends
5. **Risk Assessment**: Identify stalled specs, missing dependencies, potential bottlenecks
6. **Next Steps**: Recommend priority actions based on current project state

Use the following tools to gather data:
- \`board\` - Get Kanban view of specs by status
- \`stats\` - Get project metrics
- \`list\` - List specs with filters
- \`deps\` - Analyze dependencies for critical specs
- Terminal git commands - Analyze recent commit history

Provide a clear, actionable summary that helps understand project health and next steps.`,
          },
        },
      ],
    })
  ] as const;
}
