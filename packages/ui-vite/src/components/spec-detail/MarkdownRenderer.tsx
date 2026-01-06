import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { MermaidDiagram } from '../MermaidDiagram';
import type { ComponentPropsWithoutRef } from 'react';
import type { Components } from 'react-markdown';

function useMarkdownComponents(): Components {
  return {
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
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
