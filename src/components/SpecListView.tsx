import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import type { SpecInfo } from '../spec-loader.js';
import { getStatusEmoji, getPriorityEmoji } from './ui/StatusBadge.js';

interface SpecListProps {
  specs: SpecInfo[];
  filter?: {
    status?: string;
    tags?: string[];
    priority?: string;
    assignee?: string;
  };
}

export const SpecListView: React.FC<SpecListProps> = ({ specs, filter }) => {
  // Group specs by date directory
  const byDate = new Map<string, SpecInfo[]>();
  for (const spec of specs) {
    const dateMatch = spec.path.match(/^(\d{8})\//);
    const dateKey = dateMatch ? dateMatch[1] : 'unknown';
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey)!.push(spec);
  }

  // Sort dates (newest first)
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  if (specs.length === 0) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Gradient name="rainbow">
            <Text bold>📄 Spec List</Text>
          </Gradient>
        </Box>
        
        <Box>
          <Text dimColor>
            {Object.keys(filter || {}).length > 0
              ? 'No specs match the specified filters.'
              : 'No specs found. Create one with: lspec create <name>'}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Box marginBottom={1}>
        <Gradient name="rainbow">
          <Text bold>📄 Spec List</Text>
        </Gradient>
      </Box>

      {/* Filter info */}
      {filter && Object.keys(filter).length > 0 && (
        <Box marginBottom={1}>
          <Text dimColor>
            Filtered by:{' '}
            {filter.status && `status=${filter.status} `}
            {filter.tags && `tags=${filter.tags.join(',')} `}
            {filter.priority && `priority=${filter.priority} `}
            {filter.assignee && `assignee=${filter.assignee}`}
          </Text>
        </Box>
      )}

      {/* Specs grouped by date */}
      {sortedDates.map((date, dateIdx) => {
        const dateSpecs = byDate.get(date)!;
        
        return (
          <Box key={date} flexDirection="column" marginBottom={dateIdx < sortedDates.length - 1 ? 1 : 0}>
            {/* Date header */}
            <Box marginBottom={1}>
              <Text color="cyan" bold>📂 {date}/</Text>
            </Box>

            {/* Specs in this date */}
            <Box flexDirection="column" paddingLeft={2}>
              {dateSpecs.map((spec, specIdx) => {
                const specName = spec.path.replace(/^\d{8}\//, '').replace(/\/$/, '');
                
                return (
                  <Box key={spec.path} flexDirection="column" marginBottom={specIdx < dateSpecs.length - 1 ? 1 : 0}>
                    {/* Spec name line */}
                    <Box>
                      <Text color="green">├─ </Text>
                      <Text bold>{specName}/</Text>
                    </Box>

                    {/* Metadata line */}
                    <Box paddingLeft={3}>
                      {/* Status */}
                      <Text>{getStatusEmoji(spec.frontmatter.status)} </Text>
                      
                      {/* Priority */}
                      {spec.frontmatter.priority && (
                        <Text>
                          {getPriorityEmoji(spec.frontmatter.priority)}{' '}
                          <Text color={
                            spec.frontmatter.priority === 'critical' ? 'red' :
                            spec.frontmatter.priority === 'high' ? 'yellow' :
                            spec.frontmatter.priority === 'medium' ? 'blue' :
                            'gray'
                          }>
                            {spec.frontmatter.priority}
                          </Text>
                          <Text dimColor> · </Text>
                        </Text>
                      )}

                      {/* Tags */}
                      {spec.frontmatter.tags && spec.frontmatter.tags.length > 0 && (
                        <Text dimColor>
                          [{spec.frontmatter.tags.map(tag => `#${tag}`).join(' ')}]
                        </Text>
                      )}

                      {/* Assignee */}
                      {spec.frontmatter.assignee && (
                        <Text>
                          <Text dimColor> · </Text>
                          <Text color="magenta">@{spec.frontmatter.assignee}</Text>
                        </Text>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}

      {/* Summary footer */}
      <Box marginTop={1}>
        <Text bold>
          Total: <Text color="green">{specs.length}</Text> spec{specs.length !== 1 ? 's' : ''}
        </Text>
      </Box>
    </Box>
  );
};
