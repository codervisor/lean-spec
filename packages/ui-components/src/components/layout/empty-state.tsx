/**
 * EmptyState component for displaying placeholder content when no data is available
 */

import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional action button */
  action?: EmptyStateAction;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Validate that a URL is safe (relative or http/https)
 */
function isSafeUrl(url: string): boolean {
  // Allow relative URLs
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('.')) {
    return true;
  }
  // Allow http and https URLs
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  const safeHref = action?.href && isSafeUrl(action.href) ? action.href : undefined;
  
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} {...(safeHref ? { asChild: true } : {})}>
          {safeHref ? (
            <a href={safeHref} rel="noopener noreferrer">
              {action.label}
            </a>
          ) : (
            action.label
          )}
        </Button>
      )}
    </div>
  );
}
