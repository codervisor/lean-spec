---
status: complete
created: '2025-11-25'
tags:
  - ui
  - ux
  - feature
  - visualization
priority: high
created_at: '2025-11-25T09:18:07.795Z'
updated_at: '2025-12-04T04:11:31.602Z'
transitions:
  - status: in-progress
    at: '2025-11-25T09:46:08.354Z'
  - status: complete
    at: '2025-11-25T09:50:35.092Z'
completed_at: '2025-11-25T09:50:35.092Z'
completed: '2025-11-25'
related:
  - 120-mermaid-diagram-showcase
  - 131-ui-project-context-visibility
  - 133-ui-web-code-editor
  - 137-ui-dependencies-page
---

# Native Diagram Rendering in Spec Detail View

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-25 · **Tags**: ui, ux, feature, visualization

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: Spec documents often contain Mermaid or PlantUML code blocks for architecture diagrams, flowcharts, and sequence diagrams. Currently, `@leanspec/ui` displays these as raw code instead of rendered visuals, making specs harder to read and understand.

**Request**: User feedback asks for natural diagram rendering in the spec detail view.

**Impact**:
- Better spec readability and comprehension
- Aligns with how specs are viewed in GitHub/docs sites (which render Mermaid natively)
- Enhanced visual communication of complex relationships
- More professional spec presentation

## Design

### Approach: Mermaid-First with PlantUML Support

**Phase 1: Mermaid (Primary Focus)**
- Native browser rendering via `mermaid` npm package
- No server required, fully client-side
- Excellent React integration
- Already well-established in GitHub, Docusaurus, etc.

**Phase 2: PlantUML (Optional Enhancement)**
- Requires server-side rendering (Java-based PlantUML server)
- Options: External service (plantuml.com) or self-hosted
- Lower priority - Mermaid covers 90%+ of use cases

### Implementation Strategy

**react-markdown Custom Component**

Current code in `spec-detail-client.tsx`:
```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkStripHtmlComments]}
  rehypePlugins={[rehypeHighlight, rehypeSlug]}
  components={{
    a: (props) => <MarkdownLink {...props} />,
  }}
>
  {displayContent}
</ReactMarkdown>
```

Add custom `code` component to intercept diagram blocks:
```tsx
components={{
  a: (props) => <MarkdownLink {...props} />,
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match?.[1];
    
    if (language === 'mermaid') {
      return <MermaidDiagram code={String(children)} />;
    }
    
    if (language === 'plantuml') {
      return <PlantUMLDiagram code={String(children)} />;
    }
    
    // Default code block rendering
    return <code className={className} {...props}>{children}</code>;
  },
}}
```

