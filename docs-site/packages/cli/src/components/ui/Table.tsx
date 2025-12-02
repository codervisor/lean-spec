import React from 'react';
import { Box, Text } from 'ink';

interface TableColumn {
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: number | 'auto';
  color?: string;
}

interface TableRow {
  [key: string]: string | number | React.ReactNode;
}

interface TableProps {
  columns: TableColumn[];
  rows: TableRow[];
  border?: 'rounded' | 'square' | 'none';
  headerColor?: string;
  borderColor?: string;
}

export const Table: React.FC<TableProps> = ({
  columns,
  rows,
  border = 'rounded',
  headerColor = 'cyan',
  borderColor,
}) => {
  const isRounded = border === 'rounded';
  
  // Border characters
  const topLeft = isRounded ? '╭' : '┌';
  const topRight = isRounded ? '╮' : '┐';
  const bottomLeft = isRounded ? '╰' : '└';
  const bottomRight = isRounded ? '╯' : '┘';
  const horizontal = '─';
  const vertical = '│';
  const cross = isRounded ? '┼' : '┼';
  const topJoin = isRounded ? '┬' : '┬';
  const bottomJoin = isRounded ? '┴' : '┴';
  const leftJoin = '├';
  const rightJoin = '┤';

  // Calculate column widths
  const columnWidths = columns.map((col, idx) => {
    if (col.width && col.width !== 'auto') return col.width;
    
    // Auto-calculate width based on content
    const headerLength = col.header.length;
    const maxContentLength = Math.max(
      ...rows.map(row => {
        const value = Object.values(row)[idx];
        return typeof value === 'string' || typeof value === 'number'
          ? String(value).length
          : 10; // Default width for React nodes
      }),
      headerLength
    );
    
    return Math.min(maxContentLength + 2, 40); // Max width of 40
  });

  const formatCell = (content: string | number | React.ReactNode, width: number, align: 'left' | 'center' | 'right' = 'left'): string => {
    const str = typeof content === 'string' || typeof content === 'number' ? String(content) : '';
    const truncated = str.length > width ? str.slice(0, width - 3) + '...' : str;
    const padding = width - truncated.length;
    
    if (align === 'center') {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + truncated + ' '.repeat(rightPad);
    } else if (align === 'right') {
      return ' '.repeat(padding) + truncated;
    } else {
      return truncated + ' '.repeat(padding);
    }
  };

  if (border === 'none') {
    return (
      <Box flexDirection="column">
        {/* Header */}
        <Box>
          {columns.map((col, idx) => (
            <Text key={idx} bold color={headerColor}>
              {formatCell(col.header, columnWidths[idx], col.align)}
              {idx < columns.length - 1 && '  '}
            </Text>
          ))}
        </Box>

        {/* Rows */}
        {rows.map((row, rowIdx) => (
          <Box key={rowIdx}>
            {columns.map((col, colIdx) => {
              const value = Object.values(row)[colIdx];
              return (
                <Text key={colIdx} color={col.color}>
                  {formatCell(value as string, columnWidths[colIdx], col.align)}
                  {colIdx < columns.length - 1 && '  '}
                </Text>
              );
            })}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Top border */}
      <Text color={borderColor}>
        {topLeft}
        {columnWidths.map((width, idx) => (
          <React.Fragment key={idx}>
            {horizontal.repeat(width)}
            {idx < columnWidths.length - 1 ? topJoin : ''}
          </React.Fragment>
        ))}
        {topRight}
      </Text>

      {/* Header row */}
      <Text>
        <Text color={borderColor}>{vertical}</Text>
        {columns.map((col, idx) => (
          <React.Fragment key={idx}>
            <Text bold color={headerColor}>
              {formatCell(col.header, columnWidths[idx], col.align)}
            </Text>
            <Text color={borderColor}>{vertical}</Text>
          </React.Fragment>
        ))}
      </Text>

      {/* Header separator */}
      <Text color={borderColor}>
        {leftJoin}
        {columnWidths.map((width, idx) => (
          <React.Fragment key={idx}>
            {horizontal.repeat(width)}
            {idx < columnWidths.length - 1 ? cross : ''}
          </React.Fragment>
        ))}
        {rightJoin}
      </Text>

      {/* Data rows */}
      {rows.map((row, rowIdx) => (
        <Text key={rowIdx}>
          <Text color={borderColor}>{vertical}</Text>
          {columns.map((col, colIdx) => {
            const value = Object.values(row)[colIdx];
            return (
              <React.Fragment key={colIdx}>
                <Text color={col.color}>
                  {formatCell(value as string, columnWidths[colIdx], col.align)}
                </Text>
                <Text color={borderColor}>{vertical}</Text>
              </React.Fragment>
            );
          })}
        </Text>
      ))}

      {/* Bottom border */}
      <Text color={borderColor}>
        {bottomLeft}
        {columnWidths.map((width, idx) => (
          <React.Fragment key={idx}>
            {horizontal.repeat(width)}
            {idx < columnWidths.length - 1 ? bottomJoin : ''}
          </React.Fragment>
        ))}
        {bottomRight}
      </Text>
    </Box>
  );
};
