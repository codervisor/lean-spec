import React from 'react';
import { Box, Text } from 'ink';

interface CardProps {
  title: string;
  subtitle?: string;
  metadata?: Array<{ label: string; value: string; color?: string }>;
  children?: React.ReactNode;
  border?: 'rounded' | 'square' | 'none';
  width?: number;
  borderColor?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  metadata = [],
  children,
  border = 'rounded',
  width = 60,
  borderColor,
}) => {
  const isRounded = border === 'rounded';
  const topLeft = isRounded ? '╭' : '┌';
  const topRight = isRounded ? '╮' : '┐';
  const bottomLeft = isRounded ? '╰' : '└';
  const bottomRight = isRounded ? '╯' : '┘';
  const horizontal = '─';
  const vertical = '│';

  if (border === 'none') {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Box marginBottom={subtitle || metadata.length > 0 ? 1 : 0}>
          <Text bold color="cyan">
            {title}
          </Text>
        </Box>

        {subtitle && (
          <Box marginBottom={metadata.length > 0 ? 1 : 0}>
            <Text dimColor>{subtitle}</Text>
          </Box>
        )}

        {metadata.length > 0 && (
          <Box flexDirection="column" marginBottom={children ? 1 : 0}>
            {metadata.map((item, idx) => (
              <Box key={idx}>
                <Text dimColor>{item.label}: </Text>
                <Text color={item.color}>{item.value}</Text>
              </Box>
            ))}
          </Box>
        )}

        {children}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Top border */}
      <Text color={borderColor}>
        {topLeft}{horizontal.repeat(width - 2)}{topRight}
      </Text>

      {/* Title */}
      <Text>
        <Text color={borderColor}>{vertical}</Text>
        <Text bold color="cyan">
          {' '}{title.padEnd(width - 4)}{' '}
        </Text>
        <Text color={borderColor}>{vertical}</Text>
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text>
          <Text color={borderColor}>{vertical}</Text>
          <Text dimColor>
            {' '}{subtitle.padEnd(width - 4)}{' '}
          </Text>
          <Text color={borderColor}>{vertical}</Text>
        </Text>
      )}

      {/* Metadata */}
      {metadata.length > 0 && (
        <>
          {metadata.map((item, idx) => (
            <Text key={idx}>
              <Text color={borderColor}>{vertical}</Text>
              <Text dimColor>
                {' '}{item.label}: <Text color={item.color}>{item.value}</Text>
                {' '.repeat(Math.max(0, width - 6 - item.label.length - item.value.length))}
              </Text>
              <Text color={borderColor}>{vertical}</Text>
            </Text>
          ))}
        </>
      )}

      {/* Separator before content */}
      {children && (
        <Text color={borderColor}>
          {vertical}{' '.repeat(width - 2)}{vertical}
        </Text>
      )}

      {/* Content */}
      {children && (
        <Box>
          <Text color={borderColor}>{vertical}</Text>
          <Box paddingX={1} width={width - 4}>
            {children}
          </Box>
          <Text color={borderColor}>{vertical}</Text>
        </Box>
      )}

      {/* Bottom border */}
      <Text color={borderColor}>
        {bottomLeft}{horizontal.repeat(width - 2)}{bottomRight}
      </Text>
    </Box>
  );
};
