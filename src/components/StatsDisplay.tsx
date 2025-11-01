import React from 'react';
import { Box, Text } from 'ink';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';

interface StatsProps {
  specs: SpecInfo[];
  filter?: {
    tag?: string;
    assignee?: string;
  };
}

export const StatsDisplay: React.FC<StatsProps> = ({ specs, filter }) => {
  // Calculate statistics
  const statusCounts: Record<SpecStatus, number> = {
    planned: 0,
    'in-progress': 0,
    complete: 0,
    archived: 0,
  };

  const priorityCounts: Record<SpecPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const tagCounts: Record<string, number> = {};

  for (const spec of specs) {
    // Count by status
    statusCounts[spec.frontmatter.status]++;

    // Count by priority
    if (spec.frontmatter.priority) {
      priorityCounts[spec.frontmatter.priority]++;
    }

    // Count by tags
    if (spec.frontmatter.tags) {
      for (const tag of spec.frontmatter.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }

  // Sort tags by count
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalWithPriority = Object.values(priorityCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="green">📊 Spec Statistics</Text>
      </Box>

      {/* Filter info */}
      {filter && (filter.tag || filter.assignee) && (
        <Box marginBottom={1}>
          <Text dimColor>
            Filtered by: {filter.tag && `tag=${filter.tag}`}
            {filter.tag && filter.assignee && ', '}
            {filter.assignee && `assignee=${filter.assignee}`}
          </Text>
        </Box>
      )}

      {/* Status breakdown */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Status:</Text>
        <Text>  📅 Planned:      <Text color="cyan">{statusCounts.planned.toString().padStart(3)}</Text></Text>
        <Text>  🔨 In Progress:  <Text color="yellow">{statusCounts['in-progress'].toString().padStart(3)}</Text></Text>
        <Text>  ✅ Complete:     <Text color="green">{statusCounts.complete.toString().padStart(3)}</Text></Text>
        <Text>  📦 Archived:     <Text dimColor>{statusCounts.archived.toString().padStart(3)}</Text></Text>
      </Box>

      {/* Priority breakdown */}
      {totalWithPriority > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Priority:</Text>
          {priorityCounts.critical > 0 && (
            <Text>  🔴 Critical:     <Text color="red">{priorityCounts.critical.toString().padStart(3)}</Text></Text>
          )}
          {priorityCounts.high > 0 && (
            <Text>  🟡 High:         <Text color="yellow">{priorityCounts.high.toString().padStart(3)}</Text></Text>
          )}
          {priorityCounts.medium > 0 && (
            <Text>  🟠 Medium:       <Text color="blue">{priorityCounts.medium.toString().padStart(3)}</Text></Text>
          )}
          {priorityCounts.low > 0 && (
            <Text>  🟢 Low:          <Text dimColor>{priorityCounts.low.toString().padStart(3)}</Text></Text>
          )}
        </Box>
      )}

      {/* Top tags */}
      {topTags.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Tags (top {topTags.length}):</Text>
          {topTags.map(([tag, count]) => (
            <Text key={tag}>
              {'  '}{tag.padEnd(20)} <Text color="cyan">{count.toString().padStart(3)}</Text>
            </Text>
          ))}
        </Box>
      )}

      {/* Total */}
      <Box>
        <Text bold>Total Specs: <Text color="green">{specs.length.toString()}</Text></Text>
      </Box>
    </Box>
  );
};
