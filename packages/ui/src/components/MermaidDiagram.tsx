import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../stores/theme';
import { Dialog, DialogContent } from '@leanspec/ui-components';
import { cn } from '@leanspec/ui-components';

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
  const [isOpen, setIsOpen] = useState(false);
  const { resolvedTheme } = useThemeStore();
  const { t } = useTranslation(['common', 'errors']);

  useEffect(() => {
    if (!chart || chart.trim().length === 0) {
      setSvg('');
      return;
    }

    let cancelled = false;

    const renderDiagram = async () => {
      try {
        setError(null);
        // Don't clear SVG immediately to avoid flash during re-render
        // unless it's a completely new diagram

        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        });

        // Use a unique ID for every render to avoid collisions/race conditions
        const id = generateId();
        const { svg: renderedSvg } = await mermaid.render(id, chart);

        if (!cancelled) {
          setSvg(renderedSvg);
        }
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
  }, [chart, t, resolvedTheme]);

  if (!chart || chart.trim().length === 0) {
    return null;
  }

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
