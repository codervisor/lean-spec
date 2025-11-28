/**
 * Context File Viewer Component
 * Displays a single context file with token count, copy button, and syntax highlighting
 * Phase 1 & 4: Spec 131 - UI Project Context Visibility
 */

'use client';

import * as React from 'react';
import { Copy, Check, FileText, Clock, Coins, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface ContextFileViewerProps {
  name: string;
  path: string;
  content: string;
  tokenCount: number;
  lastModified: Date | string;
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
  searchQuery?: string;
  projectRoot?: string;
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Highlight search matches in text
 */
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * Count search matches in content
 */
export function countMatches(content: string, query: string): number {
  if (!query || query.length < 2) return 0;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = content.match(new RegExp(escapedQuery, 'gi'));
  return matches ? matches.length : 0;
}

/**
 * Generate VS Code URI to open file
 */
function getVSCodeUri(projectRoot: string, filePath: string): string {
  const fullPath = filePath.startsWith('/') ? filePath : `${projectRoot}/${filePath}`;
  return `vscode://file${fullPath}`;
}

export function ContextFileViewer({
  name,
  path,
  content,
  tokenCount,
  lastModified,
  isExpanded = false,
  onToggle,
  className,
  searchQuery,
  projectRoot,
}: ContextFileViewerProps) {
  const [copied, setCopied] = React.useState(false);
  const matchCount = searchQuery ? countMatches(content, searchQuery) : 0;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const handleOpenInEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (projectRoot) {
      window.open(getVSCodeUri(projectRoot, path), '_blank');
    }
  };

  const isJson = name.endsWith('.json');
  const isMarkdown = name.endsWith('.md');

  // For non-markdown content with search, highlight matches
  const renderPlainContent = (text: string) => {
    if (searchQuery && searchQuery.length >= 2) {
      return highlightMatches(text, searchQuery);
    }
    return text;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        className={cn(
          'cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4',
          isExpanded && 'border-b'
        )}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <CardTitle className="text-sm font-medium truncate">{name}</CardTitle>
              <p className="text-xs text-muted-foreground truncate">{path}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {searchQuery && matchCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                {matchCount} match{matchCount !== 1 ? 'es' : ''}
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-xs', getTokenColor(tokenCount))}>
              <Coins className="h-3 w-3 mr-1" />
              {tokenCount.toLocaleString()} tokens
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {getTokenStatus(tokenCount)}
            </span>
            {projectRoot && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleOpenInEditor}
                title="Open in VS Code"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleCopy}
              title="Copy content"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          {/* Metadata bar */}
          <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 text-xs text-muted-foreground border-b">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Modified {formatDate(lastModified)}
            </span>
            <span>{content.split('\n').length} lines</span>
          </div>

          {/* Content area */}
          <div className="max-h-[500px] overflow-auto">
            {isJson ? (
              <pre className="p-4 text-sm overflow-x-auto bg-muted/20 whitespace-pre-wrap">
                {renderPlainContent(JSON.stringify(JSON.parse(content), null, 2))}
              </pre>
            ) : isMarkdown ? (
              searchQuery && searchQuery.length >= 2 ? (
                // Render as plain text with highlighting when searching
                <pre className="p-4 text-sm overflow-x-auto bg-muted/20 whitespace-pre-wrap font-mono">
                  {renderPlainContent(content)}
                </pre>
              ) : (
                <article className="prose prose-slate dark:prose-invert max-w-none prose-sm p-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {content}
                  </ReactMarkdown>
                </article>
              )
            ) : (
              <pre className="p-4 text-sm overflow-x-auto bg-muted/20 whitespace-pre-wrap">
                {renderPlainContent(content)}
              </pre>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Compact version for listing in accordion
 */
export function ContextFileCard({
  name,
  path,
  content,
  tokenCount,
  lastModified,
  className,
  searchQuery,
  projectRoot,
}: Omit<ContextFileViewerProps, 'isExpanded' | 'onToggle'>) {
  const [expanded, setExpanded] = React.useState(false);

  // Auto-expand when there are search matches
  React.useEffect(() => {
    if (searchQuery && searchQuery.length >= 2) {
      const matches = countMatches(content, searchQuery);
      if (matches > 0) {
        setExpanded(true);
      }
    }
  }, [searchQuery, content]);

  return (
    <ContextFileViewer
      name={name}
      path={path}
      content={content}
      tokenCount={tokenCount}
      lastModified={lastModified}
      isExpanded={expanded}
      onToggle={() => setExpanded(!expanded)}
      className={className}
      searchQuery={searchQuery}
      projectRoot={projectRoot}
    />
  );
}
