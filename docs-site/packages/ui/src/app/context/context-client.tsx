/**
 * Project Context Client Component
 * Displays project-level context files (AGENTS.md, config, README, etc.)
 * Phases 2 & 4: Spec 131 - UI Project Context Visibility
 */

'use client';

import * as React from 'react';
import { BookOpen, Settings, FileText, Copy, Check, AlertCircle, Coins, Info, Search, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ContextFileCard, countMatches } from '@/components/context-file-viewer';
import type { ProjectContext, ContextFile } from '@/lib/specs/types';
import { cn } from '@/lib/utils';

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
                  {totalMatches} match{totalMatches !== 1 ? 'es' : ''}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {filteredFiles.length}{filteredFiles.length !== files.length ? `/${files.length}` : ''} file{files.length !== 1 ? 's' : ''}
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
            title={searchQuery ? "No matches found" : emptyMessage}
            description={searchQuery ? "Try a different search term" : "No files found in this category"}
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                Project Context
              </h1>
              <p className="text-muted-foreground mt-2">
                View project-level context files that inform AI agents and development workflows
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
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
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
                  placeholder="Search within context files..."
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
                      {totalMatches} match{totalMatches !== 1 ? 'es' : ''} found
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">No matches found for &quot;{searchQuery}&quot;</span>
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
                          {context.totalTokens.toLocaleString()}
                        </strong>
                        {' '}total tokens
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
        </div>

        {/* Content sections */}
        <div className="space-y-6">
          {/* Agent Instructions */}
          <ContextSection
            title="Agent Instructions"
            description="System prompts and guidelines for AI agents"
            icon={BookOpen}
            files={context.agentInstructions}
            emptyMessage="No agent instructions found"
            emptySuggestion="Create an AGENTS.md file in your project root"
            defaultExpanded={context.agentInstructions.length <= 2}
            searchQuery={searchQuery}
            projectRoot={context.projectRoot}
          />

          {/* Configuration */}
          <ContextSection
            title="Configuration"
            description="LeanSpec project configuration and settings"
            icon={Settings}
            files={context.config.file ? [context.config.file] : []}
            emptyMessage="No configuration found"
            emptySuggestion="Run 'lean-spec init' to create a config file"
            defaultExpanded={true}
            searchQuery={searchQuery}
            projectRoot={context.projectRoot}
          />

          {/* Project Documentation */}
          <ContextSection
            title="Project Documentation"
            description="README, contributing guidelines, and changelog"
            icon={FileText}
            files={context.projectDocs}
            emptyMessage="No project docs found"
            emptySuggestion="Create a README.md file in your project root"
            defaultExpanded={false}
            searchQuery={searchQuery}
            projectRoot={context.projectRoot}
          />
        </div>

        {/* No content state */}
        {!hasAnyContent && (
          <Card className="mt-8">
            <CardContent className="py-12">
              <EmptyState
                icon={BookOpen}
                title="No project context found"
                description="This project doesn't have any context files yet. Context files help AI agents understand your project better."
                suggestion="Start by creating AGENTS.md or running 'lean-spec init'"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
