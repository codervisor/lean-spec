/**
 * Project Context Client Component
 * Displays project-level context files (AGENTS.md, config, README, etc.)
 * Aligned with Next.js UI implementation - uses structured ProjectContext
 * Spec 131 - UI Project Context Visibility
 */

import * as React from 'react';
import { BookOpen, Settings, FileText, Copy, Check, AlertCircle, Coins, Info, Search, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Input } from '@leanspec/ui-components';
import type { ProjectContext, ContextFile } from '../../types/api';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { ContextFileDetail } from './ContextFileDetail';
import { PageHeader } from '../shared/PageHeader';

interface ContextClientProps {
  context: ProjectContext;
}

/**
 * Get token threshold color
 */
function getTotalTokenColor(tokens: number): string {
  if (tokens < 5000) return 'text-green-600 dark:text-green-400';
  if (tokens < 10000) return 'text-blue-600 dark:text-blue-400';
  if (tokens < 20000) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Count matches in content
 */
function countMatches(content: string, query: string): number {
  if (!query || query.length < 2) return 0;
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Empty state component
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  suggestion
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  suggestion?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">{description}</p>
      {suggestion && (
        <p className="text-xs text-primary mt-2">{suggestion}</p>
      )}
    </div>
  );
}

/**
 * Simple file card for list view
 */
