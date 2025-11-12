/**
 * Sub-spec tabs component for spec detail page
 */
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface SubSpec {
  name: string;
  file: string;
  icon: LucideIcon;
  color: string;
  content: string;
}

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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${subSpecs.length + 1}, minmax(0, 1fr))` }}>
        <TabsTrigger value="readme" className="flex items-center gap-2">
          {/* Main README tab */}
          Overview
        </TabsTrigger>
        {subSpecs.map((subSpec) => {
          const Icon = subSpec.icon;
          return (
            <TabsTrigger 
              key={subSpec.file} 
              value={subSpec.name.toLowerCase()}
              className="flex items-center gap-2"
            >
              <Icon className={cn("h-4 w-4", subSpec.color)} />
              {subSpec.name}
            </TabsTrigger>
          );
        })}
      </TabsList>
      
      <TabsContent value="readme" className="mt-6">
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
        <TabsContent key={subSpec.file} value={subSpec.name.toLowerCase()} className="mt-6">
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
  );
}
