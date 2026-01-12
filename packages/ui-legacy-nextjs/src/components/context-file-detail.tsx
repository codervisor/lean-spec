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
import {
  Copy, 
  Check, 
  Clock, 
  Coins, 
  ExternalLink, 
  ArrowLeft,
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableOfContentsSidebar, TableOfContents } from '@/components/table-of-contents';
import { BackToTop } from '@/components/back-to-top';
import { MermaidDiagram } from '@/components/mermaid-diagram';
import { cn } from '@/lib/utils';
import type { ContextFile } from '@/lib/specs/types';
import { useTranslation } from 'react-i18next';

interface ContextFileDetailProps {
  file: ContextFile;
  projectRoot?: string;
  onBack: () => void;
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
  const { t } = useTranslation();
  const tokenStatusLabel = t(`contextPage.viewer.tokenStatus.${getTokenStatusKey(file.tokenCount)}`);
  const formattedTokenCount = file.tokenCount.toLocaleString();
  const tokenCountLabel = t('contextPage.badges.tokens', {
    count: file.tokenCount,
    formattedCount: formattedTokenCount,
  });
  
  const FileIcon = getFileIcon(file.name);
  const iconColor = getFileIconColor(file.name);

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
              {t('contextPage.detail.back')}
            </Button>
            <FileIcon className={cn('h-5 w-5 shrink-0', iconColor)} />
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
              {file.name}
            </h1>
          </div>

          {/* Line 2: Badges and actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', getTokenColor(file.tokenCount))}>
              <Coins className="h-3 w-3 mr-1" />
              {tokenCountLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {tokenStatusLabel}
            </span>
            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t('contextPage.detail.modified', { date: formatDate(file.lastModified) })}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {t('contextPage.detail.lines', { count: file.content.split('\n').length })}
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
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  {t('contextPage.detail.openInEditor')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-green-600" />
                    {t('contextPage.detail.copySuccess')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {t('contextPage.detail.copy')}
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
