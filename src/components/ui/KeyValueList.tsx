import React from 'react';
import { Box, Text } from 'ink';

interface KeyValueItem {
  key: string;
  value: string | number | React.ReactNode;
  color?: string;
  valueColor?: string;
}

interface KeyValueListProps {
  items: KeyValueItem[];
  keyWidth?: number;
  separator?: string;
}

export const KeyValueList: React.FC<KeyValueListProps> = ({
  items,
  keyWidth = 15,
  separator = ': ',
}) => {
  return (
    <Box flexDirection="column">
      {items.map((item, idx) => {
        const paddedKey = item.key.padEnd(keyWidth);
        return (
          <Box key={idx}>
            <Text color={item.color || 'gray'} dimColor>
              {paddedKey}
            </Text>
            <Text>{separator}</Text>
            <Text color={item.valueColor}>
              {typeof item.value === 'string' || typeof item.value === 'number'
                ? item.value
                : item.value}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
