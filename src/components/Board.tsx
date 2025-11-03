import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecStatus } from '../frontmatter.js';
import { Card } from './ui/Card.js';

interface BoardProps {
  specs: SpecInfo[];
  showComplete?: boolean;
  filter?: {
    tag?: string;
    assignee?: string;
  };
}

const STATUS_CONFIG: Record<SpecStatus, { emoji: string; label: string; color: string }> = {
  planned: { emoji: '📅', label: 'Planned', color: 'cyan' },
  'in-progress': { emoji: '🔨', label: 'In Progress', color: 'yellow' },
  complete: { emoji: '✅', label: 'Complete', color: 'green' },
  archived: { emoji: '📦', label: 'Archived', color: 'gray' },
};

interface ColumnProps {
  title: string;
  emoji: string;
  specs: SpecInfo[];
  expanded: boolean;
  color: string;
}

const Column: React.FC<ColumnProps> = ({ title, emoji, specs, expanded, color }) => {
  const width = 68;
  const count = specs.length;
  const header = `${emoji} ${title} (${count})`;
  const padding = Math.max(0, width - header.length - 4);

  const isRounded = true;
  const topLeft = '╭';
  const topRight = '╮';
  const bottomLeft = '╰';
  const bottomRight = '╯';
  const horizontal = '─';
  const vertical = '│';

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top border with title */}
      <Text>
        {topLeft}{horizontal} <Text bold color={color}>{header}</Text> {horizontal.repeat(padding)}{topRight}
      </Text>

      {/* Content */}
      {expanded && specs.length > 0 ? (
        specs.map((spec, index) => (
          <Box key={spec.path} flexDirection="column">
            {/* Spec name with better formatting */}
            <Text>
              {vertical} <Text color="cyan" bold>{spec.path.padEnd(width - 2)}</Text>{vertical}
            </Text>

            {/* Metadata line with tags and priority */}
            {(spec.frontmatter.tags?.length || spec.frontmatter.priority || spec.frontmatter.assignee) && (() => {
              const parts: string[] = [];
              
              if (spec.frontmatter.tags?.length) {
                const tagStr = spec.frontmatter.tags.map(tag => `#${tag}`).join(' ');
                parts.push(tagStr);
              }
              
              if (spec.frontmatter.priority) {
                const priorityEmoji = {
                  critical: '🔴',
                  high: '🟡',
                  medium: '🟠',
                  low: '🟢',
                }[spec.frontmatter.priority];
                parts.push(`${priorityEmoji} ${spec.frontmatter.priority}`);
              }
              
              if (spec.frontmatter.assignee) {
                parts.push(`@${spec.frontmatter.assignee}`);
              }
              
              const metaText = parts.join(' · ');
              const paddingNeeded = Math.max(0, width - 2 - metaText.length);
              
              return (
                <Text>
                  {vertical} <Text dimColor>{metaText}</Text>{' '.repeat(paddingNeeded)}{vertical}
                </Text>
              );
            })()}

            {/* Spacing between specs */}
            {index < specs.length - 1 && (
              <Text>{vertical} {' '.repeat(width - 2)}{vertical}</Text>
            )}
          </Box>
        ))
      ) : !expanded && specs.length > 0 ? (
        <Text>
          {vertical} <Text dimColor>(collapsed, use --show-complete to expand)</Text>
          {' '.repeat(Math.max(0, width - 47))}{vertical}
        </Text>
      ) : (
        <Text>
          {vertical} <Text dimColor>(no specs)</Text>
          {' '.repeat(Math.max(0, width - 13))}{vertical}
        </Text>
      )}

      {/* Bottom border */}
      <Text>{bottomLeft}{horizontal.repeat(width)}{bottomRight}</Text>
    </Box>
  );
};

export const Board: React.FC<BoardProps> = ({ specs, showComplete, filter }) => {
  // Group specs by status
  const columns: Record<SpecStatus, SpecInfo[]> = {
    planned: [],
    'in-progress': [],
    complete: [],
    archived: [],
  };

  for (const spec of specs) {
    // Handle invalid status by treating as 'planned'
    const status = columns[spec.frontmatter.status] !== undefined 
      ? spec.frontmatter.status 
      : 'planned';
    columns[status].push(spec);
  }

  return (
    <Box flexDirection="column">
      {/* Title with gradient */}
      <Box marginBottom={1}>
        <Gradient name="rainbow">
          <Text bold>📋 Spec Kanban Board</Text>
        </Gradient>
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

      {/* Columns */}
      <Column
        title={STATUS_CONFIG.planned.label}
        emoji={STATUS_CONFIG.planned.emoji}
        specs={columns.planned}
        expanded={true}
        color={STATUS_CONFIG.planned.color}
      />

      <Column
        title={STATUS_CONFIG['in-progress'].label}
        emoji={STATUS_CONFIG['in-progress'].emoji}
        specs={columns['in-progress']}
        expanded={true}
        color={STATUS_CONFIG['in-progress'].color}
      />

      <Column
        title={STATUS_CONFIG.complete.label}
        emoji={STATUS_CONFIG.complete.emoji}
        specs={columns.complete}
        expanded={showComplete || false}
        color={STATUS_CONFIG.complete.color}
      />
    </Box>
  );
};
