import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from '../MermaidDiagram';
import { useMemo } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import type { Components } from 'react-markdown';
import GithubSlugger from 'github-slugger';

type HeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

function textFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(textFromChildren).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return textFromChildren((children as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
}

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

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const markdownComponents = useMarkdownComponents();

  return (
    <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
