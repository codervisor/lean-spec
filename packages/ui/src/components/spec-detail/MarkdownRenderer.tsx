import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { Link } from 'react-router-dom';
import { MermaidDiagram } from '../MermaidDiagram';
import { EnhancedCodeBlock } from './EnhancedCodeBlock';
import { EnhancedTable, extractTextFromNode } from './EnhancedTable';
import { isValidElement, type ComponentPropsWithoutRef, type AnchorHTMLAttributes } from 'react';
import type { Components } from 'react-markdown';

/**
 * Check if a URL is external (http/https)
 */
function isExternalUrl(href: string): boolean {
  return /^https?:\/\//.test(href);
}

/**
 * Check if the href is a relative markdown link that should be handled
 * Returns info about the link type and target
 */
function parseRelativeLink(
  href: string,
  specName: string,
  basePath: string
): { type: 'external' | 'subspec' | 'spec' | 'anchor'; url: string } | null {
  // Handle anchor links (start with #)
  if (href.startsWith('#')) {
    return { type: 'anchor', url: href };
  }

  // Handle external URLs
  if (isExternalUrl(href)) {
    return { type: 'external', url: href };
  }

  // Handle same-directory sub-spec links (./DESIGN.md, ./IMPLEMENTATION.md, etc.)
  const sameDirectoryMatch = href.match(/^\.\/([^/]+\.md)$/i);
  if (sameDirectoryMatch) {
    const fileName = sameDirectoryMatch[1];
    return {
      type: 'subspec',
      url: `${basePath}/specs/${specName}?subspec=${encodeURIComponent(fileName)}`,
    };
  }

  // Handle links to other specs (../other-spec/README.md, ../042-feature/, etc.)
  const otherSpecMatch = href.match(/^\.\.\/([^/]+)\/?(?:README\.md)?$/i);
  if (otherSpecMatch) {
    const targetSpec = otherSpecMatch[1];
    return {
      type: 'spec',
      url: `${basePath}/specs/${targetSpec}`,
    };
  }

  // Handle links to other spec's sub-specs (../other-spec/DESIGN.md)
  const otherSpecSubspecMatch = href.match(/^\.\.\/([^/]+)\/([^/]+\.md)$/i);
  if (otherSpecSubspecMatch) {
    const targetSpec = otherSpecSubspecMatch[1];
    const fileName = otherSpecSubspecMatch[2];
    if (fileName.toLowerCase() === 'readme.md') {
      return {
        type: 'spec',
        url: `${basePath}/specs/${targetSpec}`,
      };
    }
    return {
      type: 'subspec',
      url: `${basePath}/specs/${targetSpec}?subspec=${encodeURIComponent(fileName)}`,
    };
  }

  // For any other relative links, return null to use default behavior
  return null;
}

interface MarkdownLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  specName: string;
  basePath: string;
}

function MarkdownLink({ href, children, specName, basePath, ...props }: MarkdownLinkProps) {
  if (!href) {
    return <a {...props}>{children}</a>;
  }

  const parsed = parseRelativeLink(href, specName, basePath);

  if (!parsed) {
    // Unknown link type, render as-is
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  switch (parsed.type) {
    case 'external':
      return (
        <a href={parsed.url} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    case 'anchor':
      return (
        <a href={parsed.url} {...props}>
          {children}
        </a>
      );
    case 'subspec':
    case 'spec':
      return (
        <Link to={parsed.url} {...props}>
          {children}
        </Link>
      );
    default:
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
  }
}

function useMarkdownComponents(specName: string, basePath: string): Components {
  return {
    pre({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
      if (isValidElement(children) && (children.type === 'code' || (children.props as any).className?.includes('language-'))) {
        const childProps = children.props as ComponentPropsWithoutRef<'code'>;
        const className = childProps.className || '';
        const match = /language-(\w+)/.exec(className);
        const language = match ? match[1] : null;

        if (language === 'mermaid') {
          const code = extractTextFromNode(childProps.children);
          return <MermaidDiagram chart={code} className="my-4" />;
        }

        const codeText = extractTextFromNode(childProps.children);

        return (
          <EnhancedCodeBlock language={language} code={codeText}>
            <pre className="!bg-transparent !m-0 !p-0 !shadow-none !border-0">
              <code className={className} {...childProps}>
                {childProps.children}
              </code>
            </pre>
          </EnhancedCodeBlock>
        );
      }

      return <pre {...props}>{children}</pre>;
    },
    table({ children }: ComponentPropsWithoutRef<'table'>) {
      return <EnhancedTable>{children}</EnhancedTable>;
    },
    a({ href, children, ...props }) {
      return (
        <MarkdownLink href={href} specName={specName} basePath={basePath} {...props}>
          {children}
        </MarkdownLink>
      );
    },
  };
}

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
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
