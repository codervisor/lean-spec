import { isValidElement, useRef, type ComponentPropsWithoutRef, type AnchorHTMLAttributes } from 'react';
import type { Components } from 'react-markdown';
import { Link } from 'react-router-dom';
import { MermaidDiagram } from '../../mermaid-diagram';
import { EnhancedCodeBlock } from './enhanced-code-block';
import { EnhancedTable } from './enhanced-table';
import { extractTextFromNode } from './utils';

/**
 * Check if a URL is external (http/https)
 */
export function isExternalUrl(href: string): boolean {
  return /^https?:\/\//.test(href);
}

/**
 * Check if the href is a relative markdown link that should be handled
 * Returns info about the link type and target
 */
export function parseRelativeLink(
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

export function MarkdownLink({ href, children, specName, basePath, ...props }: MarkdownLinkProps) {
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

export function Checkbox({
  onChange,
  disabled: _disabled,
  ...props
}: ComponentPropsWithoutRef<'input'> & { onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const isInteractive = !!onChange;
  return (
    <input
      type="checkbox"
      {...props}
      disabled={!isInteractive}
      onChange={onChange}
      className={`appearance-none h-4 w-4 shrink-0 rounded-sm border border-input bg-background checked:bg-primary checked:border-primary relative mr-2 top-[3px] after:content-[''] after:hidden checked:after:block after:absolute after:left-[5px] after:top-[1px] after:w-[4px] after:h-[8px] after:border-r-[2px] after:border-b-[2px] after:border-primary-foreground after:rotate-45 ${isInteractive ? 'cursor-pointer hover:border-primary/70 transition-colors' : 'disabled:cursor-default'}`}
    />
  );
}

export interface ChecklistToggleHandler {
  (itemText: string, checked: boolean): void;
}

export function useMarkdownComponents(
  specName: string = '',
  basePath: string = '',
  onChecklistToggle?: ChecklistToggleHandler
): Components {
  // Use a ref counter to track which checkbox is being rendered
  const checkboxIndexRef = useRef(0);

  // Reset checkbox index on each render cycle
  checkboxIndexRef.current = 0;

  return {
    input(props) {
      if (props.type === 'checkbox') {
        // Extract text from the parent li element to identify this checkbox
        // We pass the onClick through and extract context from the DOM
        const currentIndex = checkboxIndexRef.current++;
        const isChecked = !!props.checked;

        if (onChecklistToggle) {
          return (
            <Checkbox
              {...props}
              data-checkbox-index={currentIndex}
              onChange={(e) => {
                // Walk up to find the <li> parent and extract its text
                const li = e.target.closest('li');
                if (li) {
                  // Extract text content, excluding the checkbox itself
                  const textContent = li.textContent?.trim() || '';
                  onChecklistToggle(textContent, !isChecked);
                }
              }}
            />
          );
        }
        return <Checkbox {...props} />;
      }
      return <input {...props} />;
    },
    pre({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
      if (isValidElement(children) && (children.type === 'code' || (children.props as { className?: string }).className?.includes('language-'))) {
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
