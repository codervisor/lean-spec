import React from 'react';
import { Box, Text } from 'ink';
import type { SpecInfo } from '../spec-loader.js';
import type { LeanSpecConfig } from '../config.js';
import { getStatusEmoji, getPriorityEmoji } from './ui/StatusBadge.js';

interface SpecListProps {
  specs: SpecInfo[];
  config: LeanSpecConfig;
  filter?: {
    status?: string;
    tags?: string[];
    priority?: string;
    assignee?: string;
  };
}

export const SpecListView: React.FC<SpecListProps> = ({ specs, config, filter }) => {
  // Detect if we should use date-based grouping
  const useDateGrouping = 
    config.structure.pattern === 'custom' && 
    config.structure.groupExtractor?.includes('YYYY');

  if (useDateGrouping) {
    return <DateGroupedView specs={specs} filter={filter} />;
  } else {
    return <FlatView specs={specs} filter={filter} />;
  }
};

// Flat view - no grouping, simple list
const FlatView: React.FC<{ specs: SpecInfo[]; filter?: SpecListProps['filter'] }> = ({ specs, filter }) => {
  if (specs.length === 0) {
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color="cyan">📄 Spec List</Text>
        </Box>
        
        <Box>
          <Text dimColor>
            {Object.keys(filter || {}).length > 0
              ? 'No specs match the specified filters.'
              : 'No specs found. Create one with: lean-spec create <name>'}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Box>
        <Text bold color="cyan">📄 Spec List</Text>
      </Box>

      {/* Filter info */}
      {filter && Object.keys(filter).length > 0 && (
        <Box>
          <Text dimColor>
            Filtered by:{' '}
            {filter.status && `status=${filter.status} `}
            {filter.tags && `tags=${filter.tags.join(',')} `}
            {filter.priority && `priority=${filter.priority} `}
            {filter.assignee && `assignee=${filter.assignee}`}
          </Text>
        </Box>
      )}

      {/* All specs in a simple list */}
      <Box flexDirection="column" paddingLeft={2}>
        {specs.map((spec, idx) => {
          const isLast = idx === specs.length - 1;
          
          return (
            <Box key={spec.path} flexDirection="column">
              {/* Spec name line */}
              <Box>
                <Text color="cyan">{isLast ? '└─' : '├─'} </Text>
                <Text bold>{spec.path}/</Text>
              </Box>

              {/* Metadata line */}
              <Box>
                <Text color="cyan">{isLast ? '  ' : '│ '} </Text>
                <Text>
                  {/* Status */}
                  {getStatusEmoji(spec.frontmatter.status)} 
                
                  {/* Priority */}
                  {spec.frontmatter.priority && (
                    <>
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
                    </>
                  )}

                  {/* Tags */}
                  {spec.frontmatter.tags && Array.isArray(spec.frontmatter.tags) && spec.frontmatter.tags.length > 0 && (
                    <Text dimColor>
                      [{spec.frontmatter.tags.map(tag => `#${tag}`).join(' ')}]
                    </Text>
                  )}

                  {/* Assignee */}
                  {spec.frontmatter.assignee && (
                    <>
                      <Text dimColor> · </Text>
                      <Text color="magenta">@{spec.frontmatter.assignee}</Text>
                    </>
                  )}
                </Text>
              </Box>
              
              {/* Separator line between specs */}
              {!isLast && (
                <Box>
                  <Text color="cyan">│</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Summary footer */}
      <Box marginTop={1}>
        <Text bold>
          Total: <Text color="green">{specs.length}</Text> spec{specs.length !== 1 ? 's' : ''}
        </Text>
      </Box>
    </Box>
  );
};

// Date-grouped view - original behavior
const DateGroupedView: React.FC<{ specs: SpecInfo[]; filter?: SpecListProps['filter'] }> = ({ specs, filter }) => {
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
        <Box>
          <Text bold color="cyan">📄 Spec List</Text>
        </Box>
        
        <Box>
          <Text dimColor>
            {Object.keys(filter || {}).length > 0
              ? 'No specs match the specified filters.'
              : 'No specs found. Create one with: lean-spec create <name>'}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Box>
        <Text bold color="cyan">📄 Spec List</Text>
      </Box>

      {/* Filter info */}
      {filter && Object.keys(filter).length > 0 && (
        <Box>
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
            <Box>
              <Text color="cyan" bold>📂 {date}/</Text>
            </Box>

            {/* Specs in this date */}
            <Box flexDirection="column" paddingLeft={2}>
              {dateSpecs.map((spec, specIdx) => {
                const specName = spec.path.replace(/^\d{8}\//, '').replace(/\/$/, '');
                const isLast = specIdx === dateSpecs.length - 1;
                
                return (
                  <Box key={spec.path} flexDirection="column">
                    {/* Spec name line */}
                    <Box>
                      <Text color="green">{isLast ? '└─' : '├─'} </Text>
                      <Text bold>{specName}/</Text>
                    </Box>

                    {/* Metadata line */}
                    <Box>
                      <Text color="green">{isLast ? '  ' : '│ '} </Text>
                      <Text>
                        {/* Status */}
                        {getStatusEmoji(spec.frontmatter.status)} 
                      
                        {/* Priority */}
                        {spec.frontmatter.priority && (
                          <>
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
                          </>
                        )}

                        {/* Tags */}
                        {spec.frontmatter.tags && Array.isArray(spec.frontmatter.tags) && spec.frontmatter.tags.length > 0 && (
                          <Text dimColor>
                            [{spec.frontmatter.tags.map(tag => `#${tag}`).join(' ')}]
                          </Text>
                        )}

                        {/* Assignee */}
                        {spec.frontmatter.assignee && (
                          <>
                            <Text dimColor> · </Text>
                            <Text color="magenta">@{spec.frontmatter.assignee}</Text>
                          </>
                        )}
                      </Text>
                    </Box>
                    {/* Separator line between specs */}
                    {!isLast && (
                      <Box>
                        <Text color="green">│</Text>
                      </Box>
                    )}
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
