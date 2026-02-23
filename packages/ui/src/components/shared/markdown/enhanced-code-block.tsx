import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EnhancedCodeBlockProps {
  language: string | null;
  code: string;
  children: React.ReactNode;
}

export function EnhancedCodeBlock({ language, code, children }: EnhancedCodeBlockProps) {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="relative group my-4 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-zinc-800 bg-slate-200/50 dark:bg-zinc-800/50 rounded-t-lg">
        {language ? (
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono uppercase">
            {language}
          </span>
        ) : (
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">{t('specDetail.codeBlock.label')}</span>
        )}
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
          aria-label={t('specDetail.codeBlock.copy')}
          title={t('specDetail.codeBlock.copyToClipboard')}
        >
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        </button>
      </div>
      <div className="overflow-x-auto p-4 [&>pre]:!m-0 [&>pre]:!bg-transparent [&>pre]:!p-0 [&>code]:!bg-transparent [&>code]:!p-0">
        {children}
      </div>
    </div>
  );
}
