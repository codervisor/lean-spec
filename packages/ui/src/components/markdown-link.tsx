/**
 * Custom link component for ReactMarkdown that handles internal spec links
 */

import Link from 'next/link';
import { AnchorHTMLAttributes } from 'react';

interface MarkdownLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string;
  children?: React.ReactNode;
  currentSpecNumber?: number;
}

/**
 * Transform internal spec links to proper web app routes
 * Examples:
 * - ../048-spec-complexity-analysis/ -> /specs/48
 * - ../048-spec-complexity-analysis/README.md -> /specs/48
 * - ../048-spec-complexity-analysis/DESIGN.md -> /specs/48?subspec=DESIGN.md
 * - ./DESIGN.md -> current spec with ?subspec=DESIGN.md
 * - #heading -> #heading (anchor links unchanged)
 * - https://... -> https://... (external links unchanged)
 */
function transformSpecLink(href: string, currentSpecNumber?: number): string {
  // Don't transform anchor links or external URLs
  if (href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }

  // Match same-directory sub-spec links: ./FILE.md
  const sameDirectoryPattern = /^\.\/([^/]+\.md)$/;
  const sameDirectoryMatch = href.match(sameDirectoryPattern);
  
  if (sameDirectoryMatch && currentSpecNumber) {
    const subSpecFile = sameDirectoryMatch[1];
    if (subSpecFile !== 'README.md') {
      return `/specs/${currentSpecNumber}?subspec=${subSpecFile}`;
    } else {
      return `/specs/${currentSpecNumber}`;
    }
  }

  // Match internal spec links: ../NNN-spec-name/ or ../NNN-spec-name/FILE.md
  const specLinkPattern = /^\.\.\/(\d+)-[^/]+\/?([^/]+\.md)?$/;
  const match = href.match(specLinkPattern);

  if (match) {
    // Convert to number to remove leading zeros (018 -> 18)
    const specNumber = parseInt(match[1], 10);
    const subSpecFile = match[2];

    if (subSpecFile && subSpecFile !== 'README.md') {
      // Sub-spec link (e.g., DESIGN.md, IMPLEMENTATION.md)
      return `/specs/${specNumber}?subspec=${subSpecFile}`;
    } else {
      // Main spec link (README.md or just the directory)
      return `/specs/${specNumber}`;
    }
  }

  // If no pattern matches, return original href
  return href;
}

export function MarkdownLink({ href, children, currentSpecNumber, ...props }: MarkdownLinkProps) {
  if (!href) {
    return <a {...props}>{children}</a>;
  }

  const transformedHref = transformSpecLink(href, currentSpecNumber);

  // External links or anchor links - use regular <a> tag
  const isExternal = transformedHref.startsWith('http://') || transformedHref.startsWith('https://');
  const isAnchor = transformedHref.startsWith('#');
  
  if (isExternal || isAnchor) {
    return (
      <a 
        href={transformedHref} 
        {...props}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  }

  // Internal spec links - use Next.js Link
  return (
    <Link href={transformedHref} {...props} className="text-primary hover:underline">
      {children}
    </Link>
  );
}
