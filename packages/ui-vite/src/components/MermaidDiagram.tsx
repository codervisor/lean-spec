import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

// Initialize mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'system-ui, -apple-system, sans-serif',
});

let idCounter = 0;
const generateId = () => `mermaid-${Date.now()}-${idCounter++}`;

export function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [id] = useState(generateId);

  useEffect(() => {
    if (!chart || !ref.current) return;

    const renderDiagram = async () => {
      try {
        setError(null);
        // Update theme based on document theme
        const isDark = document.documentElement.classList.contains('dark');
        mermaid.initialize({
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });

        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [chart, id]);

  if (error) {
    return (
      <div className={`border border-destructive rounded-lg p-4 ${className}`}>
        <div className="text-sm text-destructive">
          <strong>Mermaid Diagram Error:</strong>
          <pre className="mt-2 text-xs overflow-auto">{error}</pre>
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <div className="text-sm text-muted-foreground">Loading diagram...</div>
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className={`mermaid-diagram border rounded-lg p-4 overflow-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
