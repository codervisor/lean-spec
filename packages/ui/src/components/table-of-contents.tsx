'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { List, ChevronRight } from 'lucide-react';
import GithubSlugger from 'github-slugger';
import { cn } from '@/lib/utils';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

/**
 * Extract headings from markdown content
 */
function extractHeadings(markdown: string): TOCItem[] {
  if (!markdown) return [];

  const headings: TOCItem[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  const slugger = new GithubSlugger();

  for (const line of lines) {
    // Track code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip lines inside code blocks
    if (inCodeBlock) continue;

    // Match headings (## Heading or ### Heading, skip # H1)
    const match = line.match(/^(#{2,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = slugger.slug(text);

      headings.push({ id, text, level });
    }
  }

  return headings;
}

interface TOCListProps {
  headings: TOCItem[];
  onHeadingClick: (id: string) => void;
}

function TOCList({ headings, onHeadingClick }: TOCListProps) {
  return (
    <nav className="space-y-1">
      {headings.map((heading, index) => (
        <button
          key={`${heading.id}-${index}`}
          onClick={() => onHeadingClick(heading.id)}
          className={cn(
            'w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors flex items-start gap-2 group text-muted-foreground hover:text-foreground',
            heading.level === 2 && 'font-medium text-foreground',
            heading.level === 3 && 'pl-6',
            heading.level === 4 && 'pl-10',
            heading.level === 5 && 'pl-14',
            heading.level === 6 && 'pl-18'
          )}
        >
          <span className="flex-1 truncate">{heading.text}</span>
        </button>
      ))}
    </nav>
  );
}

function scrollToHeading(id: string) {
  const element = document.getElementById(id);
  if (element) {
    // Scroll with offset for sticky header (top navbar + spec header)
    const headerOffset = 180; // Adjust based on your header height
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });

    if (window.history.replaceState) {
      window.history.replaceState(null, '', `#${id}`);
    } else {
      window.location.hash = id;
    }
  }
}

export function TableOfContentsSidebar({ content }: TableOfContentsProps) {
  const headings = React.useMemo(() => extractHeadings(content), [content]);

  if (headings.length === 0) return null;

  return (
    <div className="py-2">
      <h4 className="mb-4 text-sm font-semibold leading-none tracking-tight px-2">On this page</h4>
      <TOCList headings={headings} onHeadingClick={scrollToHeading} />
    </div>
  );
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [open, setOpen] = React.useState(false);
  const headings = React.useMemo(() => extractHeadings(content), [content]);

  // If no headings, don't render
  if (headings.length === 0) return null;

  const handleHeadingClick = (id: string) => {
    setOpen(false);
    // Small delay to allow dialog to close before scrolling
    setTimeout(() => {
      scrollToHeading(id);
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="icon"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 h-12 w-12 rounded-full shadow-lg z-40 hover:scale-110 transition-transform"
        aria-label="Table of contents"
      >
        <List className="h-5 w-5" />
      </Button>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Table of Contents</DialogTitle>
        </DialogHeader>
        <TOCList headings={headings} onHeadingClick={handleHeadingClick} />
      </DialogContent>
    </Dialog>
  );
}
