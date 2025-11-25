'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Code2, AlertCircle } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [svg, setSvg] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showSource, setShowSource] = React.useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Track mount state for SSR safety
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Render the mermaid diagram
  React.useEffect(() => {
    if (!mounted) return;

    const renderDiagram = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Dynamically import mermaid to avoid SSR issues
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });

        // Generate unique ID for the diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const cleanedCode = code.trim();

        const { svg: renderedSvg } = await mermaid.render(id, cleanedCode);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Diagram render failed';
        setError(errorMessage);
        setSvg('');
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [code, resolvedTheme, mounted]);

  // Show skeleton during SSR or initial mount
  if (!mounted) {
    return <DiagramSkeleton />;
  }

  // Show loading state
  if (isLoading) {
    return <DiagramSkeleton />;
  }

  // Show error state with fallback to source
  if (error) {
    return (
      <div className="my-4 border border-destructive/50 bg-destructive/10 rounded-md overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/20 border-b border-destructive/30">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">Diagram error</span>
        </div>
        <div className="p-4">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <pre className="text-xs overflow-x-auto bg-muted/50 p-3 rounded border">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    );
  }

  // Show rendered diagram with source toggle
  return (
    <div className="my-4 border rounded-md overflow-hidden">
      <div className="flex items-center justify-end px-3 py-1.5 bg-muted/30 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSource(!showSource)}
          className="h-7 text-xs"
        >
          <Code2 className="h-3.5 w-3.5 mr-1.5" />
          {showSource ? 'View Diagram' : 'View Source'}
        </Button>
      </div>

      {showSource ? (
        <pre className="text-xs overflow-x-auto p-4 bg-muted/20">
          <code className="language-mermaid">{code}</code>
        </pre>
      ) : (
        <div
          ref={containerRef}
          className="flex justify-center overflow-x-auto p-4 bg-background"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}

function DiagramSkeleton() {
  return (
    <div className="my-4 border rounded-md overflow-hidden">
      <div className="flex items-center justify-end px-3 py-1.5 bg-muted/30 border-b">
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="flex justify-center items-center p-8">
        <Skeleton className="h-48 w-full max-w-md" />
      </div>
    </div>
  );
}
