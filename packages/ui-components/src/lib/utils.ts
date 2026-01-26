import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts the H1 title from markdown content.
 * @param markdown - The markdown content to parse
 * @returns The H1 title text, or null if no H1 found
 */
export function extractH1Title(markdown: string): string | null {
  if (!markdown) return null;
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
