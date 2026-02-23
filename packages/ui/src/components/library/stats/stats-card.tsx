/**
 * StatsCard component
 * Displays a single stat with icon and optional trend indicator
 */

import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  /** Title of the stat */
  title: string;
  /** Main value to display */
  value: number | string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Icon to display */
  icon?: LucideIcon;
  /** Icon color class */
  iconColorClass?: string;
  /** Background gradient color class */
  gradientClass?: string;
  /** Trend direction */
  trend?: 'up' | 'down' | 'neutral';
  /** Trend percentage or label */
  trendValue?: string;
  /** Additional CSS classes */
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColorClass = 'text-blue-600',
  gradientClass = 'from-blue-500/10',
  trend,
  trendValue,
  className,
}: StatsCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent', gradientClass)} />
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {Icon && <Icon className={cn('h-5 w-5', iconColorClass)} />}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-end gap-2">
          <div className="text-3xl font-bold">{value}</div>
          {trend && trendValue && (
            <div
              className={cn(
                'flex items-center gap-0.5 text-sm font-medium',
                trend === 'up' && 'text-green-600',
                trend === 'down' && 'text-red-600',
                trend === 'neutral' && 'text-muted-foreground'
              )}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