function FileCard({
  file,
  searchQuery,
  onClick,
}: {
  file: ContextFile;
  searchQuery?: string;
  onClick: () => void;
}) {
  const matches = searchQuery ? countMatches(file.content, searchQuery) : 0;
  const hasMatch = !searchQuery || matches > 0 || file.name.toLowerCase().includes(searchQuery.toLowerCase());

  if (!hasMatch) return null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{file.name}</div>
            <div className="text-xs text-muted-foreground truncate">{file.path}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {searchQuery && matches > 0 && (
            <Badge variant="secondary" className="text-xs bg-yellow-100 dark:bg-yellow-900">
              {matches} {matches === 1 ? 'match' : 'matches'}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            <Coins className="h-3 w-3 mr-1" />
            {file.tokenCount.toLocaleString()}
          </Badge>
        </div>
      </div>
    </button>
  );
}

/**
 * Section with collapsible file cards
 */
function ContextSection({
  title,
  description,
  icon: Icon,
  files,
  emptyMessage,
  emptySuggestion,
  searchQuery,
  onFileSelect,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  files: ContextFile[];
  emptyMessage: string;
  emptySuggestion?: string;
  searchQuery?: string;
  onFileSelect?: (file: ContextFile) => void;
}) {
  const totalTokens = files.reduce((sum, f) => sum + f.tokenCount, 0);

  // Filter files by search if query exists
  const filteredFiles = React.useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return files;
    return files.filter(file => {
      const matches = countMatches(file.content, searchQuery);
      const nameMatch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matches > 0 || nameMatch;
    });
  }, [files, searchQuery]);

  // Calculate total matches in this section
  const totalMatches = React.useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return 0;
    return filteredFiles.reduce((sum, file) => sum + countMatches(file.content, searchQuery), 0);
  }, [filteredFiles, searchQuery]);

  const filteredCount = filteredFiles.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {files.length > 0 && (
            <div className="flex items-center gap-2">
              {searchQuery && totalMatches > 0 && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                  {totalMatches} {totalMatches === 1 ? 'match' : 'matches'}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {filteredCount === files.length
                  ? `${filteredCount} ${filteredCount === 1 ? 'file' : 'files'}`
                  : `${filteredCount} of ${files.length} files`}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', getTotalTokenColor(totalTokens))}>
                <Coins className="h-3 w-3 mr-1" />
                {totalTokens.toLocaleString()} tokens
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredFiles.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title={searchQuery ? 'No matches found' : emptyMessage}
            description={searchQuery ? 'Try adjusting your search query' : 'No files in this category'}
            suggestion={searchQuery ? undefined : emptySuggestion}
          />
        ) : (
          <div className="space-y-3">
            {filteredFiles.map((file) => (
              <FileCard
                key={file.path}
                file={file}
                searchQuery={searchQuery}
                onClick={() => onFileSelect?.(file)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ContextClient({ context }: ContextClientProps) {
  const [copiedAll, setCopiedAll] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<ContextFile | null>(null);
  const { t } = useTranslation();

  // Collect all content for "Copy All" feature
  const handleCopyAll = async () => {
    const allContent: string[] = [];

    // Agent instructions
    for (const file of context.agentInstructions) {
      allContent.push(`# ${file.path}\n\n${file.content}\n`);
    }

    // Config
    if (context.config.file) {
      allContent.push(`# ${context.config.file.path}\n\n${context.config.file.content}\n`);
    }

    // Project docs
    for (const file of context.projectDocs) {
      allContent.push(`# ${file.path}\n\n${file.content}\n`);
    }

    try {
      await navigator.clipboard.writeText(allContent.join('\n---\n\n'));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (error) {
      console.error('Failed to copy all content:', error);
    }
  };

  const hasAnyContent =
    context.agentInstructions.length > 0 ||
    context.config.file !== null ||
    context.projectDocs.length > 0;

  // Calculate total matches across all files
  const totalMatches = React.useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return 0;
    let total = 0;
    for (const file of context.agentInstructions) {
      total += countMatches(file.content, searchQuery);
    }
    if (context.config.file) {
      total += countMatches(context.config.file.content, searchQuery);
    }
    for (const file of context.projectDocs) {
      total += countMatches(file.content, searchQuery);
    }
    return total;
  }, [context, searchQuery]);

  // Convert ContextFile to the format expected by ContextFileDetail
  const selectedFileForDetail = selectedFile ? {
    name: selectedFile.name,
    path: selectedFile.path,
    content: selectedFile.content,
    size: new Blob([selectedFile.content]).size,
    tokenCount: selectedFile.tokenCount,
    lineCount: selectedFile.content.split('\n').length,
    modified: selectedFile.lastModified instanceof Date ? selectedFile.lastModified.toISOString() : selectedFile.lastModified,
  } : null;

  // If a file is selected, show the detail view
  if (selectedFile && selectedFileForDetail) {
    return (
      <div className="min-h-screen bg-background">
        <ContextFileDetail
          file={selectedFileForDetail}
          projectRoot={context.projectRoot}
          onBack={() => setSelectedFile(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('contextPage.title')}
        description={t('contextPage.description')}
        actions={hasAnyContent ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="shrink-0"
          >
            {copiedAll ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                {t('contextPage.copyAllSuccess')}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                {t('contextPage.copyAll')}
              </>
            )}
          </Button>
        ) : undefined}
      />

      {/* Search and Summary */}
      {hasAnyContent && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('contextPage.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Search results info */}
          {searchQuery && searchQuery.length >= 2 && (
            <div className="flex items-center gap-2 text-sm">
              {totalMatches > 0 ? (
                <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                  {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} found
                </Badge>
              ) : (
                <span className="text-muted-foreground">
                  No matches for "{searchQuery}"
                </span>
              )}
            </div>
          )}

          {/* Summary card */}
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-2">
                  <Coins className={cn('h-5 w-5', getTotalTokenColor(context.totalTokens))} />
                  <span className="text-sm">
                    <strong className={getTotalTokenColor(context.totalTokens)}>
                      {context.totalTokens.toLocaleString()} total tokens
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  Context budget for AI agents
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content sections */}
      <div className="space-y-6">
        {/* Agent Instructions */}
        <ContextSection
          title="Agent Instructions"
          description="AI agent configuration and workflow guidelines"
          icon={BookOpen}
          files={context.agentInstructions}
          emptyMessage="No agent instructions found"
          emptySuggestion="Create AGENTS.md or other agent files"
          searchQuery={searchQuery}
          onFileSelect={setSelectedFile}
        />

        {/* Configuration */}
        <ContextSection
          title="Configuration"
          description="LeanSpec project configuration"
          icon={Settings}
          files={context.config.file ? [context.config.file] : []}
          emptyMessage="No configuration file found"
          emptySuggestion="Initialize with 'lean-spec init'"
          searchQuery={searchQuery}
          onFileSelect={setSelectedFile}
        />

        {/* Project Documentation */}
        <ContextSection
          title="Project Documentation"
          description="README, contributing guidelines, and other docs"
          icon={FileText}
          files={context.projectDocs}
          emptyMessage="No project documentation found"
          emptySuggestion="Add README.md or CONTRIBUTING.md"
          searchQuery={searchQuery}
          onFileSelect={setSelectedFile}
        />
      </div>

      {/* No content state */}
      {!hasAnyContent && (
        <Card className="mt-8">
          <CardContent className="py-12">
            <EmptyState
              icon={BookOpen}
              title="No context files found"
              description="This project doesn't have any context files yet"
              suggestion="Add AGENTS.md, README.md, or other documentation files"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
