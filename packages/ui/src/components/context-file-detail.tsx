/**
 * Context File Detail Component
 * Full-page markdown view with table of contents sidebar, similar to spec detail page
 * Supports Mermaid diagrams and rich markdown rendering
 */

'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { Copy, Check, Clock, Coins, ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableOfContentsSidebar, TableOfContents } from '@/components/table-of-contents';
import { BackToTop } from '@/components/back-to-top';
import { MermaidDiagram } from '@/components/mermaid-diagram';
import { cn } from '@/lib/utils';
import type { ContextFile } from '@/lib/specs/types';

interface ContextFileDetailProps {
  file: ContextFile;
  projectRoot?: string;
  onBack: () => void;
}

/**
 * Get token count color based on thresholds
 */
function getTokenColor(tokens: number): string {
  if (tokens < 2000) return 'text-green-600 dark:text-green-400';
  if (tokens < 3500) return 'text-blue-600 dark:text-blue-400';
  if (tokens < 5000) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get token status label
 */
function getTokenStatus(tokens: number): string {
  if (tokens < 2000) return 'Optimal';
  if (tokens < 3500) return 'Good';
  if (tokens < 5000) return 'Large';
  return 'Very Large';
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Generate VS Code URI to open file
 */
function getVSCodeUri(projectRoot: string, filePath: string): string {
  const fullPath = filePath.startsWith('/') ? filePath : `${projectRoot}/${filePath}`;
  return `vscode://file${fullPath}`;
}

export function ContextFileDetail({ file, projectRoot, onBack }: ContextFileDetailProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const handleOpenInEditor = () => {
    if (projectRoot) {
      window.open(getVSCodeUri(projectRoot, file.path), '_blank');
    }
  };

  const isMarkdown = file.name.endsWith('.md');
  const isJson = file.name.endsWith('.json');

  return (
    <>
      {/* Header */}
      <header className="lg:sticky lg:top-14 lg:z-20 border-b bg-card">
        <div className="px-3 sm:px-6 py-2 sm:py-3">
          {/* Line 1: Back button + File name */}
          <div className="flex items-center gap-3 mb-1.5 sm:mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
              {file.name}
            </h1>
          </div>

          {/* Line 2: Badges and actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', getTokenColor(file.tokenCount))}>
              <Coins className="h-3 w-3 mr-1" />
              {file.tokenCount.toLocaleString()} tokens
            </Badge>
            <span className="text-xs text-muted-foreground">
              {getTokenStatus(file.tokenCount)}
            </span>
            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Modified {formatDate(file.lastModified)}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {file.content.split('\n').length} lines
            </span>
          </div>

          {/* Line 3: Path and actions */}
          <div className="flex items-center justify-between gap-2 mt-1.5 sm:mt-2">
            <span className="text-xs text-muted-foreground truncate">{file.path}</span>
            <div className="flex items-center gap-1 shrink-0">
              {projectRoot && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleOpenInEditor}
                  title="Open in VS Code"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Open in Editor
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleCopy}
                title="Copy content"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with Sidebar */}
      <div className="flex flex-col xl:flex-row xl:items-start">
        <main className="flex-1 px-3 sm:px-6 py-3 sm:py-6 min-w-0">
          <div className="space-y-4">
            {isJson ? (
              <pre className="p-4 text-sm overflow-x-auto bg-muted/20 rounded-lg border whitespace-pre-wrap">
                {JSON.stringify(JSON.parse(file.content), null, 2)}
              </pre>
            ) : isMarkdown ? (
              <article className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeSlug]}
                  components={{
                    pre: ({ children, ...props }) => {
                      // Safely get the first child element
                      const childArray = React.Children.toArray(children);
                      const firstChild = childArray[0];

                      // Check if this is a mermaid code block
                      if (
                        React.isValidElement(firstChild) &&
                        firstChild.type === 'code' &&
                        typeof (firstChild.props as { className?: string }).className === 'string' &&
                        (firstChild.props as { className?: string }).className?.includes('language-mermaid')
                      ) {
                        const codeProps = firstChild.props as { children?: React.ReactNode };
                        const code = typeof codeProps.children === 'string'
                          ? codeProps.children
                          : '';
                        return <MermaidDiagram code={code} />;
                      }
                      // Default pre rendering
                      return <pre {...props}>{children}</pre>;
                    },
                  }}
                >
                  {file.content}
                </ReactMarkdown>
              </article>
            ) : (
              <pre className="p-4 text-sm overflow-x-auto bg-muted/20 rounded-lg border whitespace-pre-wrap">
                {file.content}
              </pre>
            )}
          </div>
        </main>

        {/* Right Sidebar for TOC (Desktop only, markdown files only) */}
        {isMarkdown && (
          <aside className="hidden xl:block w-72 shrink-0 px-6 py-6 sticky top-32 h-[calc(100vh-8rem)] overflow-y-auto scrollbar-auto-hide">
            <TableOfContentsSidebar content={file.content} />
          </aside>
        )}
      </div>

      {/* Floating action buttons (Mobile/Tablet only) */}
      {isMarkdown && (
        <div className="xl:hidden">
          <TableOfContents content={file.content} />
        </div>
      )}
      <BackToTop />
    </>
  );
}