### MermaidDiagram Component Design

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default', // or detect from next-themes
      securityLevel: 'loose',
    });

    const render = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Diagram render failed');
      }
    };

    render();
  }, [code]);

  if (error) {
    return (
      <div className="border border-destructive/50 bg-destructive/10 rounded-md p-4">
        <p className="text-sm text-destructive">Diagram error: {error}</p>
        <pre className="mt-2 text-xs overflow-x-auto">{code}</pre>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="my-4 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

### Dark Mode Support

Mermaid needs theme awareness:
```tsx
import { useTheme } from 'next-themes';

const { resolvedTheme } = useTheme();

mermaid.initialize({
  theme: resolvedTheme === 'dark' ? 'dark' : 'default',
  // ...
});
```

### PlantUML Implementation (Phase 2)

Options for PlantUML rendering:

**Option A: Public PlantUML Server** (Quick but external dependency)
```tsx
const plantUmlUrl = `https://www.plantuml.com/plantuml/svg/${encode(code)}`;
return <img src={plantUmlUrl} alt="PlantUML diagram" />;
```

**Option B: Self-hosted via Docker** (Privacy-focused, more setup)
- Add optional `PLANTUML_SERVER_URL` env var
- Fall back to public server or show code block if not configured

**Recommendation**: Start with Option A, add self-hosted support as optional config.

### Fallback Behavior

When rendering fails or feature is disabled:
- Show original code block with syntax highlighting
- Display subtle error message above the code
- Allow toggle between rendered view and source code

### Performance Considerations

1. **Lazy Loading**: Only load mermaid package when diagram detected
2. **Caching**: Cache rendered SVGs to avoid re-rendering on scroll
3. **SSR Handling**: Mermaid is client-only, use dynamic import with `ssr: false`

```tsx
import dynamic from 'next/dynamic';

const MermaidDiagram = dynamic(
  () => import('./mermaid-diagram').then(mod => mod.MermaidDiagram),
  { ssr: false, loading: () => <DiagramSkeleton /> }
);
```

### Bundle Size Impact

- **mermaid**: ~500KB gzipped (significant, but loaded only when needed)
- Mitigation: Dynamic import ensures it's only loaded for pages with diagrams

## Plan

**Phase 1: Mermaid Support (MVP)**
- [ ] Add `mermaid` package to `@leanspec/ui` dependencies
- [ ] Create `MermaidDiagram` client component
- [ ] Add custom `code` component to ReactMarkdown in `spec-detail-client.tsx`
- [ ] Implement dark mode theme switching
- [ ] Add error handling with fallback to code block
- [ ] Test with various Mermaid diagram types (flowchart, sequence, class, etc.)

**Phase 2: UX Polish**
- [ ] Add loading skeleton while diagram renders
- [ ] Add "View Source" toggle button for each diagram
- [ ] Add zoom/pan for large diagrams (optional)
- [ ] Optimize with lazy loading / dynamic import

**Phase 3: PlantUML Support (Optional)**
- [ ] Add PlantUML encoding utility
- [ ] Create `PlantUMLDiagram` component using public server
- [ ] Add configuration for self-hosted PlantUML server
- [ ] Document PlantUML setup in package README

## Test

**Mermaid Rendering**
- [ ] Flowchart diagrams render correctly
- [ ] Sequence diagrams render correctly
- [ ] Class diagrams render correctly
- [ ] State diagrams render correctly
- [ ] ER diagrams render correctly
- [ ] Gantt charts render correctly
- [ ] Pie charts render correctly

**Theme Support**
- [ ] Diagrams use light theme in light mode
- [ ] Diagrams use dark theme in dark mode
- [ ] Theme switches correctly without page reload

**Error Handling**
- [ ] Invalid Mermaid syntax shows error message
- [ ] Error state shows original code as fallback
- [ ] Non-diagram code blocks render normally (no regression)

**Performance**
- [ ] Mermaid package only loads when diagram present
- [ ] Page without diagrams has no bundle size increase
- [ ] Multiple diagrams on one page render efficiently

**Accessibility**
- [ ] Diagrams have appropriate alt text or labels
- [ ] Source code is available for screen readers

## Notes

### Why Mermaid First?

1. **Client-side rendering**: No server infrastructure needed
2. **GitHub parity**: Users expect Mermaid to "just work" like GitHub
3. **AI-friendly**: LLMs commonly generate Mermaid diagrams
4. **Wide coverage**: Supports flowcharts, sequences, class, state, ER, Gantt, pie charts
5. **Active community**: Well-maintained, frequent updates

### PlantUML Considerations

PlantUML is more powerful but requires Java runtime:
- Sequence diagrams with more features
- Component diagrams
- Deployment diagrams
- Object diagrams

For most spec use cases, Mermaid is sufficient. PlantUML can be Phase 2 for users who need it.

### Alternatives Considered

| Library | Pros | Cons |
|---------|------|------|
| **mermaid** | Client-side, React-friendly, GitHub-compatible | Large bundle (~500KB) |
| **kroki.io** | Multi-format (Mermaid, PlantUML, D2, etc.) | External service dependency |
| **D2** | Modern, clean syntax | Less adoption, different syntax |
| **remark-mermaidjs** | Direct remark plugin | SSR issues, less control |

**Decision**: Direct Mermaid integration gives best control and user experience.

### Security Note

Using `securityLevel: 'loose'` in Mermaid allows more diagram features but requires trusting spec content. Since specs are developer-authored (not user-generated content), this is acceptable. For multi-tenant scenarios, use `securityLevel: 'strict'`.

### Related Work

- **Spec #097**: DAG visualization library (used Reactflow for dependencies graph)
- **Docusaurus**: Uses `@docusaurus/theme-mermaid` for docs site
- **GitHub**: Native Mermaid support in markdown files
