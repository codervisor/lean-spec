/**
 * Project Context Client Component
 * Displays project-level context files (AGENTS.md, config, README, etc.)
 * Phase 2: Spec 131 - UI Project Context Visibility
 */

'use client';

import * as React from 'react';
import { BookOpen, Settings, FileText, Copy, Check, AlertCircle, Coins, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContextFileCard } from '@/components/context-file-viewer';
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
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  files: ContextFile[];
  emptyMessage: string;
  emptySuggestion?: string;
  defaultExpanded?: boolean;
}) {
  const totalTokens = files.reduce((sum, f) => sum + f.tokenCount, 0);

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
              <Badge variant="secondary" className="text-xs">
                {files.length} file{files.length !== 1 ? 's' : ''}
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
        {files.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title={emptyMessage}
            description="No files found in this category"
            suggestion={emptySuggestion}
          />
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <ContextFileCard
                key={file.path}
                name={file.name}
                path={file.path}
                content={file.content}
                tokenCount={file.tokenCount}
                lastModified={file.lastModified}
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

          {/* Summary card */}
          {hasAnyContent && (
            <Card className="mt-6 bg-muted/30">
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
