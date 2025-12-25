import { useMemo, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GithubSlugger from 'github-slugger';
import { BookOpen, CheckSquare, Code, FileText, GitBranch, Map, Palette, TestTube, Wrench } from 'lucide-react';
import { Card, Button, Separator, cn } from '@leanspec/ui-components';
import { MermaidDiagram } from '../MermaidDiagram';

export interface SubSpec {
  name: string;
  file: string;
  iconName?: string;
  color?: string;
  content: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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

function textFromChildren(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(textFromChildren).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    // @ts-expect-error props exists on ReactElement
    return textFromChildren((children as ReactElement).props.children);
  }
  return '';
}

type HeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

function useMarkdownComponents(): Components {
  const slugger = useMemo(() => new GithubSlugger(), []);

  const heading = (Tag: HeadingTag) =>
    ({ children, ...props }: ComponentPropsWithoutRef<HeadingTag>) => {
      const rawText = textFromChildren(children);
      const id = slugger.slug(rawText);
      const HeadingTagComponent = Tag;
      return (
        <HeadingTagComponent id={id} {...props}>
          {children}
        </HeadingTagComponent>
      );
    };

  return {
    h2: heading('h2'),
    h3: heading('h3'),
    h4: heading('h4'),
    h5: heading('h5'),
    h6: heading('h6'),
    code({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) {
      const inline = !className?.includes('language-');
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : null;
      const code = String(children).replace(/\n$/, '');

      if (!inline && language === 'mermaid') {
        return <MermaidDiagram chart={code} className="my-4" />;
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };
}

interface SubSpecTabsProps {
  mainContent: string;
  subSpecs?: SubSpec[];
}

export function SubSpecTabs({ mainContent, subSpecs = [] }: SubSpecTabsProps) {
  const [activeTab, setActiveTab] = useState('readme');
  const markdownComponents = useMarkdownComponents();

  const hasSubSpecs = subSpecs.length > 0;
  const overviewCardVisible = hasSubSpecs && subSpecs.length > 2 && activeTab === 'readme';

  const renderTabButton = (value: string, label: string, Icon?: React.ComponentType<{ className?: string }>, color?: string) => (
    <Button
      key={value}
      onClick={() => setActiveTab(value)}
      variant="ghost"
      className={cn(
        'border-b-2 -mb-px rounded-none gap-2',
        activeTab === value
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {Icon && <Icon className={cn('h-4 w-4', color)} />}
      <span className="truncate">{label}</span>
    </Button>
  );

  return (
    <div className="space-y-4">
      {overviewCardVisible && (
        <Card className="p-4 bg-muted/50 border-l-4 border-l-primary">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">This spec has multiple sections</h4>
              <p className="text-sm text-muted-foreground">
                Use the tabs below to navigate between the main overview and detailed sections.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subSpecs.map((subSpec) => {
                  const Icon = subSpec.iconName ? ICON_MAP[subSpec.iconName] : undefined;
                  return (
                    <Button
                      key={subSpec.file}
                      variant="ghost"
                      onClick={() => setActiveTab(subSpec.name.toLowerCase())}
                      className="justify-start gap-2 h-auto px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {Icon && <Icon className={cn('h-4 w-4', subSpec.color)} />}
                      <span className="text-sm font-medium">{subSpec.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="border-b flex flex-wrap gap-2">
        {renderTabButton('readme', 'Overview', FileText)}
        {subSpecs.map((subSpec) => {
          const value = subSpec.name.toLowerCase();
          const Icon = subSpec.iconName ? ICON_MAP[subSpec.iconName] : undefined;
          return renderTabButton(value, subSpec.name, Icon, subSpec.color);
        })}
      </div>

      {activeTab === 'readme' && (
        <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {mainContent}
          </ReactMarkdown>
        </article>
      )}

      {subSpecs.map((subSpec) => {
        const value = subSpec.name.toLowerCase();
        if (activeTab !== value) return null;
        return (
          <article
            key={subSpec.file}
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {subSpec.content}
            </ReactMarkdown>
          </article>
        );
      })}

      {hasSubSpecs && <Separator className="mt-4" />}
    </div>
  );
}
