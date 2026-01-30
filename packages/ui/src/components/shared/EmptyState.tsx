import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, Button } from '@leanspec/ui-components';
import { cn } from '@leanspec/ui-components';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  tone?: 'muted' | 'error';
}

export function EmptyState({ icon: Icon, title, description, actions, className, tone = 'muted' }: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="py-10 text-center space-y-3">
        <div className="flex justify-center">
          <Button
            size="icon"
            variant={tone === 'error' ? 'destructive' : 'secondary'}
            className="h-10 w-10 rounded-full"
            aria-label={title}
          >
            <Icon className="h-5 w-5" />
          </Button>
        </div>
        <div className="text-lg font-semibold">{title}</div>
        {description && <p className="text-sm text-muted-foreground max-w-xl mx-auto">{description}</p>}
        {actions && <div className="flex justify-center gap-2 flex-wrap pt-1">{actions}</div>}
      </CardContent>
    </Card>
  );
}
