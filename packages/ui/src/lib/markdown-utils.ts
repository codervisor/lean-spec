import GithubSlugger from 'github-slugger';

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Extract markdown headings while skipping fenced code blocks.
 */
export function extractHeadings(markdown: string): HeadingItem[] {
  if (!markdown) return [];

  const headings: HeadingItem[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  const slugger = new GithubSlugger();

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

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
