import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { useMarkdownComponents } from '../shared/markdown';

interface MarkdownRendererProps {
  content: string;
  specName?: string;
  basePath?: string;
}

export function MarkdownRenderer({ content, specName = '', basePath = '' }: MarkdownRendererProps) {
  const markdownComponents = useMarkdownComponents(specName, basePath);

  return (
    <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
