/**
 * Sub-spec tabs component for spec detail page
 */
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import { FileText, Palette, Code, TestTube, CheckSquare, Wrench, Map, GitBranch, BookOpen } from 'lucide-react';

export interface SubSpec {
  name: string;
  file: string;
  iconName: string;
  color: string;
  content: string;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  FileText,
  Palette,
  Code,
  TestTube,
  CheckSquare,
  Wrench,
  Map,
  GitBranch,
  BookOpen,
};

interface SubSpecTabsProps {
  mainContent: string;
  subSpecs: SubSpec[];
}

export function SubSpecTabs({ mainContent, subSpecs }: SubSpecTabsProps) {
  const [activeTab, setActiveTab] = useState('readme');

  // If no sub-specs, just render main content
  if (subSpecs.length === 0) {
    return (
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {mainContent}
        </ReactMarkdown>
      </article>
    );
  }

  // Show overview tab listing all sub-specs if there are many
  const showOverview = subSpecs.length > 0;

  return (
    <div className="space-y-4">
      {showOverview && activeTab === 'readme' && subSpecs.length > 2 && (
        <Card className="p-4 bg-muted/50 border-l-4 border-l-primary">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm mb-2">This spec has multiple sections</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Use the tabs below to navigate between the main overview and detailed sections:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subSpecs.map((subSpec) => {
                  const Icon = ICON_MAP[subSpec.iconName];
                  return (
                    <button
                      key={subSpec.file}
                      onClick={() => setActiveTab(subSpec.name.toLowerCase())}
                      className="flex items-center gap-2 p-2 text-left hover:bg-accent rounded-md transition-colors text-sm"
                    >
                      {Icon && <Icon className={cn("h-4 w-4", subSpec.color)} />}
                      <span className="font-medium">{subSpec.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b mb-6">
          <TabsList className="h-auto p-0 bg-transparent w-full justify-start">
            <TabsTrigger 
              value="readme" 
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
            >
              <FileText className="h-4 w-4" />
              Overview
            </TabsTrigger>
            {subSpecs.map((subSpec) => {
              const Icon = ICON_MAP[subSpec.iconName];
              return (
                <TabsTrigger 
                  key={subSpec.file} 
                  value={subSpec.name.toLowerCase()}
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                >
                  {Icon && <Icon className={cn("h-4 w-4", subSpec.color)} />}
                  {subSpec.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        
        <TabsContent value="readme" className="mt-0">
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {mainContent}
            </ReactMarkdown>
          </article>
        </TabsContent>
        
        {subSpecs.map((subSpec) => (
          <TabsContent key={subSpec.file} value={subSpec.name.toLowerCase()} className="mt-0">
            <article className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {subSpec.content}
              </ReactMarkdown>
            </article>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
