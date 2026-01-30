import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';

interface EnhancedCodeBlockProps {
  language: string | null;
  code: string;
  children: React.ReactNode;
}

export function EnhancedCodeBlock({ language, code, children }: EnhancedCodeBlockProps) {
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
    <div className="relative group my-4 rounded-lg bg-muted border dark:border-white/10">
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-white/10 bg-muted/50 dark:bg-black/20 rounded-t-lg">
        {language ? (
          <span className="text-xs text-muted-foreground font-mono uppercase">
            {language}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground font-mono">CODE</span>
        )}
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Copy code"
          title="Copy to clipboard"
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
