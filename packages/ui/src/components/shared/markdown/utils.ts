import React from 'react';

// Helper to extract text from React nodes recursively
export function extractTextFromNode(node: React.ReactNode): string {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join('');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractTextFromNode(props.children);
  }
  return '';
}

export function extractTableData(children: React.ReactNode): string[][] {
  const rows: string[][] = [];

  // We expect children to be thead, tbody, etc.
  React.Children.forEach(children, (part) => {
    if (!React.isValidElement(part)) return;

    // thead or tbody
    if (part.type === 'thead' || part.type === 'tbody') {
      const partProps = part.props as { children?: React.ReactNode };
      React.Children.forEach(partProps.children, (tr) => {
        if (!React.isValidElement(tr) || tr.type !== 'tr') return;

        const rowData: string[] = [];
        const trProps = tr.props as { children?: React.ReactNode };
        React.Children.forEach(trProps.children, (cell) => {
          if (!React.isValidElement(cell) || (cell.type !== 'th' && cell.type !== 'td')) return;
          const cellProps = cell.props as { children?: React.ReactNode };
          rowData.push(extractTextFromNode(cellProps.children));
        });
        if (rowData.length > 0) rows.push(rowData);
      });
    }
  });

  return rows;
}
