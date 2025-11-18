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

export function TableOfContents({ content }: TableOfContentsProps) {
  const [open, setOpen] = React.useState(false);
  const headings = React.useMemo(() => extractHeadings(content), [content]);

  // If no headings, don't render
  if (headings.length === 0) return null;

  const handleHeadingClick = (id: string) => {
    setOpen(false);
    // Small delay to allow dialog to close before scrolling
    setTimeout(() => {
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
        <nav className="space-y-1">
          {headings.map((heading, index) => (
            <button
              key={`${heading.id}-${index}`}
              onClick={() => handleHeadingClick(heading.id)}
              className={cn(
                'w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors flex items-start gap-2 group',
                heading.level === 2 && 'font-medium',
                heading.level === 3 && 'pl-6',
                heading.level === 4 && 'pl-10',
                heading.level === 5 && 'pl-14',
                heading.level === 6 && 'pl-18'
              )}
            >
              <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="flex-1">{heading.text}</span>
            </button>
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
