import React from 'react';
import { ClipboardIcon, DownloadIcon, CheckIcon } from 'lucide-react';
import { Button } from '@leanspec/ui-components';

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

function extractTableData(children: React.ReactNode): string[][] {
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

export function EnhancedTable({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = React.useState(false);

  // Extract data on render
  const tableData = React.useMemo(() => extractTableData(children), [children]);

  const copyAsExcel = async () => {
    try {
      const tsv = tableData.map(row => row.join('\t')).join('\n');
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy table data:', err);
    }
  };

  const exportCsv = () => {
    try {
      const csv = tableData.map(row =>
        row.map(cell => {
          const escaped = cell.replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      ).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'table-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  return (
    <div className="relative group my-6">
      {tableData.length > 0 && (
        <div className="absolute -top-5 right-0 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity bg-background/80 backdrop-blur-sm p-1 rounded-lg border shadow-sm z-10">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyAsExcel} title="Copy as TSV (Excel)">
            {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={exportCsv} title="Export as CSV">
            <DownloadIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="w-full overflow-y-auto">
        <table className="w-full">
          {children}
        </table>
      </div>
    </div>
  );
}
