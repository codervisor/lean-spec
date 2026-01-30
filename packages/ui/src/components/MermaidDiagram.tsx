import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts';
import { Dialog, DialogContent } from './ui/dialog';
import { cn } from '../lib/utils';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

// Generate unique IDs for Mermaid diagrams using crypto.randomUUID or fallback
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `mermaid-${crypto.randomUUID()}`;
  }
  // Fallback for older browsers
  return `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [id] = useState(generateId);
  const [isOpen, setIsOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation(['common', 'errors']);

  useEffect(() => {
    if (!chart) return;

    let cancelled = false;

    const renderDiagram = async () => {
      try {
        setError(null);
        setSvg('');

        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        });

        const { svg: renderedSvg } = await mermaid.render(id, chart);

        setSvg(renderedSvg);
      } catch (err) {
        if (!cancelled) {
          console.error('Mermaid rendering error:', err);
          const fallback = t('mermaid.renderError', { ns: 'errors' });
          setError(err instanceof Error ? err.message : fallback);
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [chart, id, t, resolvedTheme]);

  if (error) {
    return (
      <div className={`border border-destructive rounded-lg p-4 ${className}`}>
        <div className="text-sm text-destructive">
          <strong>{t('mermaid.title', { ns: 'errors' })}</strong>
          <pre className="mt-2 text-xs overflow-auto">{error}</pre>
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <div className="text-sm text-muted-foreground">{t('mermaid.loading', { ns: 'errors' })}</div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={ref}
        className={cn(
          "mermaid-diagram overflow-auto cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors",
          className
        )}
        dangerouslySetInnerHTML={{ __html: svg }}
        onClick={() => setIsOpen(true)}
        role="button"
        aria-label="Click to enlarge diagram"
        title="Click to enlarge"
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto p-12">
          <div
            className="mermaid-diagram-modal w-full h-full flex items-center justify-center min-h-[300px]"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
