import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@leanspec/ui-components';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  gradientFrom?: string;
  subtext?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  gradientFrom,
  subtext,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {gradientFrom && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br to-transparent',
            gradientFrom
          )}
        />
      )}
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-3xl font-bold">{value}</div>
        {subtext && (
          <div className="text-xs text-muted-foreground mt-1">
            {subtext}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
