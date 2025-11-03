import React from 'react';
import { Box, Text } from 'ink';
import type { SpecInfo } from '../spec-loader.js';

interface SpecListProps {
  specs: SpecInfo[];
  title?: string;
  showMetadata?: boolean;
  compact?: boolean;
}

const STATUS_EMOJI: Record<string, string> = {
  planned: '📋',
  'in-progress': '⚡',
  complete: '✅',
  archived: '📦',
  draft: '📝',
  blocked: '🚫',
  cancelled: '❌',
};

const PRIORITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

export const SpecList: React.FC<SpecListProps> = ({ 
  specs, 
  title, 
  showMetadata = true,
  compact = false 
}) => {
  if (specs.length === 0) {
    return (
      <Box flexDirection="column">
        {title && (
          <Box marginBottom={1}>
            <Text bold color="green">{title}</Text>
          </Box>
        )}
        <Text dimColor>No specs found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold color="green">{title}</Text>
        </Box>
      )}

      {/* Header */}
      {!compact && (
        <Box marginBottom={1}>
          <Text dimColor>
            Found <Text color="cyan">{specs.length}</Text> spec{specs.length !== 1 ? 's' : ''}
          </Text>
        </Box>
      )}

      {/* Spec list */}
      {specs.map((spec, index) => (
        <Box key={spec.path} flexDirection="column" marginBottom={compact ? 0 : 1}>
          {/* Main line: status, priority, path */}
          <Box>
            <Text>
              {STATUS_EMOJI[spec.frontmatter.status] || '📄'}{' '}
              {spec.frontmatter.priority && PRIORITY_EMOJI[spec.frontmatter.priority]
                ? `${PRIORITY_EMOJI[spec.frontmatter.priority]} `
                : ''}
              <Text color="cyan" bold>{spec.path}</Text>
            </Text>
          </Box>

          {/* Metadata line */}
          {showMetadata && !compact && (
            <Box marginLeft={4}>
              <Text dimColor>
                {spec.frontmatter.created && `Created: ${spec.frontmatter.created}`}
                {spec.frontmatter.tags?.length && ` • Tags: ${spec.frontmatter.tags.join(', ')}`}
                {spec.frontmatter.assignee && ` • Assignee: ${spec.frontmatter.assignee}`}
              </Text>
            </Box>
          )}

          {/* Divider between specs (except last) */}
          {!compact && index < specs.length - 1 && (
            <Box>
              <Text dimColor>{'─'.repeat(60)}</Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};
