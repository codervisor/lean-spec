import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract the first H1 heading from markdown content
 */
export function extractH1Title(markdown: string): string | null {
  if (!markdown) return null;
  
  // Match first H1 heading (# Title)
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
