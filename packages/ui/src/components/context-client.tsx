/**
 * Project Context Client Component
 * Displays project-level context files (AGENTS.md, config, README, etc.)
 * Uses sidebar + content layout similar to spec detail page
 * Phases 2 & 4: Spec 131 - UI Project Context Visibility
 */

'use client';

import * as React from 'react';
import { BookOpen, Settings, FileText, Copy, Check, AlertCircle, Coins, Info, Search, X, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ContextFileCard, countMatches } from '@/components/context-file-viewer';
import { ContextFileDetail } from '@/components/context-file-detail';
import type { ProjectContext, ContextFile } from '@/lib/specs/types';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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
 * Section with collapsible file cards
 */
function ContextSection({
  title,
  description,
  icon: Icon,
  files,
  emptyMessage,
  emptySuggestion,
  defaultExpanded = true,
  searchQuery,
  projectRoot,
  onFileSelect,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  files: ContextFile[];
  emptyMessage: string;
  emptySuggestion?: string;
  defaultExpanded?: boolean;
  searchQuery?: string;
  projectRoot?: string;
  onFileSelect?: (file: ContextFile) => void;
}) {
  const { t } = useTranslation();
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
  const matchesLabel = totalMatches === 1
    ? t('contextPage.badges.matchesSingular', { count: totalMatches })
    : t('contextPage.badges.matchesPlural', { count: totalMatches });
  const filesLabel = filteredCount === files.length
    ? (filteredCount === 1
        ? t('contextPage.badges.filesSingular', { count: filteredCount })
        : t('contextPage.badges.filesPlural', { count: filteredCount }))
    : t('contextPage.badges.filesFiltered', { count: filteredCount, total: files.length });
  const tokensLabel = t('contextPage.badges.tokens', { count: totalTokens.toLocaleString() });

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
                  {matchesLabel}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {filesLabel}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', getTotalTokenColor(totalTokens))}>
                <Coins className="h-3 w-3 mr-1" />
                {tokensLabel}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredFiles.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title={searchQuery ? t('contextPage.search.noMatchesTitle') : emptyMessage}
            description={searchQuery ? t('contextPage.search.noMatchesDescription') : t('contextPage.search.noFilesDescription')}
            suggestion={searchQuery ? undefined : emptySuggestion}
          />
        ) : (
          <div className="space-y-3">
            {filteredFiles.map((file) => (
              <ContextFileCard
                key={file.path}
                name={file.name}
                path={file.path}
                content={file.content}
                tokenCount={file.tokenCount}
                lastModified={file.lastModified}
                searchQuery={searchQuery}
                projectRoot={projectRoot}
                onViewDetail={onFileSelect ? () => onFileSelect(file) : undefined}
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

  // If a file is selected, show the detail view
  if (selectedFile) {
    return (
      <div className="min-h-screen bg-background">
        <ContextFileDetail
          file={selectedFile}
          projectRoot={context.projectRoot}
          onBack={() => setSelectedFile(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                {t('contextPage.title')}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t('contextPage.description')}
              </p>
            </div>
            {hasAnyContent && (
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
            )}
          </div>

          {/* Search and Summary */}
          {hasAnyContent && (
            <div className="mt-6 space-y-4">
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
                      {totalMatches === 1
                        ? t('contextPage.badges.matchesFoundSingular', { count: totalMatches })
                        : t('contextPage.badges.matchesFoundPlural', { count: totalMatches })}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">
                      {t('contextPage.searchNoMatches', { query: searchQuery })}
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
                          {t('contextPage.summary.totalTokens', {
                            count: context.totalTokens.toLocaleString(),
                          })}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4" />
                      {t('contextPage.summary.contextBudget')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Content sections */}
        <div className="space-y-6">
          {/* Agent Instructions */}
          <ContextSection
            title={t('contextPage.sections.agents.title')}
            description={t('contextPage.sections.agents.description')}
            icon={BookOpen}
            files={context.agentInstructions}
            emptyMessage={t('contextPage.sections.agents.empty')}
            emptySuggestion={t('contextPage.sections.agents.suggestion')}
            defaultExpanded={context.agentInstructions.length <= 2}
            searchQuery={searchQuery}
            projectRoot={context.projectRoot}
            onFileSelect={setSelectedFile}
          />

          {/* Configuration */}
          <ContextSection
            title={t('contextPage.sections.config.title')}
            description={t('contextPage.sections.config.description')}
            icon={Settings}
            files={context.config.file ? [context.config.file] : []}
            emptyMessage={t('contextPage.sections.config.empty')}
            emptySuggestion={t('contextPage.sections.config.suggestion')}
            defaultExpanded={true}
            searchQuery={searchQuery}
            projectRoot={context.projectRoot}
            onFileSelect={setSelectedFile}
          />

          {/* Project Documentation */}
          <ContextSection
            title={t('contextPage.sections.docs.title')}
            description={t('contextPage.sections.docs.description')}
            icon={FileText}
            files={context.projectDocs}
            emptyMessage={t('contextPage.sections.docs.empty')}
            emptySuggestion={t('contextPage.sections.docs.suggestion')}
            defaultExpanded={false}
            searchQuery={searchQuery}
            projectRoot={context.projectRoot}
            onFileSelect={setSelectedFile}
          />
        </div>

        {/* No content state */}
        {!hasAnyContent && (
          <Card className="mt-8">
            <CardContent className="py-12">
              <EmptyState
                icon={BookOpen}
                title={t('contextPage.emptyState.title')}
                description={t('contextPage.emptyState.description')}
                suggestion={t('contextPage.emptyState.suggestion')}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
