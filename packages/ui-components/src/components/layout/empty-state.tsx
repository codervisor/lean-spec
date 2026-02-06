/**
 * EmptyState component for displaying placeholder content when no data is available
 * Enhanced version that supports both simple action buttons and complex ReactNode actions
 */

import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  /** Optional action button or custom actions */
  action?: EmptyStateAction;
  /** Custom actions as ReactNode (alternative to action) */
  actions?: React.ReactNode;
  /** Visual tone */
  tone?: 'muted' | 'error';
  /** Additional CSS classes */
  className?: string;
  /** Use card wrapper */
  variant?: 'default' | 'card';
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

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actions,
  tone = 'muted',
  className,
  variant = 'default',
}: EmptyStateProps) {
  const safeHref = action?.href && isSafeUrl(action.href) ? action.href : undefined;
  
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center space-y-3',
        variant === 'default' ? 'py-12 px-4' : 'py-10'
      )}
    >
      <div className={cn(
        'flex justify-center',
        variant === 'card' && 'mb-0'
      )}>
        <Button
          size="icon"
          variant={tone === 'error' ? 'destructive' : 'secondary'}
          className="h-10 w-10 rounded-full"
          aria-label={title}
          asChild
        >
          <div>
            <Icon className="h-5 w-5" />
          </div>
        </Button>
      </div>
      <div className="text-lg font-semibold">{title}</div>
      <p className="text-sm text-muted-foreground max-w-xl mx-auto">{description}</p>
      {(action || actions) && (
        <div className="flex justify-center gap-2 flex-wrap pt-1">
          {actions}
          {action && !actions && (
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
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
}
