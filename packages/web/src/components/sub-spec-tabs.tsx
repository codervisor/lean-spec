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
import { FileText, Palette, Code, TestTube, CheckSquare, Wrench, Map, GitBranch } from 'lucide-react';

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
      <article className="prose max-w-none">
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
          const Icon = ICON_MAP[subSpec.iconName];
          return (
            <TabsTrigger 
              key={subSpec.file} 
              value={subSpec.name.toLowerCase()}
              className="flex items-center gap-2"
            >
              {Icon && <Icon className={cn("h-4 w-4", subSpec.color)} />}
              {subSpec.name}
            </TabsTrigger>
          );
        })}
      </TabsList>
      
      <TabsContent value="readme" className="mt-6">
        <article className="prose max-w-none">
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
          <article className="prose max-w-none">
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
