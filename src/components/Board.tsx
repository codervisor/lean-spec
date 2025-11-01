import React from 'react';
import { Box, Text } from 'ink';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecStatus } from '../frontmatter.js';

interface BoardProps {
  specs: SpecInfo[];
  showComplete?: boolean;
  filter?: {
    tag?: string;
    assignee?: string;
  };
}

const STATUS_CONFIG: Record<SpecStatus, { emoji: string; label: string; color: string }> = {
  planned: { emoji: '📅', label: 'Planned', color: 'gray' },
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
  const width = 60;
  const count = specs.length;
  const header = `${emoji} ${title} (${count})`;
  const padding = Math.max(0, width - header.length - 4);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top border */}
      <Text>┌─ {header} {'─'.repeat(padding)}┐</Text>

      {/* Content */}
      {expanded && specs.length > 0 ? (
        specs.map((spec, index) => (
          <Box key={spec.path} flexDirection="column">
            <Text>
              │ <Text color="cyan">{spec.path.padEnd(width - 2)}</Text>│
            </Text>

            {/* Metadata line */}
            {(spec.frontmatter.tags?.length || spec.frontmatter.priority || spec.frontmatter.assignee) && (() => {
              const parts: string[] = [];
              if (spec.frontmatter.tags?.length) {
                parts.push(`[${spec.frontmatter.tags.join(', ')}]`);
              }
              if (spec.frontmatter.priority) {
                parts.push(`priority: ${spec.frontmatter.priority}`);
              }
              if (spec.frontmatter.assignee) {
                parts.push(`assignee: ${spec.frontmatter.assignee}`);
              }
              const metaText = parts.join(' ');
              const paddingNeeded = Math.max(0, width - 2 - metaText.length);
              
              return (
                <Text>
                  │ <Text dimColor>{metaText}</Text>{' '.repeat(paddingNeeded)}│
                </Text>
              );
            })()}

            {/* Spacing between specs */}
            {index < specs.length - 1 && (
              <Text>│ {' '.repeat(width - 2)}│</Text>
            )}
          </Box>
        ))
      ) : !expanded && specs.length > 0 ? (
        <Text>
          │ <Text dimColor>(collapsed, use --show-complete to expand)</Text>
          {' '.repeat(Math.max(0, width - 47))}│
        </Text>
      ) : (
        <Text>
          │ <Text dimColor>(no specs)</Text>
          {' '.repeat(Math.max(0, width - 13))}│
        </Text>
      )}

      {/* Bottom border */}
      <Text>└{'─'.repeat(width)}┘</Text>
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
    columns[spec.frontmatter.status].push(spec);
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="green">📋 Spec Board</Text>
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
