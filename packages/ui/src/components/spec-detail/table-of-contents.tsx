import { useMemo, useState } from 'react';
import { List } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
} from '@/library';
import { useTranslation } from 'react-i18next';
import GithubSlugger from 'github-slugger';

interface TOCItem {
  id: string;
  text: string;
  level: number;
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

function scrollToHeading(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (window.history.replaceState) {
      window.history.replaceState(null, '', `#${id}`);
    } else {
      window.location.hash = id;
    }
  }
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

interface TableOfContentsProps {
  content: string;
}

export function TableOfContentsSidebar({ content }: TableOfContentsProps) {
  const { t } = useTranslation('common');
  const headings = useMemo(() => extractHeadings(content), [content]);
  if (headings.length === 0) return null;

  return (
    <div className="py-2">
      <h4 className="mb-4 text-sm font-semibold leading-none tracking-tight px-2">
        {t('tableOfContents.onThisPage')}
      </h4>
      <TOCList headings={headings} onHeadingClick={scrollToHeading} />
    </div>
  );
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const headings = useMemo(() => extractHeadings(content), [content]);

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
        aria-label={t('tableOfContents.open')}
      >
        <List className="h-5 w-5" />
      </Button>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('tableOfContents.title')}</DialogTitle>
        </DialogHeader>
        <TOCList headings={headings} onHeadingClick={handleHeadingClick} />
      </DialogContent>
    </Dialog>
  );
}
