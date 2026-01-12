/**
 * Context File Viewer Component
 * Displays a single context file with token count, copy button, and syntax highlighting
 * Uses the same rich markdown rendering as spec detail page (including Mermaid diagrams)
 * Phase 1 & 4: Spec 131 - UI Project Context Visibility
 */

'use client';

import * as React from 'react';
import {
  Copy, 
  Check, 
  FileText, 
  Clock, 
  Coins, 
  ExternalLink, 
  Maximize2,
  Bot,
  BookOpen,
  ScrollText,
  FileCode,
  Settings,
  History,
  Users,
  Shield,
  Scale,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { MermaidDiagram } from '@/components/mermaid-diagram';
import { useTranslation } from 'react-i18next';

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
  onViewDetail?: () => void;
}

/**
 * Get icon for file based on name
 */
function getFileIcon(fileName: string): React.ComponentType<{ className?: string }> {
  const name = fileName.toLowerCase();
  
  // Agent instruction files
  if (name === 'agents.md' || name.includes('agent')) return Bot;
  if (name === 'gemini.md') return Sparkles;
  if (name === 'claude.md') return Bot;
  if (name === 'copilot.md' || name === 'copilot-instructions.md') return Bot;
  
  // Project documentation
  if (name === 'readme.md') return BookOpen;
  if (name === 'contributing.md') return Users;
  if (name === 'changelog.md') return History;
  if (name === 'license.md' || name === 'license') return Scale;
  if (name === 'security.md') return Shield;
  
  // Config files
  if (name.endsWith('.json')) return Settings;
  if (name === 'config.json') return Settings;
  
  // Code-related
  if (name.includes('api') || name.includes('spec')) return FileCode;
  
  // Default
  return ScrollText;
}

/**
 * Get icon color class for file based on name
 */
function getFileIconColor(fileName: string): string {
  const name = fileName.toLowerCase();
  
  if (name === 'agents.md' || name.includes('agent')) return 'text-purple-500';
  if (name === 'gemini.md') return 'text-blue-500';
  if (name === 'claude.md') return 'text-orange-500';
  if (name === 'copilot.md' || name === 'copilot-instructions.md') return 'text-sky-500';
  if (name === 'readme.md') return 'text-green-500';
  if (name === 'contributing.md') return 'text-pink-500';
  if (name === 'changelog.md') return 'text-amber-500';
  if (name === 'license.md' || name === 'license') return 'text-slate-500';
  if (name === 'security.md') return 'text-red-500';
  if (name.endsWith('.json')) return 'text-yellow-500';
  
  return 'text-muted-foreground';
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
 * Get token status key for localization
 */
function getTokenStatusKey(tokens: number): 'optimal' | 'good' | 'large' | 'veryLarge' {
  if (tokens < 2000) return 'optimal';
  if (tokens < 3500) return 'good';
  if (tokens < 5000) return 'large';
  return 'veryLarge';
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
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
  onViewDetail,
}: ContextFileViewerProps) {
  const [copied, setCopied] = React.useState(false);
  const matchCount = searchQuery ? countMatches(content, searchQuery) : 0;
  const { t } = useTranslation();
  const tokenStatusLabel = t(`contextPage.viewer.tokenStatus.${getTokenStatusKey(tokenCount)}`);
  const formattedTokenCount = tokenCount.toLocaleString();
  const tokenCountLabel = t('contextPage.badges.tokens', {
    count: tokenCount,
    formattedCount: formattedTokenCount,
  });
  const matchLabel = matchCount === 1
    ? t('contextPage.badges.matchesSingular', { count: matchCount })
    : t('contextPage.badges.matchesPlural', { count: matchCount });

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

  const handleViewDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetail?.();
  };

  const isJson = name.endsWith('.json');
  const isMarkdown = name.endsWith('.md');
  
  const FileIcon = getFileIcon(name);
  const iconColor = getFileIconColor(name);

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
            <FileIcon className={cn('h-4 w-4 shrink-0', iconColor)} />
            <div className="min-w-0">
              <CardTitle className="text-sm font-medium truncate">{name}</CardTitle>
              <p className="text-xs text-muted-foreground truncate">{path}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {searchQuery && matchCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                {matchLabel}
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-xs', getTokenColor(tokenCount))}>
              <Coins className="h-3 w-3 mr-1" />
              {tokenCountLabel}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {tokenStatusLabel}
            </span>
            {onViewDetail && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleViewDetail}
                title={t('contextPage.viewer.viewFull')}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {projectRoot && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleOpenInEditor}
                title={t('contextPage.viewer.openInEditor')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleCopy}
              title={t('contextPage.viewer.copyContent')}
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
              {t('contextPage.viewer.modified', { date: formatDate(lastModified) })}
            </span>
            <span>{t('contextPage.viewer.lines', { count: content.split('\n').length })}</span>
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
  onViewDetail,
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
      onViewDetail={onViewDetail}
    />
  );
}
