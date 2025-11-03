import React from 'react';
import { Box, Text } from 'ink';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  border?: 'rounded' | 'square' | 'none';
  padding?: number;
  width?: number | 'auto';
  titleColor?: string;
  borderColor?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  border = 'rounded',
  padding = 1,
  width = 'auto',
  titleColor = 'green',
  borderColor,
}) => {
  if (border === 'none') {
    return (
      <Box flexDirection="column" paddingX={padding} paddingY={padding}>
        {title && (
          <Box marginBottom={1}>
            <Text bold color={titleColor}>
              {title}
            </Text>
          </Box>
        )}
        {children}
      </Box>
    );
  }

  const isRounded = border === 'rounded';
  const topLeft = isRounded ? '╭' : '┌';
  const topRight = isRounded ? '╮' : '┐';
  const bottomLeft = isRounded ? '╰' : '└';
  const bottomRight = isRounded ? '╯' : '┘';
  const horizontal = '─';
  const vertical = '│';

  // Calculate width based on content or fixed width
  const actualWidth = typeof width === 'number' ? width : 60;
  
  return (
    <Box flexDirection="column">
      {/* Top border with title */}
      <Text color={borderColor}>
        {topLeft}
        {title ? (
          <>
            {horizontal} <Text bold color={titleColor}>{title}</Text> {horizontal.repeat(Math.max(0, actualWidth - title.length - 6))}
          </>
        ) : (
          horizontal.repeat(actualWidth)
        )}
        {topRight}
      </Text>

      {/* Content */}
      <Box flexDirection="column">
        <Box paddingX={padding} paddingY={padding}>
          {children}
        </Box>
      </Box>

      {/* Bottom border */}
      <Text color={borderColor}>
        {bottomLeft}{horizontal.repeat(actualWidth)}{bottomRight}
      </Text>
    </Box>
  );
};
