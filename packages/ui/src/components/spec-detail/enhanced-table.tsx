import React from 'react';
import { ClipboardIcon, DownloadIcon, CheckIcon } from 'lucide-react';
import { Button } from '@leanspec/ui-components';
import { extractTableData } from './utils';
import { useTranslation } from 'react-i18next';

export function EnhancedTable({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
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
      a.download = t('specDetail.table.defaultFileName');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  return (
    <div className="relative group">
      {tableData.length > 0 && (
        <div className="absolute -top-3.5 right-0 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity bg-background/80 backdrop-blur-sm p-1 rounded-lg border shadow-sm z-10">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyAsExcel} title={t('specDetail.table.copyTsv')}>
            {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={exportCsv} title={t('specDetail.table.exportCsv')}>
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
