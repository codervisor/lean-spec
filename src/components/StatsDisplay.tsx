import React from 'react';
import { Box, Text } from 'ink';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';
import { Panel } from './ui/Panel.js';
import { KeyValueList } from './ui/KeyValueList.js';

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

  // Create a bar chart for status distribution
  const maxCount = Math.max(...Object.values(statusCounts));
  const barWidth = 40;
  const createBar = (count: number, color: string) => {
    const width = Math.round((count / maxCount) * barWidth);
    return <Text color={color}>{'━'.repeat(width)}</Text>;
  };

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Box>
        <Text bold color="cyan">📊 Spec Statistics Dashboard</Text>
      </Box>

      {/* Filter info */}
      {filter && (filter.tag || filter.assignee) && (
        <Box>
          <Text dimColor>
            Filtered by: {filter.tag && `tag=${filter.tag}`}
            {filter.tag && filter.assignee && ', '}
            {filter.assignee && `assignee=${filter.assignee}`}
          </Text>
        </Box>
      )}

      {/* Overview Panel */}
      <Panel title="📈 Overview" border="rounded" padding={0} width={70}>
        <KeyValueList
          items={[
            { key: 'Total Specs', value: specs.length.toString(), valueColor: 'green' },
            { key: 'With Priority', value: totalWithPriority.toString(), valueColor: 'cyan' },
            { key: 'Unique Tags', value: Object.keys(tagCounts).length.toString(), valueColor: 'magenta' },
          ]}
          keyWidth={20}
        />
      </Panel>

      {/* Status Panel with Bar Charts */}
      <Box marginTop={1}>
        <Panel title="📊 Status Distribution" border="rounded" padding={0} width={70}>
          <Box flexDirection="column">
            <Box>
              <Text>📋 {'Planned'.padEnd(13)}</Text>
              {createBar(statusCounts.planned, 'cyan')}
              <Text color="cyan"> {statusCounts.planned}</Text>
            </Box>
            <Box>
              <Text>⚡ {'In Progress'.padEnd(13)}</Text>
              {createBar(statusCounts['in-progress'], 'yellow')}
              <Text color="yellow"> {statusCounts['in-progress']}</Text>
            </Box>
            <Box>
              <Text>✅ {'Complete'.padEnd(13)}</Text>
              {createBar(statusCounts.complete, 'green')}
              <Text color="green"> {statusCounts.complete}</Text>
            </Box>
            <Box>
              <Text>📦 {'Archived'.padEnd(13)}</Text>
              {createBar(statusCounts.archived, 'gray')}
              <Text dimColor> {statusCounts.archived}</Text>
            </Box>
          </Box>
        </Panel>
      </Box>

      {/* Priority Panel */}
      {totalWithPriority > 0 && (
        <Box marginTop={1}>
          <Panel title="🎯 Priority Breakdown" border="rounded" padding={0} width={70}>
            <Box flexDirection="column">
              {priorityCounts.critical > 0 && (
                <Box>
                  <Text>🔴 {'Critical'.padEnd(13)}</Text>
                  {createBar(priorityCounts.critical, 'red')}
                  <Text color="red"> {priorityCounts.critical}</Text>
                </Box>
              )}
              {priorityCounts.high > 0 && (
                <Box>
                  <Text>🟠 {'High'.padEnd(13)}</Text>
                  {createBar(priorityCounts.high, 'yellow')}
                  <Text color="yellow"> {priorityCounts.high}</Text>
                </Box>
              )}
              {priorityCounts.medium > 0 && (
                <Box>
                  <Text>🟡 {'Medium'.padEnd(13)}</Text>
                  {createBar(priorityCounts.medium, 'yellow')}
                  <Text color="yellow"> {priorityCounts.medium}</Text>
                </Box>
              )}
              {priorityCounts.low > 0 && (
                <Box>
                  <Text>🟢 {'Low'.padEnd(13)}</Text>
                  {createBar(priorityCounts.low, 'green')}
                  <Text color="green"> {priorityCounts.low}</Text>
                </Box>
              )}
            </Box>
          </Panel>
        </Box>
      )}

      {/* Top Tags Panel */}
      {topTags.length > 0 && (
        <Box marginTop={1}>
          <Panel title="🏷️  Popular Tags" border="rounded" padding={0} width={70}>
            <Box flexDirection="column">
              {topTags.map(([tag, count]) => (
                <Box key={tag}>
                  <Text>{tag.padEnd(20)}</Text>
                  {createBar(count, 'magenta')}
                  <Text color="magenta"> {count}</Text>
                </Box>
              ))}
            </Box>
          </Panel>
        </Box>
      )}
    </Box>
  );
};
